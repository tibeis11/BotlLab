-- ============================================================================
-- Phase 10.1: Event-Scan-Cluster-Erkennung
-- Neue Tabellen: scan_events, scan_event_members
-- Neues Flag: bottle_scans.geo_source
-- ============================================================================

-- 1. Flag auf bottle_scans: Unterscheidet GPS (H3-snapped) von IP (Vercel)
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS geo_source text DEFAULT 'ip_vercel';
COMMENT ON COLUMN bottle_scans.geo_source IS 'gps_snapped_h3 = echtes GPS (H3 Resolution 8 snapped), ip_vercel = Vercel IP-basiert (zu ungenau für Clustering)';

-- Index für Clustering-Abfrage (nur GPS-Scans)
CREATE INDEX IF NOT EXISTS idx_bottle_scans_geo_source ON bottle_scans(geo_source) WHERE geo_source = 'gps_snapped_h3';

-- 2. Haupttabelle: Erkannte Events
CREATE TABLE IF NOT EXISTS scan_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Zeitfenster
  event_start   timestamptz NOT NULL,
  event_end     timestamptz NOT NULL,

  -- Ort (Schwerpunkt des Clusters)
  center_lat    numeric(10,7) NOT NULL,
  center_lng    numeric(10,7) NOT NULL,
  radius_m      integer,            -- geschätzter Radius in Metern
  city          text,               -- häufigste City aus Scans im Cluster
  country_code  text,

  -- Cluster-Metriken
  total_scans      integer NOT NULL,
  unique_sessions  integer NOT NULL,  -- verschiedene session_hash
  unique_brews     integer NOT NULL,  -- verschiedene brew_id im Cluster
  breweries        uuid[],           -- Array der beteiligten brewery_ids
  brew_ids         uuid[],           -- Array der beteiligten brew_ids

  -- Klassifikation
  event_type    text DEFAULT 'unknown',
  -- 'tasting', 'festival', 'party', 'meetup', 'unknown'
  confidence    numeric(3,2) DEFAULT 0.50,

  -- Brauer-Annotation (Phase 10.6)
  brewer_label  text,               -- Brauer kann Event benennen
  brewer_notes  text                -- Freitext-Notiz
);

-- 3. JOIN-Tabelle: Welche Scans gehören zu welchem Event
CREATE TABLE IF NOT EXISTS scan_event_members (
  event_id  uuid NOT NULL REFERENCES scan_events(id) ON DELETE CASCADE,
  scan_id   uuid NOT NULL REFERENCES bottle_scans(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, scan_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_events_breweries ON scan_events USING GIN(breweries);
CREATE INDEX IF NOT EXISTS idx_scan_events_event_start ON scan_events(event_start DESC);
CREATE INDEX IF NOT EXISTS idx_scan_event_members_scan ON scan_event_members(scan_id);

-- 4. RLS
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brewery_owners_read_their_events" ON scan_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = ANY(scan_events.breweries)
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  );

-- Brewery owners can update their own events (for annotations)
CREATE POLICY "brewery_owners_update_their_events" ON scan_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = ANY(scan_events.breweries)
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = ANY(scan_events.breweries)
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  );

ALTER TABLE scan_event_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brewery_owners_read_event_members" ON scan_event_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scan_events se
      JOIN brewery_members bm ON bm.brewery_id = ANY(se.breweries)
      WHERE se.id = scan_event_members.event_id
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  );

-- Service role can insert (cron job)
CREATE POLICY "service_insert_scan_events" ON scan_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "service_insert_event_members" ON scan_event_members
  FOR INSERT WITH CHECK (true);
