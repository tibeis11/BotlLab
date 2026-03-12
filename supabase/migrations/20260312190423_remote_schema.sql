drop materialized view if exists "public"."brew_style_flavor_averages";

alter table "public"."profiles" drop column "botlguide_insights_enabled";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_clear_trending_override(brew_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.brews
  SET trending_score_override = NULL
  WHERE id = brew_id;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_get_empty_breweries()
 RETURNS TABLE(id uuid, name text, created_at timestamp with time zone, brew_count bigint, bottle_count bigint, member_names text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name::text,
    b.created_at,
    (SELECT COUNT(*) FROM brews     WHERE brewery_id = b.id)::bigint AS brew_count,
    (SELECT COUNT(*) FROM bottles   WHERE brewery_id = b.id)::bigint AS bottle_count,
    array_agg(p.display_name)::text[] AS member_names
  FROM breweries b
  JOIN brewery_members bm ON bm.brewery_id = b.id
  JOIN profiles p ON p.id = bm.user_id
  GROUP BY b.id, b.name, b.created_at
  HAVING
    (SELECT COUNT(*) FROM brews   WHERE brewery_id = b.id) = 0
    AND (SELECT COUNT(*) FROM bottles WHERE brewery_id = b.id) = 0
  ORDER BY b.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_preview_ratings_backfill()
 RETURNS TABLE(total_unlinked bigint, would_link bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE r.user_id IS NULL)::bigint AS total_unlinked,
    COUNT(*) FILTER (
      WHERE r.user_id IS NULL
        AND (
          SELECT COUNT(*) FROM profiles p2
          WHERE LOWER(p2.display_name) = LOWER(r.author_name)
        ) = 1
    )::bigint AS would_link
  FROM ratings r;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_preview_user_classification()
 RETURNS TABLE(total_users bigint, already_brewer bigint, would_become_brewer bigint, stay_drinker bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_users,
    COUNT(*) FILTER (WHERE p.app_mode = 'brewer')::bigint AS already_brewer,
    COUNT(*) FILTER (
      WHERE p.app_mode = 'drinker'
        AND EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id)
    )::bigint AS would_become_brewer,
    COUNT(*) FILTER (
      WHERE p.app_mode = 'drinker'
        AND NOT EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id)
    )::bigint AS stay_drinker
  FROM profiles p;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_run_ratings_backfill()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE ratings r
  SET user_id = p.id
  FROM profiles p
  WHERE r.user_id IS NULL
    AND LOWER(r.author_name) = LOWER(p.display_name)
    AND (
      SELECT COUNT(*) FROM profiles p2
      WHERE LOWER(p2.display_name) = LOWER(r.author_name)
    ) = 1;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_run_user_classification()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_updated integer := 0;
  step_rows     integer;
BEGIN
  -- Schritt 1: User mit Brewery-Mitgliedschaft UND Brau-Content → brewer
  UPDATE profiles p
  SET app_mode = 'brewer'
  WHERE p.app_mode = 'drinker'
    AND EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id)
    AND (
      EXISTS (SELECT 1 FROM brews b WHERE b.user_id = p.id)
      OR EXISTS (SELECT 1 FROM bottles bt WHERE bt.user_id = p.id)
    );
  GET DIAGNOSTICS step_rows = ROW_COUNT;
  total_updated := total_updated + step_rows;

  -- Schritt 2: User MIT Brewery-Mitgliedschaft (auch ohne Content) → brewer
  -- (Hat sich aktiv für Brauer-Flow entschieden)
  UPDATE profiles p
  SET app_mode = 'brewer'
  WHERE p.app_mode = 'drinker'
    AND EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id);
  GET DIAGNOSTICS step_rows = ROW_COUNT;
  total_updated := total_updated + step_rows;

  RETURN total_updated;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_featured(brew_id uuid, featured boolean)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.brews
  SET is_featured = featured
  WHERE id = brew_id;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_set_trending_score(brew_id uuid, new_score double precision)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.brews
  SET
    trending_score          = new_score,
    trending_score_override = new_score   -- persist pin
  WHERE id = brew_id;
$function$
;

