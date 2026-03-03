-- ============================================================================
-- Phase 10.2: PostGIS Clustering für Event-Erkennung
-- Aktiviert PostGIS, fügt geometry-Spalte + Trigger hinzu,
-- erstellt die ST_ClusterDBSCAN basierte Clustering-Funktion
-- ============================================================================

-- 1. PostGIS Extension aktivieren (bereits in Supabase verfügbar)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- search_path erweitern damit geometry-Typen aus extensions-Schema gefunden werden
SET search_path TO public, extensions;

-- 2. Geometry-Spalte auf bottle_scans
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_geom ON bottle_scans USING GIST (geom);

-- 3. Trigger: Setzt geometry automatisch bei Insert/Update
CREATE OR REPLACE FUNCTION update_scan_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scan_geom ON bottle_scans;
CREATE TRIGGER trigger_update_scan_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON bottle_scans
FOR EACH ROW EXECUTE FUNCTION update_scan_geom();

-- 4. Backfill: Setze geom für existierende Scans mit GPS-Koordinaten
UPDATE bottle_scans
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND geom IS NULL;

-- 5. Haupt-Clustering-Funktion (via Cron/API aufrufbar)
-- Parameter:
--   eps_degrees: Distanz in Grad (~0.009 ≈ 1km)
--   min_points: Mindestpunkte pro Cluster (4)
--   min_sessions: Mindest-verschiedene session_hash (3, Anti-Bot)
--   lookback_hours: Zeitfenster in Stunden (default 24)
CREATE OR REPLACE FUNCTION execute_event_clustering(
  eps_degrees double precision DEFAULT 0.009,
  min_points integer DEFAULT 4,
  min_sessions integer DEFAULT 3,
  lookback_hours integer DEFAULT 24
) RETURNS integer AS $$
DECLARE
  new_event_count integer := 0;
  cluster_rec record;
  new_event_id uuid;
BEGIN
  -- Temporäre Tabelle für DBSCAN-Ergebnis
  CREATE TEMP TABLE IF NOT EXISTS _clustering_result (
    scan_id uuid,
    cluster_id integer,
    latitude numeric,
    longitude numeric,
    created_at timestamptz,
    session_hash text,
    brew_id uuid,
    brewery_id uuid,
    city text,
    country_code text
  ) ON COMMIT DROP;

  TRUNCATE _clustering_result;

  -- DBSCAN Clustering:
  -- Nur GPS-snapped Scans (ip_vercel wird radikal gefiltert!)
  -- Nur Scans der letzten lookback_hours Stunden
  -- Keine Scans, die bereits einem Event zugeordnet sind
  INSERT INTO _clustering_result (scan_id, cluster_id, latitude, longitude, created_at, session_hash, brew_id, brewery_id, city, country_code)
  SELECT
    bs.id,
    ST_ClusterDBSCAN(bs.geom, eps := eps_degrees, minpoints := min_points)
      OVER () AS cluster_id,
    bs.latitude,
    bs.longitude,
    bs.created_at,
    bs.session_hash,
    bs.brew_id,
    bs.brewery_id,
    bs.city,
    bs.country_code
  FROM bottle_scans bs
  WHERE bs.geo_source = 'gps_snapped_h3'
    AND bs.geom IS NOT NULL
    AND bs.created_at >= now() - (lookback_hours || ' hours')::interval
    AND NOT EXISTS (
      SELECT 1 FROM scan_event_members sem WHERE sem.scan_id = bs.id
    );

  -- Iteriere über gültige Cluster
  FOR cluster_rec IN
    SELECT
      cr.cluster_id,
      COUNT(*) AS total_scans,
      COUNT(DISTINCT cr.session_hash) AS unique_sessions,
      COUNT(DISTINCT cr.brew_id) AS unique_brews,
      array_agg(DISTINCT cr.brewery_id) FILTER (WHERE cr.brewery_id IS NOT NULL) AS breweries,
      array_agg(DISTINCT cr.brew_id) FILTER (WHERE cr.brew_id IS NOT NULL) AS brew_ids,
      AVG(cr.latitude) AS center_lat,
      AVG(cr.longitude) AS center_lng,
      MIN(cr.created_at) AS event_start,
      MAX(cr.created_at) AS event_end,
      -- Radius in Metern (ungefähr)
      ST_Distance(
        ST_SetSRID(ST_MakePoint(AVG(cr.longitude), AVG(cr.latitude)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(MIN(cr.longitude), MIN(cr.latitude)), 4326)::geography
      )::integer AS radius_m,
      -- Häufigste City
      mode() WITHIN GROUP (ORDER BY cr.city) AS city,
      mode() WITHIN GROUP (ORDER BY cr.country_code) AS country_code
    FROM _clustering_result cr
    WHERE cr.cluster_id IS NOT NULL  -- NULL = Noise (kein Cluster)
    GROUP BY cr.cluster_id
    HAVING COUNT(DISTINCT cr.session_hash) >= min_sessions  -- Anti-Bot: Mindest-verschiedene Sessions
  LOOP
    -- Confidence berechnen: basiert auf Cluster-Größe und Session-Vielfalt
    -- Mehr Sessions+Scans = höherer Confidence
    DECLARE
      conf numeric(3,2);
    BEGIN
      conf := LEAST(
        0.99,
        0.40 + (cluster_rec.unique_sessions::numeric / 20.0) + (cluster_rec.total_scans::numeric / 100.0)
      );

      -- Event einfügen
      INSERT INTO scan_events (
        event_start, event_end,
        center_lat, center_lng, radius_m,
        city, country_code,
        total_scans, unique_sessions, unique_brews,
        breweries, brew_ids,
        event_type, confidence
      ) VALUES (
        cluster_rec.event_start, cluster_rec.event_end,
        cluster_rec.center_lat, cluster_rec.center_lng, cluster_rec.radius_m,
        cluster_rec.city, cluster_rec.country_code,
        cluster_rec.total_scans, cluster_rec.unique_sessions, cluster_rec.unique_brews,
        cluster_rec.breweries, cluster_rec.brew_ids,
        -- Einfache Event-Type Heuristik basierend auf Cluster-Größe
        CASE
          WHEN cluster_rec.total_scans >= 30 THEN 'festival'
          WHEN cluster_rec.unique_brews >= 5 THEN 'tasting'
          WHEN cluster_rec.total_scans >= 15 THEN 'meetup'
          WHEN cluster_rec.total_scans >= 4 THEN 'party'
          ELSE 'unknown'
        END,
        conf
      ) RETURNING id INTO new_event_id;

      -- Scan-Zuordnung (JOIN-Tabelle)
      INSERT INTO scan_event_members (event_id, scan_id)
      SELECT new_event_id, cr.scan_id
      FROM _clustering_result cr
      WHERE cr.cluster_id = cluster_rec.cluster_id;

      -- Optional: scan_intent auf 'event' setzen für zugeordnete Scans
      UPDATE bottle_scans
      SET scan_intent = 'event'
      WHERE id IN (
        SELECT cr.scan_id FROM _clustering_result cr
        WHERE cr.cluster_id = cluster_rec.cluster_id
      )
      AND (scan_intent IS NULL OR scan_intent NOT IN ('confirmed'));

      new_event_count := new_event_count + 1;
    END;
  END LOOP;

  DROP TABLE IF EXISTS _clustering_result;

  RETURN new_event_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