CREATE OR REPLACE FUNCTION public.append_timeline_entry(p_session_id uuid, p_new_entry jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated_timeline JSONB;
BEGIN
  UPDATE "public"."brewing_sessions"
  SET timeline = COALESCE(timeline, '[]'::jsonb) || p_new_entry
  WHERE id = p_session_id
  RETURNING timeline INTO v_updated_timeline;

  RETURN v_updated_timeline;
END;
$function$
;

create materialized view "public"."brew_style_flavor_averages" as  SELECT lower(TRIM(BOTH FROM b.style)) AS style_normalized,
    b.style AS style_display,
    count(DISTINCT b.id) AS brew_count,
    count(fp.id) AS profile_count,
    round((avg(fp.bitterness) * (10)::numeric), 2) AS avg_bitterness,
    round((avg(fp.sweetness) * (10)::numeric), 2) AS avg_sweetness,
    round((avg(fp.body) * (10)::numeric), 2) AS avg_body,
    round((avg(fp.roast) * (10)::numeric), 2) AS avg_roast,
    round((avg(fp.fruitiness) * (10)::numeric), 2) AS avg_fruitiness
   FROM (public.brews b
     JOIN public.flavor_profiles fp ON ((fp.brew_id = b.id)))
  WHERE ((b.is_public = true) AND (b.style IS NOT NULL) AND (TRIM(BOTH FROM b.style) <> ''::text) AND (lower(TRIM(BOTH FROM b.style)) <> 'unbekannt'::text))
  GROUP BY (lower(TRIM(BOTH FROM b.style))), b.style
 HAVING (count(DISTINCT b.id) >= 3);


CREATE OR REPLACE FUNCTION public.calculate_brew_quality_score(brew_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  brew_row          brews%ROWTYPE;
  d                 JSONB;
  score             INTEGER := 0;
  rating_count      INTEGER := 0;
  yeast_count       INTEGER := 0;
  documented_hops   INTEGER := 0;
  documented_malts  INTEGER := 0;
BEGIN
  SELECT * INTO brew_row FROM brews WHERE id = brew_id_param;
  IF NOT FOUND THEN RETURN 0; END IF;

  d := COALESCE(brew_row.data, '{}'::JSONB);

  -- ============================================================
  -- A) Vollständigkeit der Kennzahlen (max 30 Punkte)
  -- ============================================================
  IF d->>'abv' IS NOT NULL AND d->>'abv' <> ''               THEN score := score + 5; END IF;
  IF d->>'ibu' IS NOT NULL AND d->>'ibu' <> ''               THEN score := score + 5; END IF;
  IF d->>'ebc' IS NOT NULL AND d->>'ebc' <> ''               THEN score := score + 5; END IF;
  IF d->>'original_gravity' IS NOT NULL AND d->>'original_gravity' <> '' THEN score := score + 5; END IF;
  IF (d->>'final_gravity'  IS NOT NULL AND d->>'final_gravity'  <> '')
  OR (d->>'target_fg'      IS NOT NULL AND d->>'target_fg'      <> '') THEN score := score + 5; END IF;
  IF (d->>'batch_size' IS NOT NULL AND d->>'batch_size' <> '')
  OR (d->>'volume'     IS NOT NULL AND d->>'volume'     <> '') THEN score := score + 5; END IF;

  -- ============================================================
  -- B) Rezept-Dokumentation (max 30 Punkte)
  -- ============================================================
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 50  THEN score := score + 5; END IF;
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 200 THEN score := score + 5; END IF;
  IF brew_row.style IS NOT NULL AND brew_row.style <> '' AND brew_row.style <> 'Unbekannt' THEN score := score + 5; END IF;
  IF (d->>'brew_notes' IS NOT NULL AND d->>'brew_notes' <> '')
  OR (d->>'notes'      IS NOT NULL AND d->>'notes'      <> '') THEN score := score + 5; END IF;

  SELECT COUNT(*) INTO documented_hops
    FROM jsonb_array_elements(COALESCE(d->'hops', '[]'::JSONB)) h
    WHERE h->>'amount' IS NOT NULL AND h->>'amount' <> ''
      AND h->>'time'   IS NOT NULL AND h->>'time'   <> '';
  IF documented_hops >= 2 THEN score := score + 5; END IF;

  SELECT COUNT(*) INTO yeast_count
    FROM jsonb_array_elements(COALESCE(d->'yeast', '[]'::JSONB)) y
    WHERE y->>'name' IS NOT NULL AND y->>'name' <> '';
  IF yeast_count > 0 THEN score := score + 5; END IF;

  -- ============================================================
  -- C) Zutaten-Vollständigkeit (max 20 Punkte)
  -- ============================================================
  SELECT COUNT(*) INTO documented_malts
    FROM jsonb_array_elements(COALESCE(d->'malts', '[]'::JSONB)) m
    WHERE m->>'amount' IS NOT NULL AND m->>'amount' <> '';
  IF documented_malts >= 2 THEN score := score + 5; END IF;

  SELECT COUNT(*) INTO documented_hops
    FROM jsonb_array_elements(COALESCE(d->'hops', '[]'::JSONB)) h
    WHERE h->>'amount' IS NOT NULL AND h->>'amount' <> '';
  IF documented_hops >= 1 THEN score := score + 5; END IF;

  IF yeast_count > 0 THEN score := score + 5; END IF;

  IF (d->>'water_profile'   IS NOT NULL AND d->>'water_profile'   <> '')
  OR (d->>'water_treatment' IS NOT NULL AND d->>'water_treatment' <> '') THEN score := score + 5; END IF;

  -- ============================================================
  -- D) Community-Signale (max 30 Punkte)
  --
  -- Eigenes Bild           +5
  -- Bewertungen >= 1       +5    (aktiver Aufwand → niedrige Hürde)
  -- Bewertungen >= 3       +5    (additiv)
  -- Likes >= 5             +5    (5er-Hürde verhindert Self-Like)
  -- times_brewed >= 1      +5    (echte Brau-Session verknüpft)
  -- times_brewed >= 3      +5    (additiv — mehrfach gebraut = bewährt)
  -- ============================================================
  IF brew_row.image_url IS NOT NULL
     AND brew_row.image_url <> ''
     AND brew_row.image_url NOT LIKE '%default%' THEN
    score := score + 5;
  END IF;

  SELECT COUNT(*) INTO rating_count FROM ratings WHERE brew_id = brew_id_param;
  IF rating_count >= 1 THEN score := score + 5; END IF;
  IF rating_count >= 3 THEN score := score + 5; END IF;

  IF COALESCE(brew_row.likes_count, 0) >= 5 THEN score := score + 5; END IF;

  -- times_brewed statt copy_count:
  IF COALESCE(brew_row.times_brewed, 0) >= 1 THEN score := score + 5; END IF;
  IF COALESCE(brew_row.times_brewed, 0) >= 3 THEN score := score + 5; END IF;

  -- ============================================================
  -- Normalisierung: max. 110 Punkte → 0–100
  -- ============================================================
  RETURN LEAST(100, ROUND((score::FLOAT / 110.0) * 100)::INTEGER);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_label_on_brewery_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.label_templates (brewery_id, name, format_id, is_default, config)
  VALUES (
    NEW.id,
    'Standard Design (Portrait)',
    '6137',
    true,
    jsonb_build_object(
      'breweryId', NEW.id,
      'formatId', '6137',
      'orientation', 'p',
      'width', 57,
      'height', 105,
      'background', jsonb_build_object('type', 'image', 'value', '/labels/label_105x57.png'),
      'elements', jsonb_build_array(
        -- Element 1: Background Color
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'shape',
          'x', 0, 'y', 0, 'width', 57, 'height', 105,
          'rotation', 0, 'zIndex', 0,
          'content', '',
          'style', jsonb_build_object('backgroundColor', '#ffffff', 'color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'left'),
          'isLocked', false, 'isCanvasLocked', true, 'isDeletable', false, 'isVariable', false, 'name', 'Background Color'
        ),
        -- Element 2: Background Image
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'image',
          'x', 0, 'y', 0, 'width', 57, 'height', 105,
          'rotation', 0, 'zIndex', 1,
          'content', '/labels/label_105x57.png',
          'style', jsonb_build_object('color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'left'),
          'isLocked', false, 'isCanvasLocked', true, 'isDeletable', false, 'isVariable', false, 'name', 'Background Image'
        ),
        -- Element 3: Brand Logo
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'brand-logo',
          'x', 13, 'y', 5, 'width', 30, 'height', 8,
          'rotation', 0, 'zIndex', 2,
          'content', '',
          'style', jsonb_build_object('color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'center'),
          'isLocked', false, 'isCanvasLocked', false, 'isDeletable', true, 'isVariable', true, 'name', 'brand-logo'
        ),
        -- Element 4: QR Code
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'qr-code',
          'x', 11, 'y', 14, 'width', 35, 'height', 35,
          'rotation', 0, 'zIndex', 3,
          'content', '{{qr_code}}',
          'style', jsonb_build_object('color', '#000000', 'fontFamily', 'Helvetica', 'fontSize', 0, 'fontWeight', 'normal', 'textAlign', 'left'),
          'isLocked', false, 'isCanvasLocked', false, 'isDeletable', true, 'isVariable', true, 'name', 'qr-code'
        ),
        -- Element 5: Brand Footer
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'brand-footer',
          'x', 5, 'y', 93, 'width', 47, 'height', 7,
          'rotation', 0, 'zIndex', 4,
          'content', E'BotlLab | Digital Brew Lab\nbotllab.de',
          'style', jsonb_build_object('color', '#666666', 'fontFamily', 'Helvetica', 'fontSize', 6, 'fontWeight', 'bold', 'textAlign', 'center'),
          'isLocked', false, 'isCanvasLocked', false, 'isDeletable', true, 'isVariable', false, 'name', 'brand-footer'
        )
      )
    )
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_own_squad(name_input text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_brewery record;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht eingeloggt';
  END IF;

  INSERT INTO breweries (name)
  VALUES (name_input)
  RETURNING * INTO new_brewery;

  INSERT INTO brewery_members (brewery_id, user_id, role)
  VALUES (new_brewery.id, current_user_id, 'owner');

  RETURN row_to_json(new_brewery);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dispatch_analytics_report_for_brewery(p_brewery_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_site_url  text;
  v_secret    text;
BEGIN
  v_site_url := current_setting('app.site_url',  true);
  v_secret   := current_setting('app.cron_secret', true);

  PERFORM extensions.http_post(
    url     := v_site_url || '/api/reports/dispatch',
    body    := json_build_object('brewery_id', p_brewery_id)::text,
    headers := json_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || coalesce(v_secret, '')
               )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dispatch_pending_analytics_reports()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT s.brewery_id
    FROM   analytics_report_settings s
    WHERE  s.enabled = true
      AND  s.email   IS NOT NULL
      -- weekly: fire on the correct weekday (send_day: 0 = Sunday … 6 = Saturday)
      AND  (
             (s.frequency = 'weekly'  AND EXTRACT(DOW  FROM CURRENT_DATE)::int = s.send_day)
          OR (s.frequency = 'monthly' AND EXTRACT(DAY  FROM CURRENT_DATE)::int = s.send_day)
      )
      -- skip if already sent today (de-duplicate)
      AND  NOT EXISTS (
             SELECT 1
             FROM   analytics_report_logs l
             WHERE  l.brewery_id    = s.brewery_id
               AND  l.status        = 'sent'
               AND  l.period_end::date = CURRENT_DATE
           )
  LOOP
    PERFORM public.dispatch_analytics_report_for_brewery(r.brewery_id);
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_event_clustering(eps_degrees double precision DEFAULT 0.009, min_points integer DEFAULT 4, min_sessions integer DEFAULT 3, lookback_hours integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
 RETURNS TABLE(expired_count integer, expired_user_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_users UUID[];
  row_count INTEGER;
BEGIN
  RAISE NOTICE '[Expiry] Starting subscription expiry check at %', NOW();
  
  -- Find and update expired subscriptions in one atomic operation
  WITH expired AS (
    UPDATE profiles
    SET 
      subscription_status = 'expired',
      subscription_tier = 'free',
      ai_credits_used_this_month = 0
    WHERE 
      subscription_expires_at < NOW()
      AND subscription_status = 'active'
      AND subscription_tier != 'enterprise' -- Protect beta users (lifetime access)
    RETURNING 
      id, 
      subscription_tier AS old_tier
  )
  SELECT array_agg(id) INTO affected_users 
  FROM expired;
  
  -- Get count of affected rows
  row_count := COALESCE(array_length(affected_users, 1), 0);
  
  RAISE NOTICE '[Expiry] Found % expired subscriptions', row_count;
  
  -- Log each expiry to history table
  IF row_count > 0 THEN
    INSERT INTO subscription_history (
      profile_id, 
      subscription_tier, 
      subscription_status, 
      previous_tier, 
      changed_reason,
      metadata
    )
    SELECT 
      p.id,
      'free',
      'expired',
      p.subscription_tier,
      'Automated batch expiry check',
      jsonb_build_object(
        'expired_at', p.subscription_expires_at,
        'batch_processed_at', NOW()
      )
    FROM profiles p
    WHERE p.id = ANY(affected_users);
    
    RAISE NOTICE '[Expiry] Logged % entries to subscription_history', row_count;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT row_count, affected_users;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_posts_search_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.search_vector := to_tsvector('german', coalesce(NEW.content, ''));
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_threads_search_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.search_vector := to_tsvector('german',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '')
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_short_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  chars text[] := '{1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result text := '';
  i integer;
BEGIN
  -- Generate 8 character code
  FOR i IN 1..8 LOOP
    result := result || chars[1+floor(random()*array_length(chars, 1))::int];
  END LOOP;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_auth_user_brewery_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT brewery_id 
    FROM brewery_members 
    WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_brew_taste_profile(p_brew_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bitterness', ROUND(AVG(taste_bitterness), 1),
    'sweetness', ROUND(AVG(taste_sweetness), 1),
    'body', ROUND(AVG(taste_body), 1),
    'carbonation', ROUND(AVG(taste_carbonation), 1),
    'acidity', ROUND(AVG(taste_acidity), 1),
    'count', COUNT(*) 
  )
  INTO result
  FROM "public"."ratings"
  WHERE brew_id = p_brew_id 
    AND moderation_status = 'auto_approved';
    
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_collaborative_recommendations(p_user_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(brew_id uuid, collab_score double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH

  -- 1. Alle positiven Interaktionen des anfragenden Nutzers
  --    Likes UND Ratings ≥4★ zählen als "ich mag diesen Stil"
  my_interactions AS (
    SELECT l.brew_id FROM likes l WHERE l.user_id = p_user_id
    UNION
    SELECT r.brew_id FROM ratings r WHERE r.user_id = p_user_id AND r.rating >= 4
  ),

  -- 2. Ähnliche Nutzer: alle die ≥2 derselben Brews positiv bewertet haben
  --    Basis: Likes + Ratings ≥4★ anderer Nutzer
  similar_users AS (
    SELECT  combined.user_id,
            COUNT(*)::float AS overlap
    FROM (
      SELECT l.user_id, l.brew_id FROM likes l
      UNION ALL
      SELECT r.user_id, r.brew_id FROM ratings r WHERE r.rating >= 4
    ) combined
    WHERE combined.brew_id IN (SELECT brew_id FROM my_interactions)
      AND combined.user_id <> p_user_id
    GROUP BY combined.user_id
    HAVING  COUNT(*) >= 2
    ORDER BY overlap DESC
    LIMIT   50                        -- Top-50 ähnlichste Nutzer reichen
  ),

  -- 3. Kandidaten: Brews die ähnliche Nutzer gemocht, aber ich noch nicht
  candidate_brews AS (
    SELECT  l.brew_id,
            SUM(su.overlap) AS collab_score
    FROM    likes l
    JOIN    similar_users su ON su.user_id = l.user_id
    WHERE   l.brew_id NOT IN (SELECT brew_id FROM my_interactions)
    GROUP BY l.brew_id
  ),

  -- 4. Stil-Diversity-Cap: öffentliche, moderierte Brews; max. 3 pro Stil
  ranked AS (
    SELECT  cb.brew_id,
            cb.collab_score,
            ROW_NUMBER() OVER (
              PARTITION BY b.style
              ORDER BY     cb.collab_score DESC
            ) AS style_rank
    FROM    candidate_brews cb
    JOIN    brews b ON b.id = cb.brew_id
    WHERE   b.is_public = true
      AND   (b.moderation_status IS NULL OR b.moderation_status = 'approved')
  )

  SELECT  r.brew_id,
          r.collab_score
  FROM    ranked r
  WHERE   r.style_rank <= 3           -- max. 3 Brews pro Stil-Kategorie
  ORDER BY r.collab_score DESC
  LIMIT   p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_collaborative_recommendations(p_user_id uuid, p_limit integer DEFAULT 20, p_diversity_cap integer DEFAULT 3)
 RETURNS TABLE(brew_id uuid, collab_score double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH

  -- 1. Alle positiven Interaktionen des anfragenden Nutzers
  my_interactions AS (
    SELECT l.brew_id FROM likes l WHERE l.user_id = p_user_id
    UNION
    SELECT r.brew_id FROM ratings r WHERE r.user_id = p_user_id AND r.rating >= 4
  ),

  -- 2. Ähnliche Nutzer (Likes + Ratings ≥4★, ≥2 gemeinsame Interaktionen)
  similar_users AS (
    SELECT  combined.user_id,
            COUNT(*)::float AS overlap
    FROM (
      SELECT l.user_id, l.brew_id FROM likes l
      UNION ALL
      SELECT r.user_id, r.brew_id FROM ratings r WHERE r.rating >= 4
    ) combined
    WHERE combined.brew_id IN (SELECT brew_id FROM my_interactions)
      AND combined.user_id <> p_user_id
    GROUP BY combined.user_id
    HAVING  COUNT(*) >= 2
    ORDER BY overlap DESC
    LIMIT   50
  ),

  -- 3. Kandidaten: Brews ähnlicher Nutzer die ich noch nicht kenne
  candidate_brews AS (
    SELECT  l.brew_id,
            SUM(su.overlap) AS collab_score
    FROM    likes l
    JOIN    similar_users su ON su.user_id = l.user_id
    WHERE   l.brew_id NOT IN (SELECT brew_id FROM my_interactions)
    GROUP BY l.brew_id
  ),

  -- 4. Stil-Diversity-Cap: dynamisch via p_diversity_cap
  ranked AS (
    SELECT  cb.brew_id,
            cb.collab_score,
            ROW_NUMBER() OVER (
              PARTITION BY b.style
              ORDER BY     cb.collab_score DESC
            ) AS style_rank
    FROM    candidate_brews cb
    JOIN    brews b ON b.id = cb.brew_id
    WHERE   b.is_public = true
      AND   (b.moderation_status IS NULL OR b.moderation_status = 'approved')
  )

  SELECT  r.brew_id,
          r.collab_score
  FROM    ranked r
  WHERE   r.style_rank <= p_diversity_cap
  ORDER BY r.collab_score DESC
  LIMIT   p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_featured_brews_public()
 RETURNS TABLE(id uuid, name text, style text, image_url text, quality_score integer, trending_score double precision, likes_count integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    b.id,
    b.name,
    b.style,
    b.image_url,
    b.quality_score,
    b.trending_score,
    b.likes_count,
    b.created_at
  FROM public.brews b
  WHERE b.is_public = true
    AND b.is_featured = true
    AND b.moderation_status = 'approved'
  ORDER BY b.created_at DESC
  LIMIT 12;
$function$
;

CREATE OR REPLACE FUNCTION public.get_low_quality_brews(threshold integer DEFAULT 40)
 RETURNS TABLE(id uuid, name text, style text, quality_score integer, trending_score double precision, is_featured boolean, image_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    b.id,
    b.name,
    b.style,
    b.quality_score,
    b.trending_score,
    b.is_featured,
    b.image_url,
    b.created_at
  FROM public.brews b
  WHERE b.is_public = true
    AND b.quality_score < threshold
  ORDER BY b.quality_score ASC, b.created_at DESC
  LIMIT 100;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_brewery_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT brewery_id FROM brewery_members WHERE user_id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.get_quality_score_distribution()
 RETURNS TABLE(bucket text, bucket_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN quality_score < 20  THEN '0–19'
      WHEN quality_score < 40  THEN '20–39'
      WHEN quality_score < 60  THEN '40–59'
      WHEN quality_score < 80  THEN '60–79'
      ELSE                          '80–100'
    END AS bucket,
    COUNT(*) AS bucket_count
  FROM public.brews
  WHERE is_public = true
  GROUP BY bucket
  ORDER BY MIN(quality_score);
$function$
;

CREATE OR REPLACE FUNCTION public.get_trending_brews(limit_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, style text, image_url text, created_at timestamp with time zone, user_id uuid, brew_type text, mash_method text, fermentation_type text, copy_count integer, times_brewed integer, view_count integer, trending_score double precision, quality_score integer, likes_count integer, moderation_status text, remix_parent_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    b.id, b.name, b.style, b.image_url, b.created_at, b.user_id,
    b.brew_type, b.mash_method, b.fermentation_type,
    b.copy_count, b.times_brewed, b.view_count,
    b.trending_score, b.quality_score, b.likes_count,
    b.moderation_status, b.remix_parent_id
  FROM brews b
  WHERE b.is_public = true
  ORDER BY b.trending_score DESC NULLS LAST
  LIMIT limit_count;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_brew_image_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Default: don't flag for review unless we find a reason
  should_flag boolean := false;
  
  -- Patterns that arc considered safe (auto-approved)
  is_safe_image boolean;
  is_safe_cap boolean;
BEGIN
  -- Helper checks
  is_safe_image := (
      NEW.image_url LIKE '%/default_label/%' OR 
      NEW.image_url LIKE '%/brand/%' OR 
      NEW.image_url LIKE '%/ai-brew-%'
  );
  
  is_safe_cap := (
      NEW.cap_url LIKE '%/default_label/%' OR 
      NEW.cap_url LIKE '%/brand/%' OR 
      NEW.cap_url LIKE '%/ai-cap-%'
  );

  ---------------------------------------------------------------------------
  -- 1. UPDATE LOGIC
  ---------------------------------------------------------------------------
  IF (TG_OP = 'UPDATE') THEN
      
      -- CHECK IMAGE CHANGE
      IF (OLD.image_url IS DISTINCT FROM NEW.image_url AND NEW.image_url IS NOT NULL) THEN
          -- If the new image is NOT safe, we must review it
          IF (NOT is_safe_image) THEN
              should_flag := true;
          END IF;
      END IF;

      -- CHECK CAP CHANGE
      -- Changes to cap colors (hex strings) are ignored.
      IF (OLD.cap_url IS DISTINCT FROM NEW.cap_url AND NEW.cap_url IS NOT NULL AND NOT (NEW.cap_url LIKE '#%')) THEN
          -- If the new cap is NOT safe, we must review it
          IF (NOT is_safe_cap) THEN
              should_flag := true;
          END IF;
      END IF;

      -- SPECIAL CASE: REJECTED ITEMS
      -- If item was previously REJECTED, and we just updated it (even if we didn't change the image, but maybe description),
      -- we usually keep it rejected unless the user fixed the problematic image.
      -- However, this trigger only cares about image changes.
      -- If we changed the image to something SAFE, we should probably un-reject it.
      
      IF (OLD.moderation_status = 'rejected') THEN
          -- If we changed image to safe, or didn't change image but it WAS safe (unlikely to be rejected then),
          -- we might want to auto-approve.
          -- Let's stick to simple logic: If we are modifying a rejected item,
          -- and the resulting state has ONLY safe images, we can approve it.
          -- But the trigger fires on specific column changes.
          
          -- Simplified: If we changed the image and it is now safe, we want to clear the rejected status.
          -- If we didn't flag it above, it means it's either safe or unchanged.
          NULL; 
      END IF;

  ---------------------------------------------------------------------------
  -- 2. INSERT LOGIC
  ---------------------------------------------------------------------------
  ELSIF (TG_OP = 'INSERT') THEN
      -- On Insert, if there is content that is an actual image (not a hex color/safe), it needs review
      IF (NEW.image_url IS NOT NULL AND NOT is_safe_image) THEN
          should_flag := true;
      END IF;

      IF (NEW.cap_url IS NOT NULL AND NOT (NEW.cap_url LIKE '#%') AND NOT is_safe_cap) THEN
          should_flag := true;
      END IF;
  END IF;

  ---------------------------------------------------------------------------
  -- 3. APPLY STATUS
  ---------------------------------------------------------------------------
  
  IF (should_flag) THEN
      NEW.moderation_status := 'pending';
      NEW.moderated_at := NULL;
      NEW.moderated_by := NULL;
      NEW.moderation_rejection_reason := NULL;
  ELSE
      -- If we didn't flag it, it means the new content is either SAFE or UNCHANGED.
      -- If it is SAFE (and we are updating), we should ensure it's not stuck in 'rejected' or 'pending'.
      
      -- Check if current state (NEW) is fully safe
      -- (image is null or safe) AND (cap is null or hex or safe)
      IF (
          (NEW.image_url IS NULL OR is_safe_image) AND 
          (NEW.cap_url IS NULL OR NEW.cap_url LIKE '#%' OR is_safe_cap)
      ) THEN
          -- Auto-approve safe content if it was pending or rejected
          IF (TG_OP = 'INSERT' OR OLD.moderation_status IN ('pending', 'rejected')) THEN
              NEW.moderation_status := 'approved';
              NEW.moderated_at := NOW();
              NEW.moderated_by := NULL;
              NEW.moderation_rejection_reason := NULL;
          END IF;
      END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_brewery_logo_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- If logo_url changes, reset status to pending
  IF (OLD.logo_url IS DISTINCT FROM NEW.logo_url) THEN
    NEW.moderation_status := 'pending';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.moderation_rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE brews
        SET likes_count = likes_count + 1
        WHERE id = NEW.brew_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE brews
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.brew_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_like_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    brew_owner_id uuid;
    brew_name text;
BEGIN
    -- 1. Get the owner of the brew
    SELECT user_id, name INTO brew_owner_id, brew_name
    FROM public.brews
    WHERE id = NEW.brew_id;

    -- 2. Determine if we should notify
    -- Constraint: Do NOT notify if user likes their own brew
    -- Fix: Also check if brew_owner_id IS NOT NULL
    IF brew_owner_id IS NOT NULL AND brew_owner_id IS DISTINCT FROM NEW.user_id THEN
        
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            type,
            data
        ) VALUES (
            brew_owner_id,
            NEW.user_id,
            'brew_like',
            jsonb_build_object(
                'brew_id', NEW.brew_id,
                'brew_name', brew_name
            )
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    birthdate,
    app_mode,
    -- Premium fields:
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date,
    -- app_mode: explizit wenn im Signup-Form gesetzt (z.B. 'brewer' bei B2B-Startseite),
    -- sonst 'drinker' als sicherer Default (Consumer-Pfad)
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'app_mode' IN ('drinker', 'brewer')
        THEN NEW.raw_user_meta_data->>'app_mode'
        ELSE NULL
      END,
      'drinker'
    ),
    -- Premium defaults:
    'free',
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_bottle_fills()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.brew_id IS NOT NULL AND (OLD.brew_id IS NULL OR OLD.brew_id != NEW.brew_id) THEN
    UPDATE profiles 
    SET total_bottle_fills = total_bottle_fills + 1 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_bottle_fills_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.brew_id IS NOT NULL THEN
    UPDATE profiles 
    SET total_bottle_fills = total_bottle_fills + 1 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_bottle_scan_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Increment the bottles.scan_count
  UPDATE bottles
  SET scan_count = scan_count + 1
  WHERE id = NEW.bottle_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_brew_copy_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.remix_parent_id IS NOT NULL THEN
        UPDATE brews
        SET copy_count = copy_count + 1
        WHERE id = NEW.remix_parent_id;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_daily_stats(p_date date, p_brewery_id uuid, p_brew_id uuid, p_country_code text, p_device_type text, p_hour integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO analytics_daily_stats (
    date, 
    brewery_id, 
    brew_id, 
    country_code, 
    device_type, 
    total_scans, 
    unique_visitors,
    hour_distribution
  )
  VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    1,
    CASE 
      WHEN p_hour IS NOT NULL THEN jsonb_build_object(p_hour::TEXT, 1)
      ELSE NULL
    END
  )
  ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
  DO UPDATE SET
    total_scans = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors + 1,
    hour_distribution = CASE
      WHEN p_hour IS NOT NULL THEN
        CASE
          WHEN analytics_daily_stats.hour_distribution IS NULL THEN
            jsonb_build_object(p_hour::TEXT, 1)
          ELSE
            jsonb_set(
              analytics_daily_stats.hour_distribution,
              ARRAY[p_hour::TEXT],
              to_jsonb(COALESCE((analytics_daily_stats.hour_distribution->>p_hour::TEXT)::INTEGER, 0) + 1)
            )
        END
      ELSE analytics_daily_stats.hour_distribution
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_daily_stats(p_date date, p_brewery_id uuid, p_brew_id uuid, p_country_code text, p_device_type text, p_hour integer DEFAULT NULL::integer, p_is_new_visitor boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO analytics_daily_stats (
    date, 
    brewery_id, 
    brew_id, 
    country_code, 
    device_type, 
    total_scans, 
    unique_visitors,
    hour_distribution
  )
  VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    CASE WHEN p_is_new_visitor THEN 1 ELSE 0 END,
    CASE 
      WHEN p_hour IS NOT NULL THEN jsonb_build_object(p_hour::TEXT, 1)
      ELSE NULL
    END
  )
  ON CONFLICT (date, brewery_id, COALESCE(brew_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(country_code, ''), COALESCE(device_type, ''))
  DO UPDATE SET
    total_scans = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors + (CASE WHEN p_is_new_visitor THEN 1 ELSE 0 END),
    hour_distribution = CASE
      WHEN p_hour IS NOT NULL THEN
        CASE
          WHEN analytics_daily_stats.hour_distribution IS NULL THEN
            jsonb_build_object(p_hour::TEXT, 1)
          ELSE
            jsonb_set(
              analytics_daily_stats.hour_distribution,
              ARRAY[p_hour::TEXT],
              to_jsonb(COALESCE((analytics_daily_stats.hour_distribution->>p_hour::TEXT)::INTEGER, 0) + 1)
            )
        END
      ELSE analytics_daily_stats.hour_distribution
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_daily_stats(p_date date, p_brewery_id uuid, p_brew_id uuid, p_country_code text, p_device_type text, p_hour integer DEFAULT NULL::integer, p_is_new_visitor boolean DEFAULT true, p_is_logged_in boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.analytics_daily_stats (
    date,
    brewery_id,
    brew_id,
    country_code,
    device_type,
    total_scans,
    unique_visitors,
    logged_in_scans,
    hour_distribution
  )
  VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    CASE WHEN p_is_new_visitor   THEN 1 ELSE 0 END,
    CASE WHEN p_is_logged_in     THEN 1 ELSE 0 END,
    CASE
      WHEN p_hour IS NOT NULL THEN jsonb_build_object(p_hour::TEXT, 1)
      ELSE NULL
    END
  )
  ON CONFLICT (
    date,
    brewery_id,
    COALESCE(brew_id,      '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(country_code, ''),
    COALESCE(device_type,  '')
  )
  DO UPDATE SET
    total_scans     = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors
                      + CASE WHEN p_is_new_visitor THEN 1 ELSE 0 END,
    logged_in_scans = analytics_daily_stats.logged_in_scans
                      + CASE WHEN p_is_logged_in   THEN 1 ELSE 0 END,
    hour_distribution = CASE
      WHEN p_hour IS NOT NULL THEN
        CASE
          WHEN analytics_daily_stats.hour_distribution IS NULL THEN
            jsonb_build_object(p_hour::TEXT, 1)
          ELSE
            jsonb_set(
              analytics_daily_stats.hour_distribution,
              ARRAY[p_hour::TEXT],
              to_jsonb(
                COALESCE(
                  (analytics_daily_stats.hour_distribution ->> p_hour::TEXT)::INTEGER,
                  0
                ) + 1
              )
            )
        END
      ELSE analytics_daily_stats.hour_distribution
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_daily_stats(p_date date, p_brewery_id uuid, p_brew_id uuid, p_country_code text, p_device_type text, p_is_unique boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO analytics_daily_stats (
    date,
    brewery_id,
    brew_id,
    country_code,
    device_type,
    total_scans,
    unique_visitors
  ) VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    CASE WHEN p_is_unique THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
  DO UPDATE SET
    total_scans = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors + 
      CASE WHEN p_is_unique THEN 1 ELSE 0 END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_forum_view_count(thread_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE forum_threads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = thread_id;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_profile_views(p_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET total_profile_views = COALESCE(total_profile_views, 0) + 1
  WHERE id = p_profile_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_member_of(_brewery_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Direct low-level query, no RLS triggered here
  RETURN EXISTS (
    SELECT 1 
    FROM brewery_members 
    WHERE brewery_id = _brewery_id 
    AND user_id = auth.uid()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_brew_page_view(p_brew_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Seitenaufruf zählen (auch für anonyme Besucher)
  UPDATE public.brews
    SET view_count = view_count + 1
    WHERE id = p_brew_id AND is_public = true;

  -- Personalisierungssignal nur für eingeloggte Nutzer
  -- Dedup erfolgt clientseitig (sessionStorage) — kein UNIQUE-Constraint nötig
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.brew_views (user_id, brew_id, dwell_seconds, source)
    VALUES (p_user_id, p_brew_id, NULL, 'direct');
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.redeem_enterprise_code(input_code text, input_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_code RECORD;
    result JSONB;
BEGIN
    -- 1. Look for code
    SELECT * INTO target_code 
    FROM public.enterprise_codes 
    WHERE code = input_code AND is_active = true 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger oder inaktiver Code.');
    END IF;

    -- 2. Check Expiry
    IF target_code.expires_at IS NOT NULL AND target_code.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dieser Code ist bereits abgelaufen.');
    END IF;

    -- 3. Check Uses
    IF target_code.current_uses >= target_code.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dieser Code wurde bereits maximal oft verwendet.');
    END IF;

    -- 4. Apply to Profile
    UPDATE public.profiles 
    SET subscription_tier = 'enterprise',
        subscription_status = 'active',
        subscription_expires_at = NULL -- Enterprise via code is usually lifetime/permanent for now
    WHERE id = input_user_id;

    -- 5. Track Usage
    UPDATE public.enterprise_codes 
    SET current_uses = current_uses + 1 
    WHERE id = target_code.id;

    RETURN jsonb_build_object('success', true, 'message', 'Willkommen im Enterprise Plan! ✨');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_brew_style_averages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY brew_style_averages;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_trending_scores()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE brews
  SET trending_score = CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0 THEN
      (COALESCE(likes_count, 0) + 3.0 * COALESCE(times_brewed, 0))::float
      / POWER(
          EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2,
          1.5
        )
    ELSE 0
  END
  WHERE is_public = true
    AND trending_score_override IS NULL;  -- Admin-Pins nicht überschreiben
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_default_equipment_profile(p_profile_id uuid, p_brewery_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verifiziere Berechtigung
  IF NOT EXISTS (
    SELECT 1 FROM brewery_members m
    WHERE m.brewery_id = p_brewery_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  -- Alle anderen auf false
  UPDATE equipment_profiles
  SET    is_default = false
  WHERE  brewery_id = p_brewery_id
    AND  id <> p_profile_id;

  -- Dieses auf true
  UPDATE equipment_profiles
  SET    is_default = true
  WHERE  id = p_profile_id
    AND  brewery_id = p_brewery_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_short_code_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only generate if not provided
  IF NEW.short_code IS NULL THEN
    -- Retry loop for collision handling
    LOOP
      NEW.short_code := generate_short_code();
      -- Check for collision
      IF NOT EXISTS (SELECT 1 FROM "public"."bottles" WHERE "short_code" = NEW.short_code) THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_brew_abv_ibu()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sync abv from data JSON
  IF NEW.data IS NOT NULL THEN
    NEW.abv := CASE
                 WHEN (NEW.data->>'abv') ~ '^\d+(\.\d+)?$'
                 THEN ROUND((NEW.data->>'abv')::NUMERIC, 2)
                 ELSE NULL
               END;
    NEW.ibu := CASE
                 WHEN (NEW.data->>'ibu') ~ '^\d+$'
                 THEN (NEW.data->>'ibu')::INTEGER
                 ELSE NULL
               END;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_mash_steps_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.brew_type = 'beer' THEN
        NEW.mash_steps_count := COALESCE(
            CASE
                WHEN NEW.data->'mash_steps' IS NOT NULL
                  AND jsonb_array_length(NEW.data->'mash_steps') > 0
                    THEN jsonb_array_length(NEW.data->'mash_steps')
                ELSE 1
            END,
            1
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_fn_refresh_quality_score_on_brew()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE brews
    SET quality_score = public.calculate_brew_quality_score(NEW.id)
    WHERE id = NEW.id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_fn_refresh_quality_score_on_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_brew_id UUID;
BEGIN
  target_brew_id := COALESCE(NEW.brew_id, OLD.brew_id);
  IF target_brew_id IS NOT NULL THEN
    UPDATE brews
      SET quality_score = public.calculate_brew_quality_score(target_brew_id)
      WHERE id = target_brew_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_fn_refresh_quality_score_on_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE brews
    SET quality_score = public.calculate_brew_quality_score(NEW.brew_id)
    WHERE id = NEW.brew_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_fn_times_brewed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.brew_id IS NOT NULL THEN
      UPDATE public.brews
        SET times_brewed = times_brewed + 1
        WHERE id = NEW.brew_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.brew_id IS NOT NULL THEN
      UPDATE public.brews
        SET times_brewed = GREATEST(0, times_brewed - 1)
        WHERE id = OLD.brew_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- brew_id wurde geändert: alten Zähler dekrementieren, neuen inkrementieren
    IF OLD.brew_id IS DISTINCT FROM NEW.brew_id THEN
      IF OLD.brew_id IS NOT NULL THEN
        UPDATE public.brews
          SET times_brewed = GREATEST(0, times_brewed - 1)
          WHERE id = OLD.brew_id;
      END IF;
      IF NEW.brew_id IS NOT NULL THEN
        UPDATE public.brews
          SET times_brewed = times_brewed + 1
          WHERE id = NEW.brew_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_active_brewery(brewery_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.profiles
  set active_brewery_id = update_active_brewery.brewery_id
  where id = auth.uid();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_analytics_report_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_brew_trending_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_brew_id UUID;
BEGIN
  target_brew_id := COALESCE(NEW.brew_id, OLD.brew_id);

  UPDATE brews
  SET trending_score =
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0 THEN
        (COALESCE(likes_count, 0) + 3.0 * COALESCE(times_brewed, 0))::float
        / POWER(
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2,
            1.5
          )
      ELSE 0
    END
  WHERE id = target_brew_id
    AND trending_score_override IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_equipment_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_scan_geom()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_thread_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.forum_threads
        SET last_reply_at = NEW.created_at,
            reply_count = reply_count + 1
        WHERE id = NEW.thread_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.forum_threads
        SET reply_count = reply_count - 1
        WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_liked(brew_row public.brews)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 
    from public.likes 
    where brew_id = brew_row.id
    and user_id = auth.uid()
  );
$function$
;


