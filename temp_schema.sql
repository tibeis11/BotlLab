


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE SCHEMA IF NOT EXISTS "private_system";


ALTER SCHEMA "private_system" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."report_reason" AS ENUM (
    'spam',
    'nsfw',
    'harassment',
    'copyright',
    'other'
);


ALTER TYPE "public"."report_reason" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'open',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."report_target_type" AS ENUM (
    'brew',
    'user',
    'brewery',
    'forum_post',
    'comment',
    'forum_thread'
);


ALTER TYPE "public"."report_target_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_clear_trending_override"("brew_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.brews
  SET trending_score_override = NULL
  WHERE id = brew_id;
$$;


ALTER FUNCTION "public"."admin_clear_trending_override"("brew_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_empty_breweries"() RETURNS TABLE("id" "uuid", "name" "text", "created_at" timestamp with time zone, "brew_count" bigint, "bottle_count" bigint, "member_names" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_get_empty_breweries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_preview_ratings_backfill"() RETURNS TABLE("total_unlinked" bigint, "would_link" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_preview_ratings_backfill"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_preview_user_classification"() RETURNS TABLE("total_users" bigint, "already_brewer" bigint, "would_become_brewer" bigint, "stay_drinker" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_preview_user_classification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_run_ratings_backfill"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_run_ratings_backfill"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_run_user_classification"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_run_user_classification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_featured"("brew_id" "uuid", "featured" boolean) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.brews
  SET is_featured = featured
  WHERE id = brew_id;
$$;


ALTER FUNCTION "public"."admin_set_featured"("brew_id" "uuid", "featured" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_trending_score"("brew_id" "uuid", "new_score" double precision) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.brews
  SET
    trending_score          = new_score,
    trending_score_override = new_score   -- persist pin
  WHERE id = brew_id;
$$;


ALTER FUNCTION "public"."admin_set_trending_score"("brew_id" "uuid", "new_score" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aggregate_cis_brew_context"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE brews b
  SET
    typical_scan_hour = (
      SELECT MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM s.local_time)::integer)
      FROM   bottle_scans s
      WHERE  s.brew_id          = b.id
        AND  s.local_time       IS NOT NULL
        AND  (s.converted_to_rating = TRUE OR s.confirmed_drinking = TRUE OR s.drinking_probability >= 50)
        AND  s.created_at       > NOW() - INTERVAL '90 days'
    ),
    typical_temperature = (
      SELECT ROUND(AVG(s.weather_temp_c))::integer
      FROM   bottle_scans s
      WHERE  s.brew_id           = b.id
        AND  s.weather_temp_c    IS NOT NULL
        AND  (s.converted_to_rating = TRUE OR s.confirmed_drinking = TRUE OR s.drinking_probability >= 50)
        AND  s.created_at        > NOW() - INTERVAL '90 days'
    );
END;
$$;


ALTER FUNCTION "public"."aggregate_cis_brew_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated_timeline JSONB;
BEGIN
  UPDATE "public"."brewing_sessions"
  SET timeline = COALESCE(timeline, '[]'::jsonb) || p_new_entry
  WHERE id = p_session_id
  RETURNING timeline INTO v_updated_timeline;

  RETURN v_updated_timeline;
END;
$$;


ALTER FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_brew_quality_score"("brew_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_brew_quality_score"("brew_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") RETURNS "record"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
  v_used INTEGER;
  v_limit INTEGER;
  v_reset_date TIMESTAMPTZ;
BEGIN
  -- Lock row for update to prevent race condition
  SELECT subscription_tier, subscription_status, ai_credits_used_this_month, ai_credits_reset_at
  INTO v_tier, v_status, v_used, v_reset_date
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;

  -- Default to 'free' if tier is null
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Check if monthly reset is needed
  IF NOW() >= v_reset_date THEN
    UPDATE profiles
    SET ai_credits_used_this_month = 0,
        ai_credits_reset_at = date_trunc('month', NOW() + interval '1 month')
    WHERE id = user_id;
    v_used := 0;
  END IF;

  -- Get tier limit
  -- Free users receive 5 teaser credits/month so they can try AI without buying first.
  v_limit := CASE v_tier
    WHEN 'free' THEN 5
    WHEN 'brewer' THEN 50
    WHEN 'brewery' THEN 200
    WHEN 'enterprise' THEN -1  -- unlimited
    ELSE 5  -- safe fallback: unknown tiers treated like free
  END;

  -- Check limit
  IF v_limit != -1 AND v_used >= v_limit THEN
    can_use := FALSE;
    reason := 'Monthly AI limit reached';
    RETURN;
  END IF;

  -- Check subscription status for paid tiers
  -- Free tier skipped intentionally – no active subscription required for teaser credits.
  IF v_tier != 'free' AND v_status != 'active' AND v_status != 'trial' THEN
    can_use := FALSE;
    reason := 'Subscription inactive';
    RETURN;
  END IF;

  -- Increment usage counter
  UPDATE profiles
  SET ai_credits_used_this_month = ai_credits_used_this_month + 1
  WHERE id = user_id;

  can_use := TRUE;
  reason := 'OK';
END;
$$;


ALTER FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_anonymous_session"("p_session_token" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_event RECORD;
  v_new_iq INT;
  v_points INT;
BEGIN
  -- A: Event atomar claimen via session_token
  UPDATE public.tasting_score_events
  SET user_id = p_user_id
  WHERE session_token = p_session_token
    AND user_id IS NULL
  RETURNING * INTO v_event;

  -- Kein Event gefunden oder bereits geclaimed
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_claimed');
  END IF;

  -- B: flavor_profiles.user_id patchen (über metadata → flavor_profile_id)
  IF v_event.metadata IS NOT NULL AND v_event.metadata->>'flavor_profile_id' IS NOT NULL THEN
    UPDATE public.flavor_profiles
    SET user_id = p_user_id
    WHERE id = (v_event.metadata->>'flavor_profile_id')::UUID
      AND user_id IS NULL;
  END IF;

  -- C: Punkte berechnen + auf Event setzen
  IF v_event.event_type = 'beat_the_brewer' THEN
    v_points := GREATEST(0, LEAST(10, ROUND(COALESCE(v_event.match_score, 0) * 10)));
  ELSE
    v_points := 3; -- VibeCheck fixed points
  END IF;

  -- points_delta war 0, jetzt die echten Punkte setzen
  UPDATE public.tasting_score_events
  SET points_delta = v_points
  WHERE id = v_event.id;

  -- D: Tasting IQ atomar erhöhen
  SELECT public.increment_tasting_iq(p_user_id, v_points) INTO v_new_iq;

  RETURN jsonb_build_object(
    'success', true,
    'event_type', v_event.event_type,
    'brew_id', v_event.brew_id,
    'points_awarded', v_points,
    'new_tasting_iq', v_new_iq
  );
END;
$$;


ALTER FUNCTION "public"."claim_anonymous_session"("p_session_token" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_label_on_brewery_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_default_label_on_brewery_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_own_squad"("name_input" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_own_squad"("name_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dispatch_analytics_report_for_brewery"("p_brewery_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."dispatch_analytics_report_for_brewery"("p_brewery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dispatch_pending_analytics_reports"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."dispatch_pending_analytics_reports"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_event_clustering"("eps_degrees" double precision DEFAULT 0.009, "min_points" integer DEFAULT 4, "min_sessions" integer DEFAULT 3, "lookback_hours" integer DEFAULT 24) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."execute_event_clustering"("eps_degrees" double precision, "min_points" integer, "min_sessions" integer, "lookback_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_subscriptions"() RETURNS TABLE("expired_count" integer, "expired_user_ids" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."expire_subscriptions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."expire_subscriptions"() IS 'Daily cron job to expire subscriptions past their end date. 
   Returns count and array of affected user IDs.
   Excludes enterprise tier users (lifetime beta access).
   Logs all changes to subscription_history table.';



CREATE OR REPLACE FUNCTION "public"."forum_posts_search_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('german', coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."forum_posts_search_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."forum_threads_search_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('german',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '')
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."forum_threads_search_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_short_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_short_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_brewery_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT brewery_id 
    FROM brewery_members 
    WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_brewery_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_botlguide_usage_stats"("p_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result   JSONB;
  cutoff   TIMESTAMPTZ := now() - (p_days || ' days')::interval;
BEGIN
  SELECT jsonb_build_object(
    'totalCalls',
      (SELECT count(*) FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'totalCredits',
      (SELECT COALESCE(sum(credits_used), 0)
         FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'uniqueUsers',
      (SELECT count(DISTINCT user_id)
         FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'avgResponseMs',
      (SELECT COALESCE(round(avg(response_time_ms)), 0)
         FROM public.botlguide_audit_log
         WHERE created_at >= cutoff AND status = 'success'),
    'p50ResponseMs',
      (SELECT COALESCE(round(percentile_cont(0.50) WITHIN GROUP (ORDER BY response_time_ms)), 0)
         FROM public.botlguide_audit_log
         WHERE created_at >= cutoff AND status = 'success'),
    'p95ResponseMs',
      (SELECT COALESCE(round(percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms)), 0)
         FROM public.botlguide_audit_log
         WHERE created_at >= cutoff AND status = 'success'),
    'errorRate',
      (SELECT COALESCE(
         round(count(*) FILTER (WHERE status = 'error') * 100.0
               / NULLIF(count(*), 0), 1), 0)
         FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'byCapability',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub.cnt DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'capability', capability,
          'calls',      count(*),
          'avgMs',      round(avg(response_time_ms)),
          'credits',    sum(credits_used),
          'errorRate',  round(count(*) FILTER (WHERE status = 'error') * 100.0
                              / NULLIF(count(*), 0), 1)
        ) AS sub, count(*) AS cnt
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff
        GROUP BY capability
      ) t),
    'dailyTrend',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'date'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'date',    created_at::date,
          'calls',   count(*),
          'credits', sum(credits_used),
          'avgMs',   round(avg(response_time_ms))
        ) AS sub
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff
        GROUP BY created_at::date
      ) t),
    'teamRagUsage',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'calls' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'breweryId', brewery_id,
          'calls',     count(*),
          'ragCalls',  count(*) FILTER (
            WHERE rag_sources_used IS NOT NULL
              AND array_length(rag_sources_used, 1) > 0
          )
        ) AS sub
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff AND brewery_id IS NOT NULL
        GROUP BY brewery_id
      ) t),
    'topErrors',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'count' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'capability',   capability,
          'errorMessage', error_message,
          'count',        count(*)
        ) AS sub
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff AND status = 'error'
        GROUP BY capability, error_message
        LIMIT 20
      ) t)
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_botlguide_usage_stats"("p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_brew_flavor_profile"("p_brew_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bitterness',  ROUND(AVG(bitterness)::numeric  * 10, 1),
    'sweetness',   ROUND(AVG(sweetness)::numeric   * 10, 1),
    'body',        ROUND(AVG(body)::numeric        * 10, 1),
    'roast',       ROUND(AVG(roast)::numeric       * 10, 1),
    'fruitiness',  ROUND(AVG(fruitiness)::numeric  * 10, 1),
    'count',       COUNT(*)
  )
  INTO result
  FROM public.flavor_profiles
  WHERE brew_id = p_brew_id;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_brew_flavor_profile"("p_brew_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_brew_taste_profile"("p_brew_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_brew_taste_profile"("p_brew_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer DEFAULT 20) RETURNS TABLE("brew_id" "uuid", "collab_score" double precision)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer) IS 'Stufe C v2 Kollaboratives Filtering. Signal: Likes + Ratings>=4 (eigene und fremde). Diversity-Cap: max. 3 Brews pro Stil-Kategorie. Cache-Tabelle: user_recommendations (TTL 2h, Client schreibt nach Live-Call). Upgrade-Pfad ab 500 Nutzern: pg_cron-Job (auskommentiert unten) aktivieren.';



CREATE OR REPLACE FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_diversity_cap" integer DEFAULT 3) RETURNS TABLE("brew_id" "uuid", "collab_score" double precision)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_diversity_cap" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_diversity_cap" integer) IS 'Stufe C v2.1: p_diversity_cap konfigurierbar (Default 3). Empfohlene Formel: max(2, round(total_public_brews / 30)). Signal: Likes + Ratings>=4. Diversity-Cap via platform_settings.collab_diversity_cap.';



CREATE OR REPLACE FUNCTION "public"."get_db_health_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- Total database size
    'db_size_bytes',       pg_database_size(current_database()),
    'db_size_pretty',      pg_size_pretty(pg_database_size(current_database())),

    -- Connections (only for our database)
    'active_connections',  (
      SELECT count(*)
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND datname = current_database()
    ),
    'idle_connections',    (
      SELECT count(*)
      FROM pg_stat_activity
      WHERE state = 'idle'
        AND datname = current_database()
    ),
    'total_connections',   (
      SELECT count(*)
      FROM pg_stat_activity
      WHERE datname = current_database()
    ),

    -- How many public user tables exist
    'table_count',         (
      SELECT count(*)
      FROM pg_stat_user_tables
    ),

    -- Buffer cache hit ratio (higher = better; < 95% is a warning sign)
    'cache_hit_ratio',     (
      SELECT ROUND(
        sum(heap_blks_hit) * 100.0 /
        NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0),
        1
      )
      FROM pg_statio_user_tables
    ),

    -- Top 5 biggest tables by total size (table + indexes)
    'biggest_tables', (
      SELECT jsonb_agg(t)
      FROM (
        SELECT
          relname                                                   AS name,
          pg_size_pretty(pg_total_relation_size(c.oid))            AS total_size,
          pg_total_relation_size(c.oid)                            AS total_size_bytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_db_health_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_featured_brews_public"() RETURNS TABLE("id" "uuid", "name" "text", "style" "text", "image_url" "text", "quality_score" integer, "trending_score" double precision, "likes_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_featured_brews_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_low_quality_brews"("threshold" integer DEFAULT 40) RETURNS TABLE("id" "uuid", "name" "text", "style" "text", "quality_score" integer, "trending_score" double precision, "is_featured" boolean, "image_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_low_quality_brews"("threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_brewery_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT brewery_id FROM brewery_members WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_brewery_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quality_score_distribution"() RETURNS TABLE("bucket" "text", "bucket_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_quality_score_distribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trending_brews"("limit_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "name" "text", "style" "text", "image_url" "text", "created_at" timestamp with time zone, "user_id" "uuid", "brew_type" "text", "mash_method" "text", "fermentation_type" "text", "copy_count" integer, "times_brewed" integer, "view_count" integer, "trending_score" double precision, "quality_score" integer, "likes_count" integer, "moderation_status" "text", "remix_parent_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_trending_brews"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_brew_context"("p_user_id" "uuid", "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_brewery_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    -- ── Experience tier ────────────────────────────────────────────────────
    'experienceTier', (
      SELECT p.tier
      FROM public.profiles p
      WHERE p.id = p_user_id
      LIMIT 1
    ),

    -- ── Last 5 brews with recipe DNA + community reception ────────────────
    'recentBrews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          b.id,
          'name',        b.name,
          'style',       b.style,
          'brewType',    b.brew_type,
          'og',          (b.data ->> 'og'),
          'fg',          (b.data ->> 'fg'),
          'abv',         b.abv,
          'ibu',         b.ibu,
          'batchSizeL',  (b.data ->> 'batch_size_liters'),
          'createdAt',   b.created_at,
          'malts',       b.data -> 'malts',
          'hops',        b.data -> 'hops',
          'yeast',       b.data -> 'yeast',
          'avgRating',   (
            SELECT ROUND(AVG(r.rating)::numeric, 1)
            FROM public.ratings r
            WHERE r.brew_id = b.id
              AND r.moderation_status = 'auto_approved'
          ),
          'ratingCount', (
            SELECT COUNT(*)
            FROM public.ratings r
            WHERE r.brew_id = b.id
              AND r.moderation_status = 'auto_approved'
          )
        )
        ORDER BY b.created_at DESC
      )
      FROM (
        SELECT b2.*
        FROM public.brews b2
        WHERE b2.user_id = p_user_id
        ORDER BY b2.created_at DESC
        LIMIT 5
      ) b
    ),

    -- ── Best-rated brew ────────────────────────────────────────────────────
    'topRatedBrew', (
      SELECT jsonb_build_object(
        'name',        b.name,
        'style',       b.style,
        'og',          (b.data ->> 'og'),
        'ibu',         b.ibu,
        'avgRating',   ROUND(AVG(r.rating)::numeric, 1),
        'ratingCount', COUNT(r.id)
      )
      FROM public.brews b
      JOIN public.ratings r ON r.brew_id = b.id
      WHERE b.user_id = p_user_id
        AND r.moderation_status = 'auto_approved'
      GROUP BY b.id, b.name, b.style, b.data, b.ibu
      HAVING COUNT(r.id) >= 2
      ORDER BY AVG(r.rating) DESC, COUNT(r.id) DESC
      LIMIT 1
    ),

    -- ── Inspiration signal ─────────────────────────────────────────────────
    'inspirationSignal', (
      WITH liked_foreign AS (
        SELECT b.style, b.data -> 'hops' AS hops_json
        FROM public.likes l
        JOIN public.brews b ON b.id = l.brew_id
        WHERE l.user_id = p_user_id
          AND b.user_id != p_user_id
          AND b.is_public = true
      ),
      top_styles AS (
        SELECT style, COUNT(*) AS cnt
        FROM liked_foreign
        WHERE style IS NOT NULL AND style <> ''
        GROUP BY style
        ORDER BY cnt DESC
        LIMIT 3
      ),
      top_hops AS (
        SELECT elem ->> 'name' AS hop_name, COUNT(*) AS cnt
        FROM liked_foreign,
             jsonb_array_elements(
               CASE jsonb_typeof(hops_json)
                 WHEN 'array' THEN hops_json
                 ELSE '[]'::jsonb
               END
             ) AS elem
        WHERE elem ->> 'name' IS NOT NULL
          AND elem ->> 'name' <> ''
        GROUP BY hop_name
        ORDER BY cnt DESC
        LIMIT 3
      )
      SELECT CASE
        WHEN (SELECT COUNT(*) FROM liked_foreign) = 0 THEN NULL
        ELSE jsonb_build_object(
          'likedCount',  (SELECT COUNT(*) FROM liked_foreign),
          'topStyles',   (SELECT jsonb_agg(style ORDER BY cnt DESC) FROM top_styles),
          'topHops',     (SELECT jsonb_agg(hop_name ORDER BY cnt DESC) FROM top_hops)
        )
      END
    ),

    -- ── Active session: fermentation measurements ─────────────────────────
    'sessionMeasurements', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_agg(
          jsonb_build_object(
            'measuredAt',  m.measured_at,
            'gravity',     m.gravity,
            'temperature', m.temperature,
            'ph',          m.ph,
            'notes',       m.notes
          )
          ORDER BY m.measured_at ASC
        )
        FROM public.brew_measurements m
        WHERE m.session_id = p_session_id
      )
      ELSE NULL
    END,

    -- ── Active session: process context ───────────────────────────────────
    'sessionContext', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'phase',               bs.phase,
          'status',              bs.status,
          'notes',               bs.notes,
          'currentGravity',      bs.current_gravity,
          'apparentAttenuation', bs.apparent_attenuation,
          'processNotes', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'date',  n.evt_date,
                'title', n.evt_title,
                'note',  n.evt_note
              )
            )
            FROM (
              SELECT
                evt ->> 'date'  AS evt_date,
                evt ->> 'title' AS evt_title,
                evt ->> 'note'  AS evt_note
              FROM jsonb_array_elements(COALESCE(bs.timeline, '[]'::jsonb)) AS evt
              WHERE evt ->> 'type' = 'NOTE'
                AND (evt ->> 'title') IS NOT NULL
              ORDER BY (evt ->> 'date') DESC NULLS LAST
              LIMIT 10
            ) n
          )
        )
        FROM public.brewing_sessions bs
        WHERE bs.id = p_session_id
        LIMIT 1
      )
      ELSE NULL
    END,

    -- ── Equipment profile + brewery location + brand description ──────────
    -- `description` is used as Brand Voice in Copywriter prompts.
    -- LEFT JOIN ensures all fields are present even without a default profile.
    'equipmentProfile', CASE
      WHEN p_brewery_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'name',            ep.name,
          'brewMethod',      ep.brew_method,
          'batchVolumeL',    ep.batch_volume_l,
          'boilOffRateL',    ep.boil_off_rate,
          'trubLossL',       ep.trub_loss,
          'grainAbsorption', ep.grain_absorption,
          'mashThickness',   ep.mash_thickness,
          'location',        br.location,
          'breweryName',     br.name,
          'description',     br.description   -- Brand Voice source
        )
        FROM public.breweries br
        LEFT JOIN public.equipment_profiles ep
               ON ep.brewery_id = br.id AND ep.is_default = true
        WHERE br.id = p_brewery_id
        LIMIT 1
      )
      ELSE NULL
    END,

    -- ── Community Flavor DNA ────────────────────────────────────────────────
    'flavorDna', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN jsonb_build_object(
          'count',      COUNT(*),
          'sweetness',  ROUND(AVG(fp.sweetness)::numeric, 3),
          'bitterness', ROUND(AVG(fp.bitterness)::numeric, 3),
          'body',       ROUND(AVG(fp.body)::numeric, 3),
          'roast',      ROUND(AVG(fp.roast)::numeric, 3),
          'fruitiness', ROUND(AVG(fp.fruitiness)::numeric, 3)
        )
        ELSE NULL
      END
      FROM public.flavor_profiles fp
      WHERE fp.brew_id IN (
        SELECT br2.id FROM public.brews br2 WHERE br2.user_id = p_user_id
      )
    ),

    -- ── Feedback profile ───────────────────────────────────────────────────
    'feedbackProfile', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE jsonb_object_agg(
          capability,
          jsonb_build_object(
            'up',    up_count,
            'down',  down_count,
            'total', up_count + down_count
          )
        )
      END
      FROM (
        SELECT
          capability,
          COUNT(*) FILTER (WHERE feedback = 'up')   AS up_count,
          COUNT(*) FILTER (WHERE feedback = 'down')  AS down_count
        FROM public.botlguide_feedback
        WHERE user_id = p_user_id
          AND capability IS NOT NULL
        GROUP BY capability
        HAVING COUNT(*) >= 1
      ) fb
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_user_brew_context"("p_user_id" "uuid", "p_session_id" "uuid", "p_brewery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_brew_image_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_brew_image_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_brewery_logo_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_brewery_logo_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_like_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_like_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates profile for new user. Reads app_mode from raw_user_meta_data (brewer/drinker),
   defaults to drinker if not set. B2B-Signup-Form sets app_mode=brewer explicitly.';



CREATE OR REPLACE FUNCTION "public"."increment_bottle_fills"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.brew_id IS NOT NULL AND (OLD.brew_id IS NULL OR OLD.brew_id != NEW.brew_id) THEN
    UPDATE profiles 
    SET total_bottle_fills = total_bottle_fills + 1 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_bottle_fills"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_bottle_fills_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.brew_id IS NOT NULL THEN
    UPDATE profiles 
    SET total_bottle_fills = total_bottle_fills + 1 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_bottle_fills_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_bottle_scan_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Increment the bottles.scan_count
  UPDATE bottles
  SET scan_count = scan_count + 1
  WHERE id = NEW.bottle_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_bottle_scan_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_brew_copy_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.remix_parent_id IS NOT NULL THEN
        UPDATE brews
        SET copy_count = copy_count + 1
        WHERE id = NEW.remix_parent_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_brew_copy_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) IS 'Increments or creates daily aggregated analytics stats';



CREATE OR REPLACE FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer DEFAULT NULL::integer, "p_is_new_visitor" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer DEFAULT NULL::integer, "p_is_new_visitor" boolean DEFAULT true, "p_is_logged_in" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean, "p_is_logged_in" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_forum_view_count"("thread_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE forum_threads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = thread_id;
$$;


ALTER FUNCTION "public"."increment_forum_view_count"("thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_profile_views"("p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET total_profile_views = COALESCE(total_profile_views, 0) + 1
  WHERE id = p_profile_id;
END;
$$;


ALTER FUNCTION "public"."increment_profile_views"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_tasting_iq"("p_user_id" "uuid", "p_delta" integer) RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE public.profiles
  SET tasting_iq = COALESCE(tasting_iq, 0) + p_delta
  WHERE id = p_user_id
  RETURNING tasting_iq;
$$;


ALTER FUNCTION "public"."increment_tasting_iq"("p_user_id" "uuid", "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of"("_brewery_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Direct low-level query, no RLS triggered here
  RETURN EXISTS (
    SELECT 1 
    FROM brewery_members 
    WHERE brewery_id = _brewery_id 
    AND user_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_member_of"("_brewery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_brew_page_view"("p_brew_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."record_brew_page_view"("p_brew_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_brew_style_averages"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY brew_style_averages;
END;
$$;


ALTER FUNCTION "public"."refresh_brew_style_averages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_brew_style_flavor_averages"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.brew_style_flavor_averages;
END;
$$;


ALTER FUNCTION "public"."refresh_brew_style_flavor_averages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_trending_scores"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_trending_scores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_botlguide_embeddings"("p_query_embedding" "extensions"."vector", "p_source_type" "text" DEFAULT 'bjcp_style'::"text", "p_match_count" integer DEFAULT 3, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_min_similarity" double precision DEFAULT 0.5) RETURNS TABLE("id" "uuid", "source_id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'extensions', 'public', 'pg_catalog'
    AS $$
  SELECT
    e.id,
    e.source_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> p_query_embedding) AS similarity
  FROM public.botlguide_embeddings e
  WHERE
    e.source_type = p_source_type
    AND (p_user_id IS NULL OR e.user_id = p_user_id OR e.user_id IS NULL)
    AND e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;


ALTER FUNCTION "public"."search_botlguide_embeddings"("p_query_embedding" "extensions"."vector", "p_source_type" "text", "p_match_count" integer, "p_user_id" "uuid", "p_min_similarity" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_team_knowledge"("p_query_embedding" "extensions"."vector", "p_brewery_id" "uuid", "p_match_count" integer DEFAULT 5, "p_min_similarity" double precision DEFAULT 0.5) RETURNS TABLE("id" "uuid", "document_id" "uuid", "content" "text", "similarity" double precision, "metadata" "jsonb", "filename" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    (1 - (c.embedding <=> p_query_embedding))::FLOAT AS similarity,
    c.metadata,
    d.filename
  FROM public.team_knowledge_chunks c
  JOIN public.team_knowledge_base d ON d.id = c.document_id
  WHERE c.brewery_id = p_brewery_id
    AND d.status = 'ready'
    AND 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;


ALTER FUNCTION "public"."search_team_knowledge"("p_query_embedding" "extensions"."vector", "p_brewery_id" "uuid", "p_match_count" integer, "p_min_similarity" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_equipment_profile"("p_profile_id" "uuid", "p_brewery_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_default_equipment_profile"("p_profile_id" "uuid", "p_brewery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_short_code_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_short_code_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_botlguide_embeddings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_botlguide_embeddings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_brew_abv_ibu"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."sync_brew_abv_ibu"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_brew_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- mash_steps_count
  IF NEW.data->'mash_steps' IS NOT NULL 
     AND jsonb_array_length(NEW.data->'mash_steps') > 0 THEN
    NEW.mash_steps_count := jsonb_array_length(NEW.data->'mash_steps');
  ELSE
    NEW.mash_steps_count := COALESCE(NEW.mash_steps_count, 1);
  END IF;

  -- mash_process Inferenz (nur wenn nicht explizit gesetzt)
  IF NEW.mash_process IS NULL AND NEW.brew_type = 'beer' THEN
    IF NEW.data->'mash_steps' IS NOT NULL 
       AND jsonb_array_length(NEW.data->'mash_steps') > 0 THEN
      -- Priorität 1: step_type = 'decoction' explizit gesetzt
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.data->'mash_steps') AS s
        WHERE s->>'step_type' = 'decoction'
      ) THEN
        NEW.mash_process := 'decoction';
      -- Priorität 2: Keyword-basiert (Name enthält Dekoktion etc.)
      ELSIF EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.data->'mash_steps') AS s
        WHERE LOWER(COALESCE(s->>'name', '')) SIMILAR TO '%(dekok|decoction|kochmaische)%'
      ) THEN
        NEW.mash_process := 'decoction';
      -- Priorität 3: Schritt-Anzahl
      ELSIF jsonb_array_length(NEW.data->'mash_steps') = 1 THEN
        NEW.mash_process := 'infusion';
      ELSE
        NEW.mash_process := 'step_mash';
      END IF;
    END IF;
  END IF;

  -- mash_process aus data-Feld übernehmen (Editor setzt es explizit)
  IF NEW.data->>'mash_process' IS NOT NULL AND NEW.data->>'mash_process' <> '' THEN
    NEW.mash_process := NEW.data->>'mash_process';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_brew_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_mash_steps_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_mash_steps_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_refresh_quality_score_on_brew"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE brews
    SET quality_score = public.calculate_brew_quality_score(NEW.id)
    WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fn_refresh_quality_score_on_brew"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_refresh_quality_score_on_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."trg_fn_refresh_quality_score_on_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_refresh_quality_score_on_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE brews
    SET quality_score = public.calculate_brew_quality_score(NEW.brew_id)
    WHERE id = NEW.brew_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fn_refresh_quality_score_on_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_times_brewed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."trg_fn_times_brewed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.profiles
  set active_brewery_id = update_active_brewery.brewery_id
  where id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_analytics_report_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_analytics_report_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brew_trending_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_brew_trending_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_equipment_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_equipment_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_scan_geom"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_scan_geom"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_thread_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_thread_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upgrade_to_brewer_on_join"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Nur upgraden wenn User noch Drinker ist (Idempotenz)
  UPDATE public.profiles
  SET
    app_mode         = 'brewer',
    active_brewery_id = NEW.brewery_id
  WHERE id = NEW.user_id
    AND app_mode = 'drinker';

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."upgrade_to_brewer_on_join"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upgrade_to_brewer_on_join"() IS 'Upgradet einen drinker automatisch auf brewer wenn er einer Brauerei beitritt.
   Fängt alle drei Join-Wege ab (create, join-code, admin-invite).
   Setzt active_brewery_id auf die neue Brauerei.
   Idempotent: Wird nur ausgeführt wenn app_mode noch drinker ist.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."brews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "style" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "description" "text",
    "brew_type" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_public" boolean DEFAULT true,
    "remix_parent_id" "uuid",
    "cap_url" "text",
    "brewery_id" "uuid",
    "likes_count" integer DEFAULT 0 NOT NULL,
    "moderation_status" "text" DEFAULT 'pending'::"text",
    "moderation_rejection_reason" "text",
    "moderated_at" timestamp with time zone,
    "moderated_by" "uuid",
    "mash_method" "text",
    "mash_process" "text",
    "fermentation_type" "text",
    "mash_steps_count" integer DEFAULT 1,
    "quality_score" integer DEFAULT 0,
    "trending_score" double precision DEFAULT 0,
    "copy_count" integer DEFAULT 0,
    "is_featured" boolean DEFAULT false NOT NULL,
    "trending_score_override" double precision,
    "times_brewed" integer DEFAULT 0 NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "abv" numeric(5,2) DEFAULT NULL::numeric,
    "ibu" integer,
    "abv_calculated" numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (("data" ->> 'abv'::"text") ~ '^[0-9]*\.?[0-9]+$'::"text") THEN (("data" ->> 'abv'::"text"))::numeric
    ELSE NULL::numeric
END) STORED,
    "ibu_calculated" integer GENERATED ALWAYS AS (
CASE
    WHEN (("data" ->> 'ibu'::"text") ~ '^[0-9]+$'::"text") THEN (("data" ->> 'ibu'::"text"))::integer
    ELSE NULL::integer
END) STORED,
    "srm_calculated" numeric(5,1) GENERATED ALWAYS AS (
CASE
    WHEN (("data" ->> 'srm'::"text") ~ '^[0-9]*\.?[0-9]+$'::"text") THEN (("data" ->> 'srm'::"text"))::numeric
    ELSE NULL::numeric
END) STORED,
    "flavor_profile" "jsonb",
    "typical_scan_hour" integer,
    "typical_temperature" integer,
    CONSTRAINT "brews_fermentation_type_check" CHECK (("fermentation_type" = ANY (ARRAY['top'::"text", 'bottom'::"text", 'spontaneous'::"text", 'mixed'::"text"]))),
    CONSTRAINT "brews_mash_method_check" CHECK (("mash_method" = ANY (ARRAY['all_grain'::"text", 'extract'::"text", 'partial_mash'::"text"]))),
    CONSTRAINT "brews_mash_process_check" CHECK (("mash_process" = ANY (ARRAY['infusion'::"text", 'step_mash'::"text", 'decoction'::"text", 'biab'::"text"]))),
    CONSTRAINT "check_brew_type" CHECK (("brew_type" = ANY (ARRAY['beer'::"text", 'wine'::"text", 'softdrink'::"text"]))),
    CONSTRAINT "check_moderation_status" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."brews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."brews"."is_public" IS 'Bestimmt, ob das Rezept öffentlich auf der Brauerei-Seite und in Discovery angezeigt wird';



COMMENT ON COLUMN "public"."brews"."flavor_profile" IS 'Brauer-definiertes Geschmacksprofil (Zielprofil) für Beat the Brewer.
   Struktur: { sweetness, bitterness, body, roast, fruitiness } je 0.0–1.0,
   plus source: manual | data_suggestion | botlguide.
   NULL = Brauer hat noch kein Profil hinterlegt → Beat the Brewer ist deaktiviert.';



COMMENT ON COLUMN "public"."brews"."typical_scan_hour" IS 'Mode (most frequent) local hour (0–23) of verified scans in the last 90 days. Set nightly by the aggregate-cis-context Edge Function.';



COMMENT ON COLUMN "public"."brews"."typical_temperature" IS 'AVG(weather_temp_c) of verified scans in the last 90 days (°C). Set nightly by the aggregate-cis-context Edge Function.';



CREATE OR REPLACE FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 
    from public.likes 
    where brew_id = brew_row.id
    and user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private_system"."secrets" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "private_system"."secrets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "points" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" bigint NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "added_by" "uuid",
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "daily_report_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'moderator'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_users" IS 'Persistent admin user registry. Replaces ADMIN_EMAILS env var. Bootstrapped from env on first login.';



COMMENT ON COLUMN "public"."admin_users"."daily_report_enabled" IS 'If true (and role = super_admin), receive the daily platform status email. Default: true.';



CREATE SEQUENCE IF NOT EXISTS "public"."admin_users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_users_id_seq" OWNED BY "public"."admin_users"."id";



CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "generation_type" "text" NOT NULL,
    "model_used" "text" NOT NULL,
    "prompt_length" integer,
    "tokens_used" integer,
    "cost_estimate" numeric(10,4),
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_usage_logs" IS 'Detailed tracking of AI API usage per user';



CREATE TABLE IF NOT EXISTS "public"."analytics_admin_audit_logs" (
    "id" bigint NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "resource_id" "text",
    "details" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_admin_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_admin_audit_logs" IS 'Immutable audit log for admin actions (GDPR compliance - "watching the watchers")';



COMMENT ON COLUMN "public"."analytics_admin_audit_logs"."action" IS 'Type of admin action performed';



COMMENT ON COLUMN "public"."analytics_admin_audit_logs"."resource_id" IS 'ID of the resource accessed (user_id, file_name, etc.)';



COMMENT ON COLUMN "public"."analytics_admin_audit_logs"."details" IS 'Additional context (filters used, query parameters, etc.)';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_admin_audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_admin_audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_admin_audit_logs_id_seq" OWNED BY "public"."analytics_admin_audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_ai_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "brew_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "insight_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "action_suggestion" "text",
    "trigger_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_phases" "text"[],
    "brewer_reaction" "text",
    "brewer_notes" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "is_dismissed" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."analytics_ai_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_alert_history" (
    "id" bigint NOT NULL,
    "rule_id" bigint,
    "triggered_at" timestamp without time zone DEFAULT "now"(),
    "metric_value" numeric,
    "message" "text",
    "resolved_at" timestamp without time zone,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_alert_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_alert_history" IS 'History of triggered alerts';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_alert_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_alert_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_alert_history_id_seq" OWNED BY "public"."analytics_alert_history"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_alert_rules" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "metric" "text" NOT NULL,
    "condition" "text" NOT NULL,
    "threshold" numeric NOT NULL,
    "timeframe_minutes" integer DEFAULT 5,
    "notification_channels" "text"[] DEFAULT ARRAY['email'::"text"],
    "enabled" boolean DEFAULT true,
    "last_triggered_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "priority" "text" DEFAULT 'MEDIUM'::"text" NOT NULL,
    CONSTRAINT "analytics_alert_rules_priority_check" CHECK (("priority" = ANY (ARRAY['LOW'::"text", 'MEDIUM'::"text", 'HIGH'::"text"])))
);


ALTER TABLE "public"."analytics_alert_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_alert_rules" IS 'Configurable alerting rules for automated monitoring';



COMMENT ON COLUMN "public"."analytics_alert_rules"."priority" IS 'Alert severity. HIGH alerts trigger email notifications to admin recipients.';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_alert_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_alert_rules_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_alert_rules_id_seq" OWNED BY "public"."analytics_alert_rules"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_brewery_daily" (
    "id" bigint NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "members_count" integer DEFAULT 0,
    "brews_count" integer DEFAULT 0,
    "sessions_count" integer DEFAULT 0,
    "bottles_scanned" integer DEFAULT 0,
    "ratings_received" integer DEFAULT 0,
    "active_members" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "btb_plays_total" integer DEFAULT 0,
    "btb_plays_anonymous" integer DEFAULT 0
);


ALTER TABLE "public"."analytics_brewery_daily" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_brewery_daily" IS 'Daily aggregated brewery team activity';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_brewery_daily_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_brewery_daily_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_brewery_daily_id_seq" OWNED BY "public"."analytics_brewery_daily"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_cohorts" (
    "cohort_id" "text" NOT NULL,
    "user_count" integer DEFAULT 0,
    "retention_day1" numeric(5,2) DEFAULT 0,
    "retention_day7" numeric(5,2) DEFAULT 0,
    "retention_day30" numeric(5,2) DEFAULT 0,
    "retention_day90" numeric(5,2) DEFAULT 0,
    "avg_events_per_user" numeric(8,2) DEFAULT 0,
    "avg_brews_per_user" numeric(5,2) DEFAULT 0,
    "paid_conversion_rate" numeric(5,2) DEFAULT 0,
    "avg_ltv" numeric(10,2) DEFAULT 0,
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_cohorts" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_cohorts" IS 'Monthly user cohort retention and engagement metrics';



CREATE TABLE IF NOT EXISTS "public"."analytics_content_daily" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "total_brews" integer DEFAULT 0,
    "total_sessions" integer DEFAULT 0,
    "total_bottles" integer DEFAULT 0,
    "total_ratings" integer DEFAULT 0,
    "public_brews" integer DEFAULT 0,
    "private_brews" integer DEFAULT 0,
    "team_brews" integer DEFAULT 0,
    "avg_rating" numeric(3,2) DEFAULT 0,
    "brews_created_today" integer DEFAULT 0,
    "sessions_created_today" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_content_daily" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_content_daily" IS 'Daily snapshot of all content metrics';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_content_daily_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_content_daily_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_content_daily_id_seq" OWNED BY "public"."analytics_content_daily"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_daily_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "brew_id" "uuid",
    "country_code" "text",
    "device_type" "text",
    "total_scans" integer DEFAULT 0 NOT NULL,
    "unique_visitors" integer DEFAULT 0 NOT NULL,
    "hour_distribution" "jsonb",
    "logged_in_scans" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."analytics_daily_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_daily_stats" IS 'Pre-aggregated daily scan statistics for fast dashboard queries';



COMMENT ON COLUMN "public"."analytics_daily_stats"."hour_distribution" IS 'JSON object with hourly scan distribution: {"0": 5, "1": 3, "14": 45, ...}';



COMMENT ON COLUMN "public"."analytics_daily_stats"."logged_in_scans" IS 'Count of scans performed by authenticated (logged-in) users.
   Required for the Verified Drinker Funnel (Analytics Phase 2).
   Populated by trackBottleScan via increment_daily_stats p_is_logged_in param.';



CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "path" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "user_agent" "text",
    "response_time_ms" integer
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."analytics_events"."response_time_ms" IS 'Optional API response time in milliseconds, set by instrumented route handlers.';



CREATE TABLE IF NOT EXISTS "public"."analytics_feature_usage" (
    "id" bigint NOT NULL,
    "feature" "text" NOT NULL,
    "date" "date" NOT NULL,
    "usage_count" integer DEFAULT 0,
    "unique_users" integer DEFAULT 0,
    "success_count" integer DEFAULT 0,
    "error_count" integer DEFAULT 0,
    "avg_duration_seconds" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_feature_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_feature_usage" IS 'Daily feature usage metrics';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_feature_usage_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_feature_usage_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_feature_usage_id_seq" OWNED BY "public"."analytics_feature_usage"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_report_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "report_setting_id" "uuid" NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "total_scans" integer,
    "unique_visitors" integer,
    "top_brew_id" "uuid",
    "email_sent_to" "text",
    "email_provider" "text",
    "email_id" "text",
    CONSTRAINT "analytics_report_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."analytics_report_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_report_logs" IS 'Log of sent/failed analytics reports for debugging and tracking delivery.';



CREATE TABLE IF NOT EXISTS "public"."analytics_report_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "frequency" "text" NOT NULL,
    "email" "text" NOT NULL,
    "send_day" integer NOT NULL,
    "include_top_brews" boolean DEFAULT true,
    "include_geographic_data" boolean DEFAULT true,
    "include_device_stats" boolean DEFAULT true,
    "include_time_analysis" boolean DEFAULT false,
    "last_sent_at" timestamp with time zone,
    "send_count" integer DEFAULT 0,
    CONSTRAINT "analytics_report_settings_check" CHECK (((("frequency" = 'weekly'::"text") AND (("send_day" >= 1) AND ("send_day" <= 7))) OR (("frequency" = 'monthly'::"text") AND (("send_day" >= 1) AND ("send_day" <= 28))))),
    CONSTRAINT "analytics_report_settings_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."analytics_report_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_report_settings" IS 'Configuration for automated weekly/monthly analytics email reports. Email sending to be implemented via Resend/Sendgrid.';



CREATE TABLE IF NOT EXISTS "public"."analytics_system_hourly" (
    "id" bigint NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    "hour" integer NOT NULL,
    "date" "date" NOT NULL,
    "error_count" integer DEFAULT 0,
    "avg_response_time_ms" integer DEFAULT 0,
    "active_users_count" integer DEFAULT 0,
    "api_calls_count" integer DEFAULT 0,
    "unique_sessions" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_system_hourly" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_system_hourly" IS 'Hourly system health and performance metrics';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_system_hourly_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_system_hourly_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_system_hourly_id_seq" OWNED BY "public"."analytics_system_hourly"."id";



CREATE TABLE IF NOT EXISTS "public"."analytics_user_daily" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "events_count" integer DEFAULT 0,
    "session_duration_seconds" integer DEFAULT 0,
    "features_used" "text"[],
    "last_event_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_user_daily" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_user_daily" IS 'Daily aggregated user activity metrics';



COMMENT ON COLUMN "public"."analytics_user_daily"."features_used" IS 'Array of feature categories used (e.g., [brew, session, bottle])';



CREATE SEQUENCE IF NOT EXISTS "public"."analytics_user_daily_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analytics_user_daily_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analytics_user_daily_id_seq" OWNED BY "public"."analytics_user_daily"."id";



CREATE TABLE IF NOT EXISTS "public"."beat_friend_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" DEFAULT "replace"(("gen_random_uuid"())::"text", '-'::"text", ''::"text") NOT NULL,
    "challenger_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "challenger_profile" "jsonb" NOT NULL,
    "challenger_score" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "challenged_id" "uuid",
    "challenged_profile" "jsonb",
    "challenged_score" integer,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."beat_friend_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."botlguide_audit_log" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brewery_id" "uuid",
    "capability" "text" NOT NULL,
    "model" "text" DEFAULT 'gemini-2.5-flash'::"text" NOT NULL,
    "input_summary" "text",
    "output_summary" "text",
    "credits_used" integer DEFAULT 1 NOT NULL,
    "response_time_ms" integer,
    "token_count_input" integer,
    "token_count_output" integer,
    "rag_sources_used" "text"[],
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "error_message" "text",
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."botlguide_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."botlguide_audit_log" IS 'Compliance audit trail for every BotlGuide AI call. Retention: 90 days recommended.';



ALTER TABLE "public"."botlguide_audit_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."botlguide_audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."botlguide_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "text" NOT NULL,
    "user_id" "uuid",
    "brewery_id" "uuid",
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(768),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "botlguide_embeddings_source_type_check" CHECK (("source_type" = ANY (ARRAY['bjcp_style'::"text", 'user_recipe'::"text"])))
);


ALTER TABLE "public"."botlguide_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."botlguide_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "context_key" "text" NOT NULL,
    "feedback" "text" NOT NULL,
    "generated_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "capability" "text",
    CONSTRAINT "botlguide_feedback_feedback_check" CHECK (("feedback" = ANY (ARRAY['up'::"text", 'down'::"text"])))
);


ALTER TABLE "public"."botlguide_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."botlguide_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brewery_id" "uuid",
    "session_id" "uuid",
    "brew_id" "uuid",
    "insight_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "dismissed" boolean DEFAULT false NOT NULL,
    "dismissed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "botlguide_insights_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."botlguide_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bottle_scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bottle_id" "uuid" NOT NULL,
    "brew_id" "uuid",
    "brewery_id" "uuid",
    "viewer_user_id" "uuid",
    "session_hash" "text",
    "country_code" "text",
    "city" "text",
    "user_agent_parsed" "text",
    "device_type" "text",
    "scan_source" "text" DEFAULT 'qr_code'::"text",
    "is_owner_scan" boolean DEFAULT false,
    "scanned_at_hour" integer,
    "converted_to_rating" boolean DEFAULT false,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "referrer_domain" "text",
    "bottle_age_days" integer,
    "weather_temp_c" numeric(4,1),
    "weather_condition" "text",
    "weather_category" "text",
    "weather_is_outdoor" boolean,
    "weather_fetched_at" timestamp with time zone,
    "scan_intent" "text",
    "confirmed_drinking" boolean,
    "drinking_probability" numeric(3,2) DEFAULT NULL::numeric,
    "geo_source" "text" DEFAULT 'ip_vercel'::"text",
    "geom" "extensions"."geometry"(Point,4326),
    "detected_city" "text",
    "detected_region" "text",
    "detected_country" "text",
    "geo_consent_given" boolean DEFAULT false,
    "local_time" timestamp without time zone,
    CONSTRAINT "bottle_scans_device_type_check" CHECK (("device_type" = ANY (ARRAY['mobile'::"text", 'desktop'::"text", 'tablet'::"text", 'unknown'::"text"]))),
    CONSTRAINT "bottle_scans_scan_source_check" CHECK (("scan_source" = ANY (ARRAY['qr_code'::"text", 'direct_link'::"text", 'share'::"text"])))
);


ALTER TABLE "public"."bottle_scans" OWNER TO "postgres";


COMMENT ON TABLE "public"."bottle_scans" IS 'Tracks QR code scans for brewery analytics (GDPR-compliant, no IP storage)';



COMMENT ON COLUMN "public"."bottle_scans"."scanned_at_hour" IS 'Hour of day (0-23) when scan occurred. Used for time-to-glass analysis.';



COMMENT ON COLUMN "public"."bottle_scans"."converted_to_rating" IS 'TRUE if user left a rating after scanning. Enables conversion funnel analysis.';



COMMENT ON COLUMN "public"."bottle_scans"."latitude" IS 'Geographic latitude from IP lookup (approximate)';



COMMENT ON COLUMN "public"."bottle_scans"."longitude" IS 'Geographic longitude from IP lookup (approximate)';



COMMENT ON COLUMN "public"."bottle_scans"."geo_source" IS 'gps_snapped_h3 = echtes GPS (H3 Resolution 8 snapped), ip_vercel = Vercel IP-basiert (zu ungenau für Clustering)';



COMMENT ON COLUMN "public"."bottle_scans"."detected_city" IS 'Stadt via Browser Geolocation + Nominatim (opt-in)';



COMMENT ON COLUMN "public"."bottle_scans"."detected_region" IS 'Region/Bundesland via Browser Geolocation + Nominatim (opt-in)';



COMMENT ON COLUMN "public"."bottle_scans"."detected_country" IS 'Land via Browser Geolocation + Nominatim (opt-in)';



COMMENT ON COLUMN "public"."bottle_scans"."geo_consent_given" IS 'User hat explizit Geo-Consent erteilt (true) oder abgelehnt (false)';



COMMENT ON COLUMN "public"."bottle_scans"."local_time" IS 'Client wall-clock datetime at scan time (no timezone). Inserted as "YYYY-MM-DDTHH:MM:SS" so EXTRACT(HOUR) returns the local hour. Used for: timezone-correct hour comparison, weekend/holiday detection in CIS scoring.';



CREATE TABLE IF NOT EXISTS "public"."bottles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "bottle_number" integer NOT NULL,
    "brewery_id" "uuid",
    "session_id" "uuid",
    "filled_at" timestamp with time zone,
    "size_l" double precision,
    "scan_count" integer DEFAULT 0 NOT NULL,
    "short_code" "text"
);


ALTER TABLE "public"."bottles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bottles"."scan_count" IS 'Denormalized total scan count for performance. Updated via trigger on bottle_scans inserts.';



CREATE SEQUENCE IF NOT EXISTS "public"."bottles_bottle_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bottles_bottle_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bottles_bottle_number_seq" OWNED BY "public"."bottles"."bottle_number";



CREATE TABLE IF NOT EXISTS "public"."bounty_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bounty_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "claimed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "qualifying_event_id" "uuid"
);


ALTER TABLE "public"."bounty_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brew_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid",
    "measured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gravity" numeric,
    "temperature" numeric,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "pressure" numeric,
    "ph" numeric,
    "source" "text" DEFAULT 'manual'::"text",
    "is_og" boolean DEFAULT false,
    "session_id" "uuid"
);


ALTER TABLE "public"."brew_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "author_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ip_address" "text",
    "moderation_status" character varying(20) DEFAULT 'auto_approved'::character varying,
    "flagged_count" integer DEFAULT 0,
    "taste_bitterness" integer,
    "taste_sweetness" integer,
    "taste_body" integer,
    "taste_carbonation" integer,
    "taste_acidity" integer,
    "flavor_tags" "text"[],
    "appearance_color" "text",
    "appearance_clarity" "text",
    "aroma_intensity" integer,
    "user_id" "uuid",
    "qr_verified" boolean DEFAULT false NOT NULL,
    CONSTRAINT "ratings_aroma_intensity_check" CHECK ((("aroma_intensity" >= 1) AND ("aroma_intensity" <= 10))),
    CONSTRAINT "ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "ratings_taste_acidity_check" CHECK ((("taste_acidity" >= 1) AND ("taste_acidity" <= 10))),
    CONSTRAINT "ratings_taste_bitterness_check" CHECK ((("taste_bitterness" >= 1) AND ("taste_bitterness" <= 10))),
    CONSTRAINT "ratings_taste_body_check" CHECK ((("taste_body" >= 1) AND ("taste_body" <= 10))),
    CONSTRAINT "ratings_taste_carbonation_check" CHECK ((("taste_carbonation" >= 1) AND ("taste_carbonation" <= 10))),
    CONSTRAINT "ratings_taste_sweetness_check" CHECK ((("taste_sweetness" >= 1) AND ("taste_sweetness" <= 10)))
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ratings"."qr_verified" IS 'TRUE wenn die Bewertung über einen verifizierten QR-Code-Scan (/b/[bottle_id]) abgegeben wurde. FALSE bei allen anderen Quellen.';



CREATE MATERIALIZED VIEW "public"."brew_style_averages" AS
 SELECT "lower"(TRIM(BOTH FROM "b"."style")) AS "style_normalized",
    "b"."style" AS "style_display",
    "count"(DISTINCT "b"."id") AS "brew_count",
    "count"("r"."id") AS "rating_count",
    "round"("avg"("r"."rating"), 2) AS "avg_overall",
    "round"("avg"("r"."taste_bitterness"), 2) AS "avg_bitterness",
    "round"("avg"("r"."taste_sweetness"), 2) AS "avg_sweetness",
    "round"("avg"("r"."taste_body"), 2) AS "avg_body",
    "round"("avg"("r"."taste_carbonation"), 2) AS "avg_carbonation",
    "round"("avg"("r"."taste_acidity"), 2) AS "avg_acidity"
   FROM ("public"."brews" "b"
     JOIN "public"."ratings" "r" ON (("r"."brew_id" = "b"."id")))
  WHERE (("b"."is_public" = true) AND ("b"."style" IS NOT NULL) AND (TRIM(BOTH FROM "b"."style") <> ''::"text") AND ("lower"(TRIM(BOTH FROM "b"."style")) <> 'unbekannt'::"text") AND (("r"."moderation_status")::"text" = 'auto_approved'::"text"))
  GROUP BY ("lower"(TRIM(BOTH FROM "b"."style"))), "b"."style"
 HAVING ("count"(DISTINCT "b"."id") >= 3)
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."brew_style_averages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flavor_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "rating_id" "uuid",
    "sweetness" numeric(4,3),
    "bitterness" numeric(4,3),
    "body" numeric(4,3),
    "roast" numeric(4,3),
    "fruitiness" numeric(4,3),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_hash" "text",
    "session_id" "uuid",
    CONSTRAINT "flavor_profiles_bitterness_check" CHECK ((("bitterness" >= (0)::numeric) AND ("bitterness" <= (1)::numeric))),
    CONSTRAINT "flavor_profiles_body_check" CHECK ((("body" >= (0)::numeric) AND ("body" <= (1)::numeric))),
    CONSTRAINT "flavor_profiles_fruitiness_check" CHECK ((("fruitiness" >= (0)::numeric) AND ("fruitiness" <= (1)::numeric))),
    CONSTRAINT "flavor_profiles_roast_check" CHECK ((("roast" >= (0)::numeric) AND ("roast" <= (1)::numeric))),
    CONSTRAINT "flavor_profiles_sweetness_check" CHECK ((("sweetness" >= (0)::numeric) AND ("sweetness" <= (1)::numeric)))
);


ALTER TABLE "public"."flavor_profiles" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."brew_style_flavor_averages" AS
 SELECT "lower"(TRIM(BOTH FROM "b"."style")) AS "style_normalized",
    "b"."style" AS "style_display",
    "count"(DISTINCT "b"."id") AS "brew_count",
    "count"("fp"."id") AS "profile_count",
    "round"(("avg"("fp"."bitterness") * (10)::numeric), 2) AS "avg_bitterness",
    "round"(("avg"("fp"."sweetness") * (10)::numeric), 2) AS "avg_sweetness",
    "round"(("avg"("fp"."body") * (10)::numeric), 2) AS "avg_body",
    "round"(("avg"("fp"."roast") * (10)::numeric), 2) AS "avg_roast",
    "round"(("avg"("fp"."fruitiness") * (10)::numeric), 2) AS "avg_fruitiness"
   FROM ("public"."brews" "b"
     JOIN "public"."flavor_profiles" "fp" ON (("fp"."brew_id" = "b"."id")))
  WHERE (("b"."is_public" = true) AND ("b"."style" IS NOT NULL) AND (TRIM(BOTH FROM "b"."style") <> ''::"text") AND ("lower"(TRIM(BOTH FROM "b"."style")) <> 'unbekannt'::"text"))
  GROUP BY ("lower"(TRIM(BOTH FROM "b"."style"))), "b"."style"
 HAVING ("count"(DISTINCT "b"."id") >= 3)
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."brew_style_flavor_averages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brew_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dwell_seconds" integer,
    "source" "text",
    CONSTRAINT "brew_views_source_check" CHECK (("source" = ANY (ARRAY['discover'::"text", 'search'::"text", 'direct'::"text", 'profile'::"text"])))
);


ALTER TABLE "public"."brew_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brewer_bounties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "brew_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "reward_type" "text" NOT NULL,
    "reward_value" "text" NOT NULL,
    "reward_code" "text",
    "condition_type" "text" NOT NULL,
    "condition_value" numeric NOT NULL,
    "max_claims" integer,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brewer_bounties_condition_type_check" CHECK (("condition_type" = ANY (ARRAY['match_score'::"text", 'vibe_check'::"text", 'rating_count'::"text"]))),
    CONSTRAINT "brewer_bounties_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['discount'::"text", 'free_beer'::"text", 'merchandise'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."brewer_bounties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."breweries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "logo_url" "text",
    "banner_url" "text",
    "founded_year" integer,
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "invite_code" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier" "text" DEFAULT 'garage'::"text" NOT NULL,
    "custom_slogan" "text",
    "moderation_status" "text" DEFAULT 'pending'::"text",
    "moderation_rejection_reason" "text",
    "moderated_at" timestamp with time zone,
    "moderated_by" "uuid",
    "brewery_size" "text" DEFAULT 'garage'::"text",
    CONSTRAINT "breweries_brewery_size_check" CHECK (("brewery_size" = ANY (ARRAY['garage'::"text", 'micro'::"text", 'craft'::"text", 'industrial'::"text"]))),
    CONSTRAINT "breweries_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "breweries_tier_check" CHECK (("tier" = ANY (ARRAY['garage'::"text", 'micro'::"text", 'craft'::"text", 'industrial'::"text"])))
);


ALTER TABLE "public"."breweries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."breweries"."tier" IS 'Brewery tier level (garage/micro/craft/industrial)';



COMMENT ON COLUMN "public"."breweries"."custom_slogan" IS 'Team-defined slogan for Smart Labels (Premium feature)';



COMMENT ON COLUMN "public"."breweries"."brewery_size" IS 'Brauerei-Größen-Tier: garage < micro < craft < industrial.
   Migriert von breweries.tier. breweries.tier bleibt vorerst für Rückwärtskompatibilität.';



CREATE TABLE IF NOT EXISTS "public"."brewery_feed" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brewery_feed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brewery_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "preferences" "jsonb" DEFAULT '{"notifications": {"email_new_brew": true, "email_new_rating": true, "email_new_message": true}}'::"jsonb"
);


ALTER TABLE "public"."brewery_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brewery_saved_brews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."brewery_saved_brews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brewery_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "botlguide_voice_config" "jsonb" DEFAULT '{}'::"jsonb",
    "botlguide_enabled" boolean DEFAULT true NOT NULL,
    "sop_upload_enabled" boolean DEFAULT true NOT NULL,
    "max_documents" integer DEFAULT 10 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brewery_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."brewery_settings" IS 'Per-brewery BotlGuide configuration: custom brand voice, document limits, feature toggles.';



CREATE TABLE IF NOT EXISTS "public"."brewing_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid",
    "brewery_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "brewed_at" "date" DEFAULT CURRENT_DATE,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'planning'::"text",
    "phase" "text" DEFAULT 'planning'::"text",
    "batch_code" "text",
    "timeline" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "measurements" "jsonb" DEFAULT '{}'::"jsonb",
    "current_gravity" numeric,
    "apparent_attenuation" numeric,
    "session_type" "text" DEFAULT 'full'::"text" NOT NULL,
    "measured_og" numeric,
    "measured_fg" numeric,
    "measured_abv" numeric,
    "measure_volume" numeric,
    "measured_efficiency" numeric,
    "carbonation_level" numeric,
    "target_og" numeric,
    CONSTRAINT "brewing_sessions_session_type_check" CHECK (("session_type" = ANY (ARRAY['full'::"text", 'quick'::"text"])))
);


ALTER TABLE "public"."brewing_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."brewing_sessions"."session_type" IS 'Session creation mode: full (complete LogBook with all phases) or quick (skip to conditioning, minimal data)';



CREATE TABLE IF NOT EXISTS "public"."btb_used_nonces" (
    "nonce" "text" NOT NULL,
    "bottle_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "user_id" "uuid",
    "ip_hash" "text"
);


ALTER TABLE "public"."btb_used_nonces" OWNER TO "postgres";


COMMENT ON TABLE "public"."btb_used_nonces" IS 'Anti-Replay Nonces für Beat the Brewer. Jeder QR-Token wird pro Sud/Flasche/Rezept einmalig verbrannt. BTB ist zusätzlich limitiert auf 1x pro User pro Session.';



CREATE TABLE IF NOT EXISTS "public"."collected_caps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "brew_id" "uuid",
    "collected_at" timestamp with time zone DEFAULT "now"(),
    "rating_id" "uuid",
    "claimed_via" "text" DEFAULT 'scan'::"text",
    "cap_tier" "text" DEFAULT 'zinc'::"text" NOT NULL,
    CONSTRAINT "collected_caps_cap_tier_check" CHECK (("cap_tier" = ANY (ARRAY['gold'::"text", 'silver'::"text", 'bronze'::"text", 'zinc'::"text"])))
);


ALTER TABLE "public"."collected_caps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."collected_caps"."cap_tier" IS 'Rarity tier rolled at collection time. gold=0.5%, silver=4.5%, bronze=15%, zinc=80%.';



CREATE TABLE IF NOT EXISTS "public"."content_appeals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_id" "uuid",
    "target_type" "text" NOT NULL,
    "target_title" "text",
    "moderation_reason" "text",
    "appeal_text" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_response" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_appeals_appeal_text_check" CHECK (("length"("appeal_text") >= 10)),
    CONSTRAINT "content_appeals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."content_appeals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enterprise_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "max_uses" integer DEFAULT 1,
    "current_uses" integer DEFAULT 0,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."enterprise_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."enterprise_codes" IS 'One-time or multi-use codes to grant Enterprise tier status.';



CREATE TABLE IF NOT EXISTS "public"."equipment_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "brew_method" "text" DEFAULT 'all_grain'::"text" NOT NULL,
    "batch_volume_l" numeric(6,2) DEFAULT 20 NOT NULL,
    "boil_off_rate" numeric(5,3) DEFAULT 3.5 NOT NULL,
    "trub_loss" numeric(5,3) DEFAULT 0.5 NOT NULL,
    "grain_absorption" numeric(5,3) DEFAULT 0.96 NOT NULL,
    "cooling_shrinkage" numeric(5,4) DEFAULT 0.04 NOT NULL,
    "mash_thickness" numeric(5,3) DEFAULT 3.5 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_efficiency" numeric(5,2) DEFAULT 75.0 NOT NULL,
    CONSTRAINT "equipment_profiles_brew_method_check" CHECK (("brew_method" = ANY (ARRAY['all_grain'::"text", 'extract'::"text", 'biab'::"text"])))
);


ALTER TABLE "public"."equipment_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."equipment_profiles"."default_efficiency" IS 'Typische Sudhausausbeute dieser Anlage in Prozent (z.B. 72.0). Wird als Vorschlagswert im BrewEditor und bei neuen Sessions verwendet.';



CREATE TABLE IF NOT EXISTS "public"."forum_bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "forum_bookmarks_target_type_check" CHECK (("target_type" = ANY (ARRAY['thread'::"text", 'post'::"text"])))
);


ALTER TABLE "public"."forum_bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."forum_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_poll_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "forum_poll_options_label_check" CHECK ((("char_length"("label") >= 1) AND ("char_length"("label") <= 100)))
);


ALTER TABLE "public"."forum_poll_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_poll_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "option_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."forum_poll_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_polls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "multiple_choice" boolean DEFAULT false NOT NULL,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "forum_polls_question_check" CHECK ((("char_length"("question") >= 3) AND ("char_length"("question") <= 200)))
);


ALTER TABLE "public"."forum_polls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "parent_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "search_vector" "tsvector",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."forum_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."forum_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "brew_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "reply_count" integer DEFAULT 0,
    "last_reply_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_solved" boolean DEFAULT false,
    "search_vector" "tsvector",
    "deleted_at" timestamp with time zone,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "thread_type" "text" DEFAULT 'discussion'::"text" NOT NULL,
    CONSTRAINT "forum_threads_title_check" CHECK (("length"("title") >= 5))
);


ALTER TABLE "public"."forum_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "forum_votes_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['prost'::"text", 'hilfreich'::"text", 'feuer'::"text"]))),
    CONSTRAINT "forum_votes_target_type_check" CHECK (("target_type" = ANY (ARRAY['thread'::"text", 'post'::"text"])))
);


ALTER TABLE "public"."forum_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."label_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "format_id" "text" DEFAULT '6137'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."label_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "brew_id" "uuid",
    CONSTRAINT "likes_entity_check" CHECK (("brew_id" IS NOT NULL))
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "founded_year" integer,
    "location" "text",
    "bio" "text",
    "website" "text",
    "updated_at" timestamp with time zone,
    "logo_url" "text",
    "banner_url" "text",
    "total_bottle_fills" integer DEFAULT 0,
    "total_profile_views" integer DEFAULT 0,
    "achievements" "jsonb" DEFAULT '[]'::"jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text",
    "active_brewery_id" "uuid",
    "analytics_opt_out" boolean DEFAULT false,
    "subscription_tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "subscription_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "subscription_started_at" timestamp with time zone DEFAULT "now"(),
    "subscription_expires_at" timestamp with time zone,
    "ai_credits_used_this_month" integer DEFAULT 0 NOT NULL,
    "ai_credits_reset_at" timestamp with time zone DEFAULT "date_trunc"('month'::"text", ("now"() + '1 mon'::interval)) NOT NULL,
    "custom_brewery_slogan" "text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "birthdate" "date",
    "app_mode" "text" DEFAULT 'drinker'::"text" NOT NULL,
    "tasting_iq" integer DEFAULT 0 NOT NULL,
    "pending_avatar_url" "text",
    CONSTRAINT "profiles_app_mode_check" CHECK (("app_mode" = ANY (ARRAY['drinker'::"text", 'brewer'::"text"]))),
    CONSTRAINT "profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text", 'trial'::"text", 'paused'::"text"]))),
    CONSTRAINT "profiles_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'brewer'::"text", 'brewery'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."analytics_opt_out" IS 'If true, user data is excluded from internal analytics (Opt-Out via Dashboard)';



COMMENT ON COLUMN "public"."profiles"."subscription_tier" IS 'User subscription level (free/brewer/brewery/enterprise). Default: enterprise for development.';



COMMENT ON COLUMN "public"."profiles"."subscription_status" IS 'Current subscription status (active/cancelled/expired/trial/paused)';



COMMENT ON COLUMN "public"."profiles"."subscription_expires_at" IS 'When the subscription ends. NULL = lifetime/no expiry.';



COMMENT ON COLUMN "public"."profiles"."ai_credits_used_this_month" IS 'Counter for AI generations this billing period';



COMMENT ON COLUMN "public"."profiles"."ai_credits_reset_at" IS 'Next reset date for AI credits counter';



COMMENT ON COLUMN "public"."profiles"."custom_brewery_slogan" IS 'User-defined slogan for Smart Labels (Premium feature)';



COMMENT ON COLUMN "public"."profiles"."stripe_customer_id" IS 'Stripe Customer ID for payment processing (future)';



COMMENT ON COLUMN "public"."profiles"."stripe_subscription_id" IS 'Stripe Subscription ID (future)';



COMMENT ON COLUMN "public"."profiles"."birthdate" IS 'User birthdate (nullable). Stored as date.';



COMMENT ON COLUMN "public"."profiles"."app_mode" IS 'Bestimmt die primäre UI-Experience:
   drinker = Consumer/My-Cellar-Welt (Default für alle neuen User)
   brewer  = Brauer/Team-Dashboard-Welt
   Upgrade von drinker → brewer erfolgt automatisch via Trigger bei Brewery-Beitritt.
   Downgrade ist nicht möglich (Brauer-Daten würden verwaisen).';



COMMENT ON COLUMN "public"."profiles"."tasting_iq" IS 'Kontinuierlicher Consumer-Kompetenz-Score.
   Wächst mit jedem Beat-the-Brewer-Match, Rating und Vibe-Check.
   Basis für Leaderboards (Analytics Phase 11). Kein Level-Cap.
   Detailhistorie in tasting_score_events.
   Unabhängig von user_achievements (One-Shot-Badges bleiben dort).';



CREATE TABLE IF NOT EXISTS "public"."rating_used_nonces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nonce" "text" NOT NULL,
    "bottle_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "ip_hash" "text"
);


ALTER TABLE "public"."rating_used_nonces" OWNER TO "postgres";


COMMENT ON TABLE "public"."rating_used_nonces" IS 'Anti-Replay Nonces für Ratings. Jeder QR-Token wird pro Sud/Flasche/Rezept einmalig verbrannt. Bewertung zusätzlich limitiert auf 1x pro User pro Rezept.';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "target_type" "public"."report_target_type" NOT NULL,
    "reason" "public"."report_reason" NOT NULL,
    "details" "text",
    "status" "public"."report_status" DEFAULT 'open'::"public"."report_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scan_event_members" (
    "event_id" "uuid" NOT NULL,
    "scan_id" "uuid" NOT NULL
);


ALTER TABLE "public"."scan_event_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scan_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_start" timestamp with time zone NOT NULL,
    "event_end" timestamp with time zone NOT NULL,
    "center_lat" numeric(10,7) NOT NULL,
    "center_lng" numeric(10,7) NOT NULL,
    "radius_m" integer,
    "city" "text",
    "country_code" "text",
    "total_scans" integer NOT NULL,
    "unique_sessions" integer NOT NULL,
    "unique_brews" integer NOT NULL,
    "breweries" "uuid"[],
    "brew_ids" "uuid"[],
    "event_type" "text" DEFAULT 'unknown'::"text",
    "confidence" numeric(3,2) DEFAULT 0.50,
    "brewer_label" "text",
    "brewer_notes" "text"
);


ALTER TABLE "public"."scan_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scan_intent_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "predicted_intent" "text" NOT NULL,
    "predicted_probability" numeric(3,2) NOT NULL,
    "actual_drinking" boolean NOT NULL,
    "context_features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sampling_rate" numeric(3,2),
    "sampling_reason" "text",
    "prediction_correct" boolean,
    "error_type" "text"
);


ALTER TABLE "public"."scan_intent_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "subscription_tier" "text" NOT NULL,
    "subscription_status" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_reason" "text",
    "previous_tier" "text",
    "stripe_event_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."subscription_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscription_history" IS 'Audit log for subscription tier changes';



CREATE TABLE IF NOT EXISTS "public"."tasting_score_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "brew_id" "uuid",
    "points_delta" integer NOT NULL,
    "match_score" numeric(5,2),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    "bottle_id" "uuid",
    "session_token" "text",
    "ip_hash" "text",
    "bottle_scan_id" "uuid",
    CONSTRAINT "tasting_score_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['beat_the_brewer'::"text", 'rating_given'::"text", 'vibe_check'::"text", 'bonus'::"text", 'correction'::"text"])))
);


ALTER TABLE "public"."tasting_score_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasting_score_events" IS 'Audit-Log aller Tasting-IQ-Änderungen. Single Source of Truth für Reberechnungen.
   Ermöglicht History-View in /my-cellar/taste-dna und zukünftige Anomalie-Korrekturen.
   Punkte-Richtwerte:
     beat_the_brewer: ROUND(match_score * 10) => 0–100 Pkt
     rating_given:    5 Pkt (max 1x pro Brew)
     vibe_check:      3 Pkt (max 1x pro Brew)
     Kommentar ≥20Z:  5 Pkt Zusatz-Bonus';



COMMENT ON COLUMN "public"."tasting_score_events"."bottle_scan_id" IS 'FK to bottle_scans.id — links the tasting event to the QR scan that preceded it.';



CREATE TABLE IF NOT EXISTS "public"."team_knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size_bytes" integer DEFAULT 0 NOT NULL,
    "mime_type" "text" DEFAULT 'application/pdf'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "chunk_count" integer DEFAULT 0,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_knowledge_base" IS 'Uploaded SOP/manual documents per brewery for team-specific BotlGuide RAG.';



CREATE TABLE IF NOT EXISTS "public"."team_knowledge_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(768),
    "token_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_knowledge_chunks" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_knowledge_chunks" IS 'Chunked + embedded text fragments from team_knowledge_base for vector similarity search.';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_recommendations" (
    "user_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "score" double precision NOT NULL,
    "computed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stash" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "purchase_location" "text",
    "notes" "text",
    CONSTRAINT "user_stash_purchase_location_check" CHECK (("purchase_location" = ANY (ARRAY['supermarket'::"text", 'specialty_store'::"text", 'online'::"text", 'taproom'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."user_stash" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vibe_check_used_nonces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nonce" "text" NOT NULL,
    "bottle_id" "uuid" NOT NULL,
    "brew_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "ip_hash" "text"
);


ALTER TABLE "public"."vibe_check_used_nonces" OWNER TO "postgres";


COMMENT ON TABLE "public"."vibe_check_used_nonces" IS 'Anti-Replay Nonces für VibeCheck. Jeder QR-Token wird pro Sud/Flasche/Rezept einmalig verbrannt.';



ALTER TABLE ONLY "public"."admin_users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."admin_users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_admin_audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_admin_audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_alert_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_alert_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_alert_rules" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_alert_rules_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_brewery_daily" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_brewery_daily_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_content_daily" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_content_daily_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_feature_usage" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_feature_usage_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_system_hourly" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_system_hourly_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analytics_user_daily" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analytics_user_daily_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bottles" ALTER COLUMN "bottle_number" SET DEFAULT "nextval"('"public"."bottles_bottle_number_seq"'::"regclass");



ALTER TABLE ONLY "private_system"."secrets"
    ADD CONSTRAINT "secrets_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_profile_id_key" UNIQUE ("profile_id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_admin_audit_logs"
    ADD CONSTRAINT "analytics_admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_ai_insights"
    ADD CONSTRAINT "analytics_ai_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_alert_history"
    ADD CONSTRAINT "analytics_alert_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_alert_rules"
    ADD CONSTRAINT "analytics_alert_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_brewery_daily"
    ADD CONSTRAINT "analytics_brewery_daily_brewery_id_date_key" UNIQUE ("brewery_id", "date");



ALTER TABLE ONLY "public"."analytics_brewery_daily"
    ADD CONSTRAINT "analytics_brewery_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_cohorts"
    ADD CONSTRAINT "analytics_cohorts_pkey" PRIMARY KEY ("cohort_id");



ALTER TABLE ONLY "public"."analytics_content_daily"
    ADD CONSTRAINT "analytics_content_daily_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."analytics_content_daily"
    ADD CONSTRAINT "analytics_content_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_feature_usage"
    ADD CONSTRAINT "analytics_feature_usage_feature_date_key" UNIQUE ("feature", "date");



ALTER TABLE ONLY "public"."analytics_feature_usage"
    ADD CONSTRAINT "analytics_feature_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_report_logs"
    ADD CONSTRAINT "analytics_report_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_report_settings"
    ADD CONSTRAINT "analytics_report_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_report_settings"
    ADD CONSTRAINT "analytics_report_settings_user_id_brewery_id_key" UNIQUE ("user_id", "brewery_id");



ALTER TABLE ONLY "public"."analytics_system_hourly"
    ADD CONSTRAINT "analytics_system_hourly_date_hour_key" UNIQUE ("date", "hour");



ALTER TABLE ONLY "public"."analytics_system_hourly"
    ADD CONSTRAINT "analytics_system_hourly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_user_daily"
    ADD CONSTRAINT "analytics_user_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_user_daily"
    ADD CONSTRAINT "analytics_user_daily_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."beat_friend_challenges"
    ADD CONSTRAINT "beat_friend_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beat_friend_challenges"
    ADD CONSTRAINT "beat_friend_challenges_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."botlguide_audit_log"
    ADD CONSTRAINT "botlguide_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."botlguide_embeddings"
    ADD CONSTRAINT "botlguide_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."botlguide_feedback"
    ADD CONSTRAINT "botlguide_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."botlguide_insights"
    ADD CONSTRAINT "botlguide_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bottle_scans"
    ADD CONSTRAINT "bottle_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bounty_claims"
    ADD CONSTRAINT "bounty_claims_bounty_id_user_id_key" UNIQUE ("bounty_id", "user_id");



ALTER TABLE ONLY "public"."bounty_claims"
    ADD CONSTRAINT "bounty_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brew_measurements"
    ADD CONSTRAINT "brew_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brew_views"
    ADD CONSTRAINT "brew_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brewer_bounties"
    ADD CONSTRAINT "brewer_bounties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breweries"
    ADD CONSTRAINT "breweries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breweries"
    ADD CONSTRAINT "breweries_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."brewery_feed"
    ADD CONSTRAINT "brewery_feed_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_brewery_id_user_id_key" UNIQUE ("brewery_id", "user_id");



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brewery_saved_brews"
    ADD CONSTRAINT "brewery_saved_brews_brewery_id_brew_id_key" UNIQUE ("brewery_id", "brew_id");



ALTER TABLE ONLY "public"."brewery_saved_brews"
    ADD CONSTRAINT "brewery_saved_brews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brewery_settings"
    ADD CONSTRAINT "brewery_settings_brewery_id_key" UNIQUE ("brewery_id");



ALTER TABLE ONLY "public"."brewery_settings"
    ADD CONSTRAINT "brewery_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brewing_sessions"
    ADD CONSTRAINT "brewing_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."btb_used_nonces"
    ADD CONSTRAINT "btb_used_nonces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_user_id_brew_id_key" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."content_appeals"
    ADD CONSTRAINT "content_appeals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enterprise_codes"
    ADD CONSTRAINT "enterprise_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."enterprise_codes"
    ADD CONSTRAINT "enterprise_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_profiles"
    ADD CONSTRAINT "equipment_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flavor_profiles"
    ADD CONSTRAINT "flavor_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_bookmarks"
    ADD CONSTRAINT "forum_bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_bookmarks"
    ADD CONSTRAINT "forum_bookmarks_user_id_target_id_key" UNIQUE ("user_id", "target_id");



ALTER TABLE ONLY "public"."forum_categories"
    ADD CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_categories"
    ADD CONSTRAINT "forum_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."forum_poll_options"
    ADD CONSTRAINT "forum_poll_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_poll_votes"
    ADD CONSTRAINT "forum_poll_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_poll_votes"
    ADD CONSTRAINT "forum_poll_votes_user_option_unique" UNIQUE ("option_id", "user_id");



ALTER TABLE ONLY "public"."forum_polls"
    ADD CONSTRAINT "forum_polls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_polls"
    ADD CONSTRAINT "forum_polls_thread_unique" UNIQUE ("thread_id");



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_subscriptions"
    ADD CONSTRAINT "forum_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_subscriptions"
    ADD CONSTRAINT "forum_subscriptions_user_thread_unique" UNIQUE ("user_id", "thread_id");



ALTER TABLE ONLY "public"."forum_threads"
    ADD CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_votes"
    ADD CONSTRAINT "forum_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_votes"
    ADD CONSTRAINT "forum_votes_unique" UNIQUE ("target_id", "user_id", "reaction_type");



ALTER TABLE ONLY "public"."label_templates"
    ADD CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_brew_unique" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."rating_used_nonces"
    ADD CONSTRAINT "rating_used_nonces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scan_event_members"
    ADD CONSTRAINT "scan_event_members_pkey" PRIMARY KEY ("event_id", "scan_id");



ALTER TABLE ONLY "public"."scan_events"
    ADD CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scan_intent_feedback"
    ADD CONSTRAINT "scan_intent_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasting_score_events"
    ADD CONSTRAINT "tasting_score_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_knowledge_base"
    ADD CONSTRAINT "team_knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_knowledge_chunks"
    ADD CONSTRAINT "team_knowledge_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "unique_user_brew_like" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_recommendations"
    ADD CONSTRAINT "user_recommendations_pkey" PRIMARY KEY ("user_id", "brew_id");



ALTER TABLE ONLY "public"."user_stash"
    ADD CONSTRAINT "user_stash_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stash"
    ADD CONSTRAINT "user_stash_user_id_brew_id_key" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."vibe_check_used_nonces"
    ADD CONSTRAINT "vibe_check_used_nonces_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "analytics_daily_stats_conflict_idx" ON "public"."analytics_daily_stats" USING "btree" ("date", "brewery_id", COALESCE("brew_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("country_code", ''::"text"), COALESCE("device_type", ''::"text"));



CREATE INDEX "botlguide_embeddings_source_type_idx" ON "public"."botlguide_embeddings" USING "btree" ("source_type");



CREATE UNIQUE INDEX "botlguide_embeddings_unique_idx" ON "public"."botlguide_embeddings" USING "btree" ("source_type", "source_id", "user_id") NULLS NOT DISTINCT;



CREATE INDEX "botlguide_embeddings_user_id_idx" ON "public"."botlguide_embeddings" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "botlguide_insights_user_id_idx" ON "public"."botlguide_insights" USING "btree" ("user_id", "dismissed", "created_at" DESC);



CREATE INDEX "bottle_scans_referrer_domain_idx" ON "public"."bottle_scans" USING "btree" ("brewery_id", "referrer_domain") WHERE ("referrer_domain" IS NOT NULL);



CREATE INDEX "bottle_scans_scan_source_idx" ON "public"."bottle_scans" USING "btree" ("brewery_id", "scan_source") WHERE ("scan_source" IS NOT NULL);



CREATE INDEX "bottle_scans_weather_pending_idx" ON "public"."bottle_scans" USING "btree" ("created_at") WHERE (("weather_fetched_at" IS NULL) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE UNIQUE INDEX "bottles_short_code_idx" ON "public"."bottles" USING "btree" ("short_code");



CREATE UNIQUE INDEX "brew_style_averages_style_idx" ON "public"."brew_style_averages" USING "btree" ("style_normalized");



CREATE UNIQUE INDEX "brew_style_flavor_averages_style_idx" ON "public"."brew_style_flavor_averages" USING "btree" ("style_normalized");



CREATE INDEX "brew_views_brew" ON "public"."brew_views" USING "btree" ("brew_id");



CREATE INDEX "brew_views_user_brew" ON "public"."brew_views" USING "btree" ("user_id", "brew_id");



CREATE INDEX "brew_views_user_time" ON "public"."brew_views" USING "btree" ("user_id", "viewed_at" DESC);



CREATE UNIQUE INDEX "breweries_invite_code_idx" ON "public"."breweries" USING "btree" ("invite_code");



CREATE INDEX "brews_abv_calculated_idx" ON "public"."brews" USING "btree" ("abv_calculated") WHERE ("abv_calculated" IS NOT NULL);



CREATE INDEX "brews_data_abv_num_idx" ON "public"."brews" USING "btree" (((("data" ->> 'abv'::"text"))::numeric)) WHERE ("data" ? 'abv'::"text");



CREATE INDEX "brews_data_gin_idx" ON "public"."brews" USING "gin" ("data");



CREATE INDEX "brews_data_ibu_num_idx" ON "public"."brews" USING "btree" (((("data" ->> 'ibu'::"text"))::numeric)) WHERE (("brew_type" = 'beer'::"text") AND ("data" ? 'ibu'::"text"));



CREATE INDEX "brews_ibu_calculated_idx" ON "public"."brews" USING "btree" ("ibu_calculated") WHERE ("ibu_calculated" IS NOT NULL);



CREATE INDEX "content_appeals_status_idx" ON "public"."content_appeals" USING "btree" ("status");



CREATE INDEX "content_appeals_user_idx" ON "public"."content_appeals" USING "btree" ("user_id");



CREATE INDEX "equipment_profiles_brewery_idx" ON "public"."equipment_profiles" USING "btree" ("brewery_id");



CREATE UNIQUE INDEX "equipment_profiles_one_default" ON "public"."equipment_profiles" USING "btree" ("brewery_id") WHERE ("is_default" = true);



CREATE INDEX "forum_posts_search_idx" ON "public"."forum_posts" USING "gin" ("search_vector");



CREATE INDEX "forum_threads_search_idx" ON "public"."forum_threads" USING "gin" ("search_vector");



CREATE INDEX "forum_votes_target_idx" ON "public"."forum_votes" USING "btree" ("target_id", "reaction_type");



CREATE INDEX "forum_votes_user_idx" ON "public"."forum_votes" USING "btree" ("user_id", "target_id");



CREATE INDEX "idx_admin_users_active" ON "public"."admin_users" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_admin_users_email" ON "public"."admin_users" USING "btree" ("email");



CREATE INDEX "idx_ai_usage_date" ON "public"."ai_usage_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_usage_retention" ON "public"."ai_usage_logs" USING "btree" ("created_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ai_usage_type" ON "public"."ai_usage_logs" USING "btree" ("generation_type");



CREATE INDEX "idx_ai_usage_user" ON "public"."ai_usage_logs" USING "btree" ("user_id");



CREATE INDEX "idx_alert_history_rule" ON "public"."analytics_alert_history" USING "btree" ("rule_id");



CREATE INDEX "idx_alert_history_triggered" ON "public"."analytics_alert_history" USING "btree" ("triggered_at" DESC);



CREATE INDEX "idx_alert_history_unresolved" ON "public"."analytics_alert_history" USING "btree" ("resolved_at") WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_alert_rules_enabled" ON "public"."analytics_alert_rules" USING "btree" ("enabled");



CREATE INDEX "idx_analytics_alert_history_ack_by" ON "public"."analytics_alert_history" USING "btree" ("acknowledged_by");



CREATE INDEX "idx_analytics_brew" ON "public"."analytics_daily_stats" USING "btree" ("brew_id") WHERE ("brew_id" IS NOT NULL);



CREATE INDEX "idx_analytics_category" ON "public"."analytics_events" USING "btree" ("category");



CREATE INDEX "idx_analytics_created_at" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_read" ON "public"."analytics_daily_stats" USING "btree" ("brewery_id", "date" DESC);



CREATE INDEX "idx_analytics_report_logs_setting_id" ON "public"."analytics_report_logs" USING "btree" ("report_setting_id");



CREATE INDEX "idx_analytics_report_logs_top_brew_id" ON "public"."analytics_report_logs" USING "btree" ("top_brew_id");



CREATE INDEX "idx_analytics_report_settings_brewery_id" ON "public"."analytics_report_settings" USING "btree" ("brewery_id");



CREATE INDEX "idx_analytics_reports_due" ON "public"."analytics_report_settings" USING "btree" ("enabled", "frequency", "send_day") WHERE ("enabled" = true);



CREATE INDEX "idx_analytics_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_audit_log_brewery" ON "public"."botlguide_audit_log" USING "btree" ("brewery_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_capability" ON "public"."botlguide_audit_log" USING "btree" ("capability", "created_at" DESC);



CREATE INDEX "idx_audit_log_created" ON "public"."botlguide_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_user" ON "public"."botlguide_audit_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_action" ON "public"."analytics_admin_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_admin" ON "public"."analytics_admin_audit_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_audit_logs_created" ON "public"."analytics_admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bfc_brew" ON "public"."beat_friend_challenges" USING "btree" ("brew_id");



CREATE INDEX "idx_bfc_challenger" ON "public"."beat_friend_challenges" USING "btree" ("challenger_id");



CREATE INDEX "idx_bfc_token" ON "public"."beat_friend_challenges" USING "btree" ("token");



CREATE INDEX "idx_botlguide_feedback_user_capability" ON "public"."botlguide_feedback" USING "btree" ("user_id", "capability") WHERE ("capability" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_aggregation" ON "public"."bottle_scans" USING "btree" ("brewery_id", "created_at" DESC);



CREATE INDEX "idx_bottle_scans_bottle" ON "public"."bottle_scans" USING "btree" ("bottle_id");



CREATE INDEX "idx_bottle_scans_brew" ON "public"."bottle_scans" USING "btree" ("brew_id") WHERE ("brew_id" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_conversion" ON "public"."bottle_scans" USING "btree" ("brewery_id", "converted_to_rating");



CREATE INDEX "idx_bottle_scans_detected_city" ON "public"."bottle_scans" USING "btree" ("brewery_id", "detected_city") WHERE ("detected_city" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_geo" ON "public"."bottle_scans" USING "btree" ("brewery_id", "latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_bottle_scans_geo_source" ON "public"."bottle_scans" USING "btree" ("geo_source") WHERE ("geo_source" = 'gps_snapped_h3'::"text");



CREATE INDEX "idx_bottle_scans_geom" ON "public"."bottle_scans" USING "gist" ("geom");



CREATE INDEX "idx_bottle_scans_intent_null" ON "public"."bottle_scans" USING "btree" ("created_at") WHERE ("scan_intent" IS NULL);



CREATE INDEX "idx_bottle_scans_session" ON "public"."bottle_scans" USING "btree" ("session_hash") WHERE ("session_hash" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_time_analysis" ON "public"."bottle_scans" USING "btree" ("brewery_id", "scanned_at_hour") WHERE ("scanned_at_hour" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_unique_visitor" ON "public"."bottle_scans" USING "btree" ("brewery_id", "session_hash", "created_at");



CREATE INDEX "idx_bottle_scans_viewer_id" ON "public"."bottle_scans" USING "btree" ("viewer_user_id");



CREATE INDEX "idx_bottles_brew_id" ON "public"."bottles" USING "btree" ("brew_id");



CREATE INDEX "idx_bottles_brewery_id" ON "public"."bottles" USING "btree" ("brewery_id");



CREATE INDEX "idx_bottles_session_id" ON "public"."bottles" USING "btree" ("session_id");



CREATE INDEX "idx_bottles_user_id" ON "public"."bottles" USING "btree" ("user_id");



CREATE INDEX "idx_bounty_claims_bounty" ON "public"."bounty_claims" USING "btree" ("bounty_id");



CREATE INDEX "idx_bounty_claims_user" ON "public"."bounty_claims" USING "btree" ("user_id");



CREATE INDEX "idx_brewer_bounties_active" ON "public"."brewer_bounties" USING "btree" ("is_active", "expires_at");



CREATE INDEX "idx_brewer_bounties_brew" ON "public"."brewer_bounties" USING "btree" ("brew_id");



CREATE INDEX "idx_brewer_bounties_brewery" ON "public"."brewer_bounties" USING "btree" ("brewery_id");



CREATE INDEX "idx_breweries_tier" ON "public"."breweries" USING "btree" ("tier");



CREATE INDEX "idx_brewery_daily_brewery" ON "public"."analytics_brewery_daily" USING "btree" ("brewery_id");



CREATE INDEX "idx_brewery_daily_brewery_date" ON "public"."analytics_brewery_daily" USING "btree" ("brewery_id", "date" DESC);



CREATE INDEX "idx_brewery_daily_date" ON "public"."analytics_brewery_daily" USING "btree" ("date");



CREATE INDEX "idx_brewery_feed_brewery_id" ON "public"."brewery_feed" USING "btree" ("brewery_id");



CREATE INDEX "idx_brewery_feed_user_id" ON "public"."brewery_feed" USING "btree" ("user_id");



CREATE INDEX "idx_brewery_members_user_id" ON "public"."brewery_members" USING "btree" ("user_id");



CREATE INDEX "idx_brewery_saved_brews_brew_id" ON "public"."brewery_saved_brews" USING "btree" ("brew_id");



CREATE INDEX "idx_brewery_saved_brews_created_by" ON "public"."brewery_saved_brews" USING "btree" ("created_by");



CREATE INDEX "idx_brewery_settings_brewery" ON "public"."brewery_settings" USING "btree" ("brewery_id");



CREATE INDEX "idx_brewing_sessions_brew_id" ON "public"."brewing_sessions" USING "btree" ("brew_id");



CREATE INDEX "idx_brewing_sessions_brewery_id" ON "public"."brewing_sessions" USING "btree" ("brewery_id");



CREATE INDEX "idx_brews_abv" ON "public"."brews" USING "btree" ("abv") WHERE (("abv" IS NOT NULL) AND ("is_public" = true));



CREATE INDEX "idx_brews_brewery_id" ON "public"."brews" USING "btree" ("brewery_id");



CREATE INDEX "idx_brews_copy_count" ON "public"."brews" USING "btree" ("copy_count" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_brews_featured" ON "public"."brews" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_brews_fermentation_type" ON "public"."brews" USING "btree" ("fermentation_type") WHERE (("is_public" = true) AND ("fermentation_type" IS NOT NULL));



CREATE INDEX "idx_brews_has_flavor_profile" ON "public"."brews" USING "btree" ((("flavor_profile" IS NOT NULL))) WHERE ("flavor_profile" IS NOT NULL);



CREATE INDEX "idx_brews_ibu" ON "public"."brews" USING "btree" ("ibu") WHERE (("ibu" IS NOT NULL) AND ("is_public" = true));



CREATE INDEX "idx_brews_mash_method" ON "public"."brews" USING "btree" ("mash_method") WHERE (("is_public" = true) AND ("mash_method" IS NOT NULL));



CREATE INDEX "idx_brews_moderated_by" ON "public"."brews" USING "btree" ("moderated_by");



CREATE INDEX "idx_brews_public" ON "public"."brews" USING "btree" ("is_public", "user_id") WHERE ("is_public" = true);



CREATE INDEX "idx_brews_public_style" ON "public"."brews" USING "btree" ("is_public", "style") WHERE ("is_public" = true);



CREATE INDEX "idx_brews_quality_score" ON "public"."brews" USING "btree" ("quality_score" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_brews_remix_parent_id" ON "public"."brews" USING "btree" ("remix_parent_id");



CREATE INDEX "idx_brews_times_brewed" ON "public"."brews" USING "btree" ("times_brewed" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_brews_trending_score" ON "public"."brews" USING "btree" ("trending_score" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_brews_user_id" ON "public"."brews" USING "btree" ("user_id");



CREATE INDEX "idx_brews_view_count" ON "public"."brews" USING "btree" ("view_count" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_cohorts_id" ON "public"."analytics_cohorts" USING "btree" ("cohort_id" DESC);



CREATE INDEX "idx_collected_caps_brew_id" ON "public"."collected_caps" USING "btree" ("brew_id");



CREATE INDEX "idx_collected_caps_rating_id" ON "public"."collected_caps" USING "btree" ("rating_id");



CREATE UNIQUE INDEX "idx_collected_caps_rating_unique" ON "public"."collected_caps" USING "btree" ("user_id", "brew_id") WHERE ("claimed_via" = 'rating'::"text");



CREATE INDEX "idx_content_daily_date" ON "public"."analytics_content_daily" USING "btree" ("date" DESC);



CREATE INDEX "idx_enterprise_codes_created_by" ON "public"."enterprise_codes" USING "btree" ("created_by");



CREATE INDEX "idx_feature_usage_date" ON "public"."analytics_feature_usage" USING "btree" ("date" DESC);



CREATE INDEX "idx_feature_usage_feature" ON "public"."analytics_feature_usage" USING "btree" ("feature");



CREATE INDEX "idx_feature_usage_feature_date" ON "public"."analytics_feature_usage" USING "btree" ("feature", "date" DESC);



CREATE INDEX "idx_feedback_intent" ON "public"."scan_intent_feedback" USING "btree" ("predicted_intent", "actual_drinking");



CREATE UNIQUE INDEX "idx_feedback_scan" ON "public"."scan_intent_feedback" USING "btree" ("scan_id");



CREATE INDEX "idx_feedback_time" ON "public"."scan_intent_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_flavor_profiles_brew_id" ON "public"."flavor_profiles" USING "btree" ("brew_id");



CREATE INDEX "idx_flavor_profiles_rating_id" ON "public"."flavor_profiles" USING "btree" ("rating_id") WHERE ("rating_id" IS NOT NULL);



CREATE INDEX "idx_flavor_profiles_session_id" ON "public"."flavor_profiles" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_flavor_profiles_user_id" ON "public"."flavor_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_forum_bookmarks_target" ON "public"."forum_bookmarks" USING "btree" ("target_id");



CREATE INDEX "idx_forum_bookmarks_user" ON "public"."forum_bookmarks" USING "btree" ("user_id");



CREATE INDEX "idx_forum_poll_options_poll" ON "public"."forum_poll_options" USING "btree" ("poll_id");



CREATE INDEX "idx_forum_poll_votes_option" ON "public"."forum_poll_votes" USING "btree" ("option_id");



CREATE INDEX "idx_forum_poll_votes_user" ON "public"."forum_poll_votes" USING "btree" ("user_id");



CREATE INDEX "idx_forum_polls_thread" ON "public"."forum_polls" USING "btree" ("thread_id");



CREATE INDEX "idx_forum_posts_author_id" ON "public"."forum_posts" USING "btree" ("author_id");



CREATE INDEX "idx_forum_posts_parent_id" ON "public"."forum_posts" USING "btree" ("parent_id");



CREATE INDEX "idx_forum_posts_thread_id" ON "public"."forum_posts" USING "btree" ("thread_id");



CREATE INDEX "idx_forum_subscriptions_thread" ON "public"."forum_subscriptions" USING "btree" ("thread_id");



CREATE INDEX "idx_forum_subscriptions_user" ON "public"."forum_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_forum_threads_author_id" ON "public"."forum_threads" USING "btree" ("author_id");



CREATE UNIQUE INDEX "idx_forum_threads_brew_comments" ON "public"."forum_threads" USING "btree" ("brew_id") WHERE ("thread_type" = 'brew_comments'::"text");



CREATE INDEX "idx_forum_threads_brew_id" ON "public"."forum_threads" USING "btree" ("brew_id");



CREATE INDEX "idx_forum_threads_category_id" ON "public"."forum_threads" USING "btree" ("category_id");



CREATE INDEX "idx_forum_threads_is_solved" ON "public"."forum_threads" USING "btree" ("is_solved") WHERE ("is_solved" = true);



CREATE INDEX "idx_forum_threads_tags" ON "public"."forum_threads" USING "gin" ("tags");



CREATE INDEX "idx_insights_brewery" ON "public"."analytics_ai_insights" USING "btree" ("brewery_id", "created_at" DESC);



CREATE INDEX "idx_insights_unread" ON "public"."analytics_ai_insights" USING "btree" ("brewery_id") WHERE (("is_read" = false) AND ("is_dismissed" = false));



CREATE INDEX "idx_label_templates_brewery_id" ON "public"."label_templates" USING "btree" ("brewery_id");



CREATE INDEX "idx_likes_brew_id" ON "public"."likes" USING "btree" ("brew_id");



CREATE INDEX "idx_likes_user_id" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "idx_measurements_session_id_time" ON "public"."brew_measurements" USING "btree" ("session_id", "measured_at");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_profiles_active_brewery_id" ON "public"."profiles" USING "btree" ("active_brewery_id");



CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_profiles_subscription_tier" ON "public"."profiles" USING "btree" ("subscription_tier");



CREATE INDEX "idx_profiles_tasting_iq" ON "public"."profiles" USING "btree" ("tasting_iq" DESC);



CREATE INDEX "idx_ratings_brew_taste" ON "public"."ratings" USING "btree" ("brew_id") WHERE ("taste_bitterness" IS NOT NULL);



CREATE INDEX "idx_ratings_flavor_tags" ON "public"."ratings" USING "gin" ("flavor_tags");



CREATE INDEX "idx_ratings_qr_verified" ON "public"."ratings" USING "btree" ("brew_id", "qr_verified") WHERE ("qr_verified" = true);



CREATE INDEX "idx_ratings_user_id" ON "public"."ratings" USING "btree" ("user_id");



CREATE INDEX "idx_ratings_user_rating" ON "public"."ratings" USING "btree" ("user_id", "rating") WHERE ("rating" >= 4);



CREATE INDEX "idx_report_logs_brewery_date" ON "public"."analytics_report_logs" USING "btree" ("brewery_id", "created_at" DESC);



CREATE INDEX "idx_reports_reporter_id" ON "public"."reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_reports_resolved_by" ON "public"."reports" USING "btree" ("resolved_by");



CREATE INDEX "idx_scan_event_members_scan" ON "public"."scan_event_members" USING "btree" ("scan_id");



CREATE INDEX "idx_scan_events_breweries" ON "public"."scan_events" USING "gin" ("breweries");



CREATE INDEX "idx_scan_events_event_start" ON "public"."scan_events" USING "btree" ("event_start" DESC);



CREATE INDEX "idx_sessions_brewery_type" ON "public"."brewing_sessions" USING "btree" ("brewery_id", "session_type");



CREATE INDEX "idx_sessions_og" ON "public"."brewing_sessions" USING "btree" ("measured_og");



CREATE INDEX "idx_sessions_type" ON "public"."brewing_sessions" USING "btree" ("session_type");



CREATE INDEX "idx_subscription_history_date" ON "public"."subscription_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_subscription_history_profile" ON "public"."subscription_history" USING "btree" ("profile_id");



CREATE INDEX "idx_system_hourly_date" ON "public"."analytics_system_hourly" USING "btree" ("date" DESC);



CREATE INDEX "idx_system_hourly_timestamp" ON "public"."analytics_system_hourly" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_tasting_score_events_bottle_id" ON "public"."tasting_score_events" USING "btree" ("bottle_id") WHERE ("bottle_id" IS NOT NULL);



CREATE INDEX "idx_tasting_score_events_bottle_scan_id" ON "public"."tasting_score_events" USING "btree" ("bottle_scan_id") WHERE ("bottle_scan_id" IS NOT NULL);



CREATE INDEX "idx_tasting_score_events_session_id" ON "public"."tasting_score_events" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_tasting_score_events_session_token" ON "public"."tasting_score_events" USING "btree" ("session_token") WHERE ("session_token" IS NOT NULL);



CREATE INDEX "idx_tasting_score_events_user_id" ON "public"."tasting_score_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_team_chunks_brewery" ON "public"."team_knowledge_chunks" USING "btree" ("brewery_id");



CREATE INDEX "idx_team_chunks_document" ON "public"."team_knowledge_chunks" USING "btree" ("document_id");



CREATE INDEX "idx_team_chunks_embedding" ON "public"."team_knowledge_chunks" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_team_kb_brewery" ON "public"."team_knowledge_base" USING "btree" ("brewery_id");



CREATE INDEX "idx_team_kb_status" ON "public"."team_knowledge_base" USING "btree" ("brewery_id", "status");



CREATE INDEX "idx_user_achievements_achievement" ON "public"."user_achievements" USING "btree" ("achievement_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_user_daily_date" ON "public"."analytics_user_daily" USING "btree" ("date");



CREATE INDEX "idx_user_daily_user" ON "public"."analytics_user_daily" USING "btree" ("user_id");



CREATE INDEX "idx_user_daily_user_date" ON "public"."analytics_user_daily" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_user_recs_user_computed" ON "public"."user_recommendations" USING "btree" ("user_id", "computed_at" DESC);



CREATE INDEX "idx_user_recs_user_score" ON "public"."user_recommendations" USING "btree" ("user_id", "score" DESC);



CREATE INDEX "idx_user_stash_brew" ON "public"."user_stash" USING "btree" ("brew_id");



CREATE INDEX "idx_user_stash_user" ON "public"."user_stash" USING "btree" ("user_id");



CREATE INDEX "likes_brew_id_idx" ON "public"."likes" USING "btree" ("brew_id");



CREATE INDEX "likes_user_id_idx" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE UNIQUE INDEX "profiles_display_name_ci_unique" ON "public"."profiles" USING "btree" ("lower"("display_name")) WHERE ("display_name" IS NOT NULL);



CREATE INDEX "ratings_brew_id_idx" ON "public"."ratings" USING "btree" ("brew_id");



CREATE INDEX "reports_status_idx" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "reports_target_idx" ON "public"."reports" USING "btree" ("target_id", "target_type");



CREATE UNIQUE INDEX "uniq_user_brew_flavor_profile" ON "public"."flavor_profiles" USING "btree" ("brew_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_btb_nonce" ON "public"."btb_used_nonces" USING "btree" ("nonce", "bottle_id", "brew_id", COALESCE("session_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("user_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("ip_hash", 'unknown_ip'::"text"));



CREATE UNIQUE INDEX "unique_rating_nonce" ON "public"."rating_used_nonces" USING "btree" ("nonce", "bottle_id", "brew_id", COALESCE("session_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("user_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("ip_hash", 'unknown_ip'::"text"));



CREATE UNIQUE INDEX "unique_user_brew_rating" ON "public"."ratings" USING "btree" ("brew_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_vibe_check_nonce" ON "public"."vibe_check_used_nonces" USING "btree" ("nonce", "bottle_id", "brew_id", COALESCE("session_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("user_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("ip_hash", 'unknown_ip'::"text"));



CREATE UNIQUE INDEX "uq_flavor_profiles_user_brew" ON "public"."flavor_profiles" USING "btree" ("user_id", "brew_id");



CREATE UNIQUE INDEX "uq_flavor_profiles_user_session" ON "public"."flavor_profiles" USING "btree" ("user_id", "session_id") WHERE (("session_id" IS NOT NULL) AND ("user_id" IS NOT NULL));



CREATE OR REPLACE TRIGGER "ensure_short_code" BEFORE INSERT ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."set_short_code_before_insert"();



CREATE OR REPLACE TRIGGER "forum_posts_search_trigger" BEFORE INSERT OR UPDATE OF "content" ON "public"."forum_posts" FOR EACH ROW EXECUTE FUNCTION "public"."forum_posts_search_update"();



CREATE OR REPLACE TRIGGER "forum_threads_search_trigger" BEFORE INSERT OR UPDATE OF "title", "content" ON "public"."forum_threads" FOR EACH ROW EXECUTE FUNCTION "public"."forum_threads_search_update"();



CREATE OR REPLACE TRIGGER "on_brew_image_change" BEFORE INSERT OR UPDATE ON "public"."brews" FOR EACH ROW EXECUTE FUNCTION "public"."handle_brew_image_change"();



CREATE OR REPLACE TRIGGER "on_brewery_logo_change" BEFORE UPDATE ON "public"."breweries" FOR EACH ROW EXECUTE FUNCTION "public"."handle_brewery_logo_change"();



CREATE OR REPLACE TRIGGER "on_brewery_member_created" AFTER INSERT ON "public"."brewery_members" FOR EACH ROW EXECUTE FUNCTION "public"."upgrade_to_brewer_on_join"();



CREATE OR REPLACE TRIGGER "on_like_change" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_likes_count"();



CREATE OR REPLACE TRIGGER "on_like_notify" AFTER INSERT ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_like_notification"();



CREATE OR REPLACE TRIGGER "trg_botlguide_embeddings_updated_at" BEFORE UPDATE ON "public"."botlguide_embeddings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_botlguide_embeddings"();



CREATE OR REPLACE TRIGGER "trg_equipment_profiles_updated_at" BEFORE UPDATE ON "public"."equipment_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_equipment_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trg_increment_copy_count" AFTER INSERT ON "public"."brews" FOR EACH ROW EXECUTE FUNCTION "public"."increment_brew_copy_count"();



CREATE OR REPLACE TRIGGER "trg_quality_score_on_brew_update" AFTER UPDATE ON "public"."brews" FOR EACH ROW WHEN ((("old"."name" IS DISTINCT FROM "new"."name") OR ("old"."style" IS DISTINCT FROM "new"."style") OR ("old"."description" IS DISTINCT FROM "new"."description") OR ("old"."image_url" IS DISTINCT FROM "new"."image_url") OR ("old"."data" IS DISTINCT FROM "new"."data") OR ("old"."likes_count" IS DISTINCT FROM "new"."likes_count") OR ("old"."copy_count" IS DISTINCT FROM "new"."copy_count"))) EXECUTE FUNCTION "public"."trg_fn_refresh_quality_score_on_brew"();



CREATE OR REPLACE TRIGGER "trg_quality_score_on_like" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_refresh_quality_score_on_like"();



CREATE OR REPLACE TRIGGER "trg_quality_score_on_rating" AFTER INSERT ON "public"."ratings" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_refresh_quality_score_on_rating"();



CREATE OR REPLACE TRIGGER "trg_sync_brew_abv_ibu" BEFORE INSERT OR UPDATE OF "data" ON "public"."brews" FOR EACH ROW EXECUTE FUNCTION "public"."sync_brew_abv_ibu"();



CREATE OR REPLACE TRIGGER "trg_sync_brew_metadata" BEFORE INSERT OR UPDATE ON "public"."brews" FOR EACH ROW EXECUTE FUNCTION "public"."sync_brew_metadata"();



CREATE OR REPLACE TRIGGER "trg_sync_mash_steps_count" BEFORE INSERT OR UPDATE OF "data" ON "public"."brews" FOR EACH ROW EXECUTE FUNCTION "public"."sync_mash_steps_count"();



CREATE OR REPLACE TRIGGER "trg_times_brewed" AFTER INSERT OR DELETE OR UPDATE OF "brew_id" ON "public"."brewing_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_times_brewed"();



CREATE OR REPLACE TRIGGER "trg_update_trending_on_like" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_brew_trending_score"();



CREATE OR REPLACE TRIGGER "trigger_add_default_label" AFTER INSERT ON "public"."breweries" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_label_on_brewery_insert"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_fills" AFTER UPDATE ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_fills"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_fills_insert" AFTER INSERT ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_fills_insert"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_scan_count" AFTER INSERT ON "public"."bottle_scans" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_scan_count"();



CREATE OR REPLACE TRIGGER "trigger_update_analytics_report_settings_updated_at" BEFORE UPDATE ON "public"."analytics_report_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_analytics_report_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_scan_geom" BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "public"."bottle_scans" FOR EACH ROW EXECUTE FUNCTION "public"."update_scan_geom"();



CREATE OR REPLACE TRIGGER "update_forum_posts_updated_at" BEFORE UPDATE ON "public"."forum_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_forum_threads_updated_at" BEFORE UPDATE ON "public"."forum_threads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_thread_stats_trigger" AFTER INSERT OR DELETE ON "public"."forum_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_thread_stats"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_profile_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_admin_audit_logs"
    ADD CONSTRAINT "analytics_admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_ai_insights"
    ADD CONSTRAINT "analytics_ai_insights_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_ai_insights"
    ADD CONSTRAINT "analytics_ai_insights_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_alert_history"
    ADD CONSTRAINT "analytics_alert_history_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_alert_history"
    ADD CONSTRAINT "analytics_alert_history_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."analytics_alert_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_brewery_daily"
    ADD CONSTRAINT "analytics_brewery_daily_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_report_logs"
    ADD CONSTRAINT "analytics_report_logs_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_report_logs"
    ADD CONSTRAINT "analytics_report_logs_report_setting_id_fkey" FOREIGN KEY ("report_setting_id") REFERENCES "public"."analytics_report_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_report_logs"
    ADD CONSTRAINT "analytics_report_logs_top_brew_id_fkey" FOREIGN KEY ("top_brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_report_settings"
    ADD CONSTRAINT "analytics_report_settings_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_report_settings"
    ADD CONSTRAINT "analytics_report_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_user_daily"
    ADD CONSTRAINT "analytics_user_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beat_friend_challenges"
    ADD CONSTRAINT "beat_friend_challenges_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beat_friend_challenges"
    ADD CONSTRAINT "beat_friend_challenges_challenged_id_fkey" FOREIGN KEY ("challenged_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."beat_friend_challenges"
    ADD CONSTRAINT "beat_friend_challenges_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_audit_log"
    ADD CONSTRAINT "botlguide_audit_log_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."botlguide_audit_log"
    ADD CONSTRAINT "botlguide_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_embeddings"
    ADD CONSTRAINT "botlguide_embeddings_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_embeddings"
    ADD CONSTRAINT "botlguide_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_feedback"
    ADD CONSTRAINT "botlguide_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."botlguide_insights"
    ADD CONSTRAINT "botlguide_insights_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_insights"
    ADD CONSTRAINT "botlguide_insights_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_insights"
    ADD CONSTRAINT "botlguide_insights_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."botlguide_insights"
    ADD CONSTRAINT "botlguide_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bottle_scans"
    ADD CONSTRAINT "bottle_scans_bottle_id_fkey" FOREIGN KEY ("bottle_id") REFERENCES "public"."bottles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bottle_scans"
    ADD CONSTRAINT "bottle_scans_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bottle_scans"
    ADD CONSTRAINT "bottle_scans_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bottle_scans"
    ADD CONSTRAINT "bottle_scans_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bounty_claims"
    ADD CONSTRAINT "bounty_claims_bounty_id_fkey" FOREIGN KEY ("bounty_id") REFERENCES "public"."brewer_bounties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bounty_claims"
    ADD CONSTRAINT "bounty_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brew_measurements"
    ADD CONSTRAINT "brew_measurements_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brew_measurements"
    ADD CONSTRAINT "brew_measurements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brew_measurements"
    ADD CONSTRAINT "brew_measurements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brew_views"
    ADD CONSTRAINT "brew_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewer_bounties"
    ADD CONSTRAINT "brewer_bounties_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brewer_bounties"
    ADD CONSTRAINT "brewer_bounties_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_feed"
    ADD CONSTRAINT "brewery_feed_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_feed"
    ADD CONSTRAINT "brewery_feed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_members"
    ADD CONSTRAINT "brewery_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_saved_brews"
    ADD CONSTRAINT "brewery_saved_brews_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_saved_brews"
    ADD CONSTRAINT "brewery_saved_brews_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewery_saved_brews"
    ADD CONSTRAINT "brewery_saved_brews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brewery_settings"
    ADD CONSTRAINT "brewery_settings_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brewing_sessions"
    ADD CONSTRAINT "brewing_sessions_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brewing_sessions"
    ADD CONSTRAINT "brewing_sessions_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_remix_parent_id_fkey" FOREIGN KEY ("remix_parent_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."btb_used_nonces"
    ADD CONSTRAINT "btb_used_nonces_bottle_id_fkey" FOREIGN KEY ("bottle_id") REFERENCES "public"."bottles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."btb_used_nonces"
    ADD CONSTRAINT "btb_used_nonces_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."btb_used_nonces"
    ADD CONSTRAINT "btb_used_nonces_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."btb_used_nonces"
    ADD CONSTRAINT "btb_used_nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_appeals"
    ADD CONSTRAINT "content_appeals_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_appeals"
    ADD CONSTRAINT "content_appeals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_appeals"
    ADD CONSTRAINT "content_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enterprise_codes"
    ADD CONSTRAINT "enterprise_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."equipment_profiles"
    ADD CONSTRAINT "equipment_profiles_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flavor_profiles"
    ADD CONSTRAINT "flavor_profiles_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flavor_profiles"
    ADD CONSTRAINT "flavor_profiles_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flavor_profiles"
    ADD CONSTRAINT "flavor_profiles_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flavor_profiles"
    ADD CONSTRAINT "flavor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_bookmarks"
    ADD CONSTRAINT "forum_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_poll_options"
    ADD CONSTRAINT "forum_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."forum_polls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_poll_votes"
    ADD CONSTRAINT "forum_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."forum_poll_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_poll_votes"
    ADD CONSTRAINT "forum_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_polls"
    ADD CONSTRAINT "forum_polls_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."forum_posts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_subscriptions"
    ADD CONSTRAINT "forum_subscriptions_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_subscriptions"
    ADD CONSTRAINT "forum_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_threads"
    ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forum_threads"
    ADD CONSTRAINT "forum_threads_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forum_threads"
    ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."forum_votes"
    ADD CONSTRAINT "forum_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."label_templates"
    ADD CONSTRAINT "label_templates_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_brewery_id_fkey" FOREIGN KEY ("active_brewery_id") REFERENCES "public"."breweries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_used_nonces"
    ADD CONSTRAINT "rating_used_nonces_bottle_id_fkey" FOREIGN KEY ("bottle_id") REFERENCES "public"."bottles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_used_nonces"
    ADD CONSTRAINT "rating_used_nonces_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_used_nonces"
    ADD CONSTRAINT "rating_used_nonces_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_used_nonces"
    ADD CONSTRAINT "rating_used_nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_event_members"
    ADD CONSTRAINT "scan_event_members_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."scan_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scan_event_members"
    ADD CONSTRAINT "scan_event_members_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "public"."bottle_scans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scan_intent_feedback"
    ADD CONSTRAINT "scan_intent_feedback_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "public"."bottle_scans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasting_score_events"
    ADD CONSTRAINT "tasting_score_events_bottle_id_fkey" FOREIGN KEY ("bottle_id") REFERENCES "public"."bottles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasting_score_events"
    ADD CONSTRAINT "tasting_score_events_bottle_scan_id_fkey" FOREIGN KEY ("bottle_scan_id") REFERENCES "public"."bottle_scans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasting_score_events"
    ADD CONSTRAINT "tasting_score_events_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasting_score_events"
    ADD CONSTRAINT "tasting_score_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasting_score_events"
    ADD CONSTRAINT "tasting_score_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_knowledge_base"
    ADD CONSTRAINT "team_knowledge_base_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_knowledge_base"
    ADD CONSTRAINT "team_knowledge_base_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_knowledge_chunks"
    ADD CONSTRAINT "team_knowledge_chunks_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_knowledge_chunks"
    ADD CONSTRAINT "team_knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."team_knowledge_base"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recommendations"
    ADD CONSTRAINT "user_recommendations_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_recommendations"
    ADD CONSTRAINT "user_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stash"
    ADD CONSTRAINT "user_stash_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stash"
    ADD CONSTRAINT "user_stash_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vibe_check_used_nonces"
    ADD CONSTRAINT "vibe_check_used_nonces_bottle_id_fkey" FOREIGN KEY ("bottle_id") REFERENCES "public"."bottles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vibe_check_used_nonces"
    ADD CONSTRAINT "vibe_check_used_nonces_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vibe_check_used_nonces"
    ADD CONSTRAINT "vibe_check_used_nonces_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vibe_check_used_nonces"
    ADD CONSTRAINT "vibe_check_used_nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "private_system"."secrets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Achievements können vergeben werden" ON "public"."user_achievements" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Achievements sind öffentlich lesbar" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Admin can read scan_intent_feedback" ON "public"."scan_intent_feedback" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."profile_id" = "auth"."uid"()) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin full access" ON "public"."analytics_alert_history" USING (false);



CREATE POLICY "Admin full access" ON "public"."analytics_alert_rules" USING (false);



CREATE POLICY "Admin full access" ON "public"."analytics_cohorts" USING (false);



CREATE POLICY "Admin full access" ON "public"."analytics_content_daily" USING (false);



CREATE POLICY "Admin full access" ON "public"."analytics_feature_usage" USING (false);



CREATE POLICY "Admin full access" ON "public"."analytics_system_hourly" USING (false);



CREATE POLICY "Admin full access" ON "public"."analytics_user_daily" USING (false);



CREATE POLICY "Admins can manage enterprise codes" ON "public"."enterprise_codes" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admins can remove members" ON "public"."brewery_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "brewery_members"."brewery_id") AND ("bm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Allow update for owners" ON "public"."bottles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Anyone can create a profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Anyone can insert bottle scans" ON "public"."bottle_scans" FOR INSERT TO "authenticated", "anon" WITH CHECK (("bottle_id" IS NOT NULL));



CREATE POLICY "Authenticated users can create breweries" ON "public"."breweries" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can create discussion threads" ON "public"."forum_threads" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "author_id") AND (("thread_type" = 'discussion'::"text") OR ("thread_type" IS NULL))));



CREATE POLICY "Authenticated users can create posts" ON "public"."forum_posts" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view all breweries" ON "public"."breweries" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view breweries" ON "public"."breweries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can vote" ON "public"."forum_votes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authors can update own posts" ON "public"."forum_posts" FOR UPDATE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Authors can update own threads" ON "public"."forum_threads" FOR UPDATE TO "authenticated" USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Brewers can delete ratings of their brews" ON "public"."ratings" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));



CREATE POLICY "Brewers can update ratings of their brews" ON "public"."ratings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));



CREATE POLICY "Brewery members can read own analytics" ON "public"."analytics_brewery_daily" FOR SELECT USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Brewery members can read own insights" ON "public"."analytics_ai_insights" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "analytics_ai_insights"."brewery_id") AND ("bm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Brewery members can update own insights" ON "public"."analytics_ai_insights" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "analytics_ai_insights"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "analytics_ai_insights"."brewery_id") AND ("bm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Brewery owners can view caps for their brews" ON "public"."collected_caps" FOR SELECT TO "authenticated" USING (("brew_id" IN ( SELECT "b"."id"
   FROM ("public"."brews" "b"
     JOIN "public"."brewery_members" "bm" ON (("bm"."brewery_id" = "b"."brewery_id")))
  WHERE (("bm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("bm"."role" = 'owner'::"text")))));



CREATE POLICY "Brewery owners can view their analytics" ON "public"."bottle_scans" FOR SELECT TO "authenticated" USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Brewery owners can view their stats" ON "public"."analytics_daily_stats" FOR SELECT TO "authenticated" USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Brews are viewable by everyone" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Enable insert access for all users" ON "public"."bottles" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable insert access for all users" ON "public"."brews" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."bottles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Enable read access for members" ON "public"."breweries" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all users" ON "public"."bottles" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable update access for all users" ON "public"."brews" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Everyone can view breweries" ON "public"."breweries" FOR SELECT USING (true);



CREATE POLICY "Forum votes are publicly readable" ON "public"."forum_votes" FOR SELECT USING (true);



CREATE POLICY "Jeder kann Ratings erstellen" ON "public"."ratings" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Manage sessions for members" ON "public"."brewing_sessions" USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can create brewery brews" ON "public"."brews" FOR INSERT WITH CHECK (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can delete brewery brews" ON "public"."brews" FOR DELETE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can manage brewery bottles" ON "public"."bottles" USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can update brewery brews" ON "public"."brews" FOR UPDATE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can view brewery bottles" ON "public"."bottles" FOR SELECT USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Members can view brewery brews" ON "public"."brews" FOR SELECT USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("is_public" = true) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Mitglieder sehen ihre Brauerei" ON "public"."breweries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "breweries"."id") AND ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "No public access on platform_settings" ON "public"."platform_settings" USING (false);



CREATE POLICY "Owners and admins can add members" ON "public"."brewery_members" FOR INSERT WITH CHECK (("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners and admins can remove members" ON "public"."brewery_members" FOR DELETE USING ((("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))) AND ("role" <> 'owner'::"text")));



CREATE POLICY "Owners and admins can update members" ON "public"."brewery_members" FOR UPDATE USING (("brewery_id" IN ( SELECT "brewery_members_1"."brewery_id"
   FROM "public"."brewery_members" "brewery_members_1"
  WHERE (("brewery_members_1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Owners can delete their brewery" ON "public"."breweries" FOR DELETE USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Owners can update their brewery" ON "public"."breweries" FOR UPDATE USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public brews are viewable by everyone" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Public read access for forum categories" ON "public"."forum_categories" FOR SELECT USING (true);



CREATE POLICY "Public read access for forum posts" ON "public"."forum_posts" FOR SELECT USING (true);



CREATE POLICY "Public read access for forum threads" ON "public"."forum_threads" FOR SELECT USING (true);



CREATE POLICY "Public view brewery members" ON "public"."brewery_members" FOR SELECT USING (true);



CREATE POLICY "Ratings sind öffentlich lesbar" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "Service role can insert audit logs" ON "public"."analytics_admin_audit_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert insights" ON "public"."analytics_ai_insights" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage scan_intent_feedback" ON "public"."scan_intent_feedback" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can read feedback" ON "public"."botlguide_feedback" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role full access" ON "public"."admin_users" USING (false);



CREATE POLICY "Service role full access" ON "public"."analytics_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access insights" ON "public"."analytics_ai_insights" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to scans" ON "public"."bottle_scans" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to stats" ON "public"."analytics_daily_stats" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role insert for tasting score events" ON "public"."tasting_score_events" FOR INSERT WITH CHECK ((("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Service role update for claiming anonymous events" ON "public"."tasting_score_events" FOR UPDATE USING ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Super admin read access" ON "public"."analytics_admin_audit_logs" FOR SELECT USING (false);



CREATE POLICY "Team admins and owners can delete templates" ON "public"."label_templates" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "label_templates"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Team admins, owners and brewers can insert templates" ON "public"."label_templates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "label_templates"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = ANY (ARRAY['admin'::"text", 'brewer'::"text", 'owner'::"text"]))))));



CREATE POLICY "Team admins, owners and brewers can update templates" ON "public"."label_templates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "label_templates"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = ANY (ARRAY['admin'::"text", 'brewer'::"text", 'owner'::"text"]))))));



CREATE POLICY "Team members can insert feed items" ON "public"."brewery_feed" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Team members can view feed" ON "public"."brewery_feed" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Team members can view templates" ON "public"."label_templates" FOR SELECT USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "User can only see their own brews" ON "public"."brews" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "User sehen eigene Achievements" ON "public"."user_achievements" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can add themselves to a brewery" ON "public"."brewery_members" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can add to their collection" ON "public"."collected_caps" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create appeals" ON "public"."content_appeals" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete measurements for their own brews or team brews" ON "public"."brew_measurements" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."brews"
  WHERE (("brews"."id" = "brew_measurements"."brew_id") AND ("brews"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."brewery_members" "bm"
     JOIN "public"."brews" "b" ON (("b"."brewery_id" = "bm"."brewery_id")))
  WHERE (("b"."id" = "brew_measurements"."brew_id") AND ("bm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete own bookmarks" ON "public"."forum_bookmarks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own bottles" ON "public"."bottles" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own brews" ON "public"."brews" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."likes" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert measurements for their own brews or team brews" ON "public"."brew_measurements" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."brews"
  WHERE (("brews"."id" = "brew_measurements"."brew_id") AND ("brews"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."brewery_members" "bm"
     JOIN "public"."brews" "b" ON (("b"."brewery_id" = "bm"."brewery_id")))
  WHERE (("b"."id" = "brew_measurements"."brew_id") AND ("bm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert own bookmarks" ON "public"."forum_bookmarks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own events" ON "public"."analytics_events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own feedback" ON "public"."botlguide_feedback" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert themselves as members" ON "public"."brewery_members" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can join breweries" ON "public"."brewery_members" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can leave breweries" ON "public"."brewery_members" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage own report settings" ON "public"."analytics_report_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only add to ther own bottles" ON "public"."bottles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only add to ther own brews" ON "public"."brews" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own bookmarks" ON "public"."forum_bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR true));



CREATE POLICY "Users can remove own votes" ON "public"."forum_votes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can remove saved brews from their team" ON "public"."brewery_saved_brews" FOR DELETE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Users can save brews to their team" ON "public"."brewery_saved_brews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_saved_brews"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can see their own bottles" ON "public"."bottles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view codes if they know the code" ON "public"."enterprise_codes" FOR SELECT USING (true);



CREATE POLICY "Users can view measurements for brews they can view" ON "public"."brew_measurements" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."brews"
  WHERE (("brews"."id" = "brew_measurements"."brew_id") AND (("brews"."is_public" = true) OR ("brews"."user_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM ("public"."brewery_members" "bm"
     JOIN "public"."brews" "b" ON (("b"."brewery_id" = "bm"."brewery_id")))
  WHERE (("b"."id" = "brew_measurements"."brew_id") AND ("bm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own ai usage logs" ON "public"."ai_usage_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own appeals" ON "public"."content_appeals" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own brewery report logs" ON "public"."analytics_report_logs" FOR SELECT USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Users can view own likes" ON "public"."likes" FOR SELECT TO "authenticated" USING ((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own subscription history" ON "public"."subscription_history" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view saved brews of their team" ON "public"."brewery_saved_brews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_saved_brews"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their breweries" ON "public"."breweries" FOR SELECT USING (("id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view their own collection" ON "public"."collected_caps" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT TO "authenticated" USING (("reporter_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own tasting score events" ON "public"."tasting_score_events" FOR SELECT USING ((("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users manage own subscriptions" ON "public"."forum_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "View sessions for members" ON "public"."brewing_sessions" FOR SELECT USING (("auth"."uid"() IN ( SELECT "brewery_members"."user_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."brewery_id" = "brewing_sessions"."brewery_id"))));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin can delete equipment profiles" ON "public"."equipment_profiles" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "m"
  WHERE (("m"."brewery_id" = "equipment_profiles"."brewery_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "admin can insert equipment profiles" ON "public"."equipment_profiles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "m"
  WHERE (("m"."brewery_id" = "equipment_profiles"."brewery_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "admin can update equipment profiles" ON "public"."equipment_profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "m"
  WHERE (("m"."brewery_id" = "equipment_profiles"."brewery_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_ai_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_alert_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_alert_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_brewery_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_cohorts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_content_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_feature_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_report_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_report_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_system_hourly" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_user_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beat_friend_challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bfc_accept_update" ON "public"."beat_friend_challenges" FOR UPDATE USING ((("challenged_id" IS NULL) AND ("challenger_id" <> "auth"."uid"()) AND ("expires_at" > "now"())));



CREATE POLICY "bfc_challenger_all" ON "public"."beat_friend_challenges" USING (("challenger_id" = "auth"."uid"()));



CREATE POLICY "bfc_public_token_read" ON "public"."beat_friend_challenges" FOR SELECT USING (true);



ALTER TABLE "public"."botlguide_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."botlguide_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."botlguide_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."botlguide_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bottle_scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bottles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bounty_claims" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bounty_claims_brewery_read" ON "public"."bounty_claims" FOR SELECT USING (("bounty_id" IN ( SELECT "b"."id"
   FROM ("public"."brewer_bounties" "b"
     JOIN "public"."brewery_members" "bm" ON (("bm"."brewery_id" = "b"."brewery_id")))
  WHERE ("bm"."user_id" = "auth"."uid"()))));



CREATE POLICY "bounty_claims_owner" ON "public"."bounty_claims" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."brew_measurements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brew_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewer_bounties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brewer_bounties_brewery_write" ON "public"."brewer_bounties" USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "brewer_bounties_public_read" ON "public"."brewer_bounties" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."breweries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brewery_admins_delete_knowledge" ON "public"."team_knowledge_base" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "team_knowledge_base"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "brewery_admins_insert_knowledge" ON "public"."team_knowledge_base" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "team_knowledge_base"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "brewery_admins_read_audit" ON "public"."botlguide_audit_log" FOR SELECT USING ((("brewery_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "botlguide_audit_log"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



CREATE POLICY "brewery_admins_update_knowledge" ON "public"."team_knowledge_base" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "team_knowledge_base"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."brewery_feed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brewery_members_read_chunks" ON "public"."team_knowledge_chunks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "team_knowledge_chunks"."brewery_id") AND ("bm"."user_id" = "auth"."uid"())))));



CREATE POLICY "brewery_members_read_knowledge" ON "public"."team_knowledge_base" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "team_knowledge_base"."brewery_id") AND ("bm"."user_id" = "auth"."uid"())))));



CREATE POLICY "brewery_members_read_settings" ON "public"."brewery_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "brewery_settings"."brewery_id") AND ("bm"."user_id" = "auth"."uid"())))));



CREATE POLICY "brewery_owners_manage_settings" ON "public"."brewery_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "brewery_settings"."brewery_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = 'owner'::"text")))));



CREATE POLICY "brewery_owners_read_event_members" ON "public"."scan_event_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."scan_events" "se"
     JOIN "public"."brewery_members" "bm" ON (("bm"."brewery_id" = ANY ("se"."breweries"))))
  WHERE (("se"."id" = "scan_event_members"."event_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = 'owner'::"text")))));



CREATE POLICY "brewery_owners_read_their_events" ON "public"."scan_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = ANY ("scan_events"."breweries")) AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = 'owner'::"text")))));



CREATE POLICY "brewery_owners_update_their_events" ON "public"."scan_events" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = ANY ("scan_events"."breweries")) AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = ANY ("scan_events"."breweries")) AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."role" = 'owner'::"text")))));



ALTER TABLE "public"."brewery_saved_brews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewing_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."btb_used_nonces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collected_caps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_appeals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enterprise_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flavor_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "flavor_profiles_delete_own" ON "public"."flavor_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "flavor_profiles_insert_anon_service" ON "public"."flavor_profiles" FOR INSERT WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR (("auth"."role"() = 'service_role'::"text") AND ("user_id" IS NULL))));



CREATE POLICY "flavor_profiles_select_all" ON "public"."flavor_profiles" FOR SELECT USING (true);



CREATE POLICY "flavor_profiles_update_anon_service" ON "public"."flavor_profiles" FOR UPDATE USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."forum_bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_poll_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_poll_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_polls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."label_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can read equipment profiles" ON "public"."equipment_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "m"
  WHERE (("m"."brewery_id" = "equipment_profiles"."brewery_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "options_insert" ON "public"."forum_poll_options" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "options_read" ON "public"."forum_poll_options" FOR SELECT USING (true);



CREATE POLICY "own_brews_select" ON "public"."brews" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "polls_insert" ON "public"."forum_polls" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "polls_read" ON "public"."forum_polls" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_brews_select" ON "public"."brews" FOR SELECT USING (("is_public" = true));



CREATE POLICY "public_profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "public_ratings_select" ON "public"."ratings" FOR SELECT USING ((("moderation_status")::"text" = 'auto_approved'::"text"));



ALTER TABLE "public"."rating_used_nonces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_bjcp_styles" ON "public"."botlguide_embeddings" FOR SELECT TO "authenticated" USING (("source_type" = 'bjcp_style'::"text"));



CREATE POLICY "read_own_recipe_embeddings" ON "public"."botlguide_embeddings" FOR SELECT TO "authenticated" USING ((("source_type" = 'user_recipe'::"text") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scan_event_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scan_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scan_intent_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_insert_event_members" ON "public"."scan_event_members" FOR INSERT WITH CHECK (true);



CREATE POLICY "service_insert_scan_events" ON "public"."scan_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."botlguide_embeddings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_insights" ON "public"."botlguide_insights" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_audit_log" ON "public"."botlguide_audit_log" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_brewery_settings" ON "public"."brewery_settings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_knowledge_base" ON "public"."team_knowledge_base" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_knowledge_chunks" ON "public"."team_knowledge_chunks" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_only" ON "public"."btb_used_nonces" USING (false) WITH CHECK (false);



CREATE POLICY "service_role_only" ON "public"."rating_used_nonces" USING (false) WITH CHECK (false);



CREATE POLICY "service_role_only" ON "public"."vibe_check_used_nonces" USING (false) WITH CHECK (false);



ALTER TABLE "public"."subscription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasting_score_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_knowledge_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_recommendations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_recommendations: delete own" ON "public"."user_recommendations" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_recommendations: insert own" ON "public"."user_recommendations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_recommendations: select own" ON "public"."user_recommendations" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_stash" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_stash_brewery_read" ON "public"."user_stash" FOR SELECT USING (("brew_id" IN ( SELECT "brews"."id"
   FROM ("public"."brews"
     JOIN "public"."brewery_members" ON (("brewery_members"."brewery_id" = "brews"."brewery_id")))
  WHERE ("brewery_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "user_stash_owner" ON "public"."user_stash" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users manage own views" ON "public"."brew_views" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_read_own_audit" ON "public"."botlguide_audit_log" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_read_own_insights" ON "public"."botlguide_insights" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own_insights" ON "public"."botlguide_insights" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."vibe_check_used_nonces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes_delete" ON "public"."forum_poll_votes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "votes_insert" ON "public"."forum_poll_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "votes_read" ON "public"."forum_poll_votes" FOR SELECT USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brewery_feed";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."admin_clear_trending_override"("brew_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_clear_trending_override"("brew_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_clear_trending_override"("brew_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_get_empty_breweries"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_get_empty_breweries"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_empty_breweries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_empty_breweries"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_preview_ratings_backfill"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_preview_ratings_backfill"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_preview_ratings_backfill"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_preview_ratings_backfill"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_preview_user_classification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_preview_user_classification"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_preview_user_classification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_preview_user_classification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_run_ratings_backfill"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_run_ratings_backfill"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_run_ratings_backfill"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_run_ratings_backfill"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_run_user_classification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_run_user_classification"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_run_user_classification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_run_user_classification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_featured"("brew_id" "uuid", "featured" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_featured"("brew_id" "uuid", "featured" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_featured"("brew_id" "uuid", "featured" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_trending_score"("brew_id" "uuid", "new_score" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_trending_score"("brew_id" "uuid", "new_score" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_trending_score"("brew_id" "uuid", "new_score" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."aggregate_cis_brew_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."aggregate_cis_brew_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."aggregate_cis_brew_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_brew_quality_score"("brew_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_brew_quality_score"("brew_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_brew_quality_score"("brew_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_anonymous_session"("p_session_token" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_anonymous_session"("p_session_token" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_label_on_brewery_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_label_on_brewery_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_label_on_brewery_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."dispatch_analytics_report_for_brewery"("p_brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dispatch_analytics_report_for_brewery"("p_brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dispatch_analytics_report_for_brewery"("p_brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."dispatch_pending_analytics_reports"() TO "anon";
GRANT ALL ON FUNCTION "public"."dispatch_pending_analytics_reports"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dispatch_pending_analytics_reports"() TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_event_clustering"("eps_degrees" double precision, "min_points" integer, "min_sessions" integer, "lookback_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."execute_event_clustering"("eps_degrees" double precision, "min_points" integer, "min_sessions" integer, "lookback_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_event_clustering"("eps_degrees" double precision, "min_points" integer, "min_sessions" integer, "lookback_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."forum_posts_search_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."forum_posts_search_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."forum_posts_search_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."forum_threads_search_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."forum_threads_search_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."forum_threads_search_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_short_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_short_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_short_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_botlguide_usage_stats"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_botlguide_usage_stats"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_botlguide_usage_stats"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brew_flavor_profile"("p_brew_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brew_flavor_profile"("p_brew_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brew_flavor_profile"("p_brew_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brew_taste_profile"("p_brew_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brew_taste_profile"("p_brew_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brew_taste_profile"("p_brew_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_diversity_cap" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_diversity_cap" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_collaborative_recommendations"("p_user_id" "uuid", "p_limit" integer, "p_diversity_cap" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_db_health_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_db_health_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_db_health_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_featured_brews_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_featured_brews_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_featured_brews_public"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_low_quality_brews"("threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_low_quality_brews"("threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_low_quality_brews"("threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quality_score_distribution"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_quality_score_distribution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quality_score_distribution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trending_brews"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_brews"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_brews"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_brew_context"("p_user_id" "uuid", "p_session_id" "uuid", "p_brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_brew_context"("p_user_id" "uuid", "p_session_id" "uuid", "p_brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_brew_context"("p_user_id" "uuid", "p_session_id" "uuid", "p_brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_brew_image_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_brew_image_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_brew_image_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_brewery_logo_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_brewery_logo_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_brewery_logo_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_like_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_like_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_like_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_bottle_fills"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_bottle_fills_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_bottle_fills_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_bottle_scan_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_bottle_scan_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_bottle_scan_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_brew_copy_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_brew_copy_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_brew_copy_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean, "p_is_logged_in" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean, "p_is_logged_in" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer, "p_is_new_visitor" boolean, "p_is_logged_in" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_forum_view_count"("thread_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_forum_view_count"("thread_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_forum_view_count"("thread_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_profile_views"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_profile_views"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_profile_views"("p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_tasting_iq"("p_user_id" "uuid", "p_delta" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_tasting_iq"("p_user_id" "uuid", "p_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_brew_page_view"("p_brew_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_brew_page_view"("p_brew_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_brew_page_view"("p_brew_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_brew_style_averages"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_brew_style_averages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_brew_style_averages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_brew_style_flavor_averages"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_brew_style_flavor_averages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_brew_style_flavor_averages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_trending_scores"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_trending_scores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_trending_scores"() TO "service_role";









GRANT ALL ON FUNCTION "public"."set_default_equipment_profile"("p_profile_id" "uuid", "p_brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_equipment_profile"("p_profile_id" "uuid", "p_brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_equipment_profile"("p_profile_id" "uuid", "p_brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_short_code_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_short_code_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_short_code_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_botlguide_embeddings"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_botlguide_embeddings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_botlguide_embeddings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_brew_abv_ibu"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_brew_abv_ibu"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_brew_abv_ibu"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_brew_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_brew_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_brew_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_mash_steps_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_mash_steps_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_mash_steps_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_brew"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_brew"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_brew"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_refresh_quality_score_on_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_times_brewed"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_times_brewed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_times_brewed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_analytics_report_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_analytics_report_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_analytics_report_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brew_trending_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_brew_trending_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brew_trending_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_equipment_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_equipment_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_equipment_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_scan_geom"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_scan_geom"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_scan_geom"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_thread_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_thread_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_thread_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upgrade_to_brewer_on_join"() TO "anon";
GRANT ALL ON FUNCTION "public"."upgrade_to_brewer_on_join"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."upgrade_to_brewer_on_join"() TO "service_role";



GRANT ALL ON TABLE "public"."brews" TO "anon";
GRANT ALL ON TABLE "public"."brews" TO "authenticated";
GRANT ALL ON TABLE "public"."brews" TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "service_role";



































































































GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."analytics_admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_admin_audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_admin_audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_admin_audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_admin_audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_ai_insights" TO "anon";
GRANT ALL ON TABLE "public"."analytics_ai_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_ai_insights" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_alert_history" TO "anon";
GRANT ALL ON TABLE "public"."analytics_alert_history" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_alert_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_alert_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_alert_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_alert_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_alert_rules" TO "anon";
GRANT ALL ON TABLE "public"."analytics_alert_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_alert_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_alert_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_alert_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_alert_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_brewery_daily" TO "anon";
GRANT ALL ON TABLE "public"."analytics_brewery_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_brewery_daily" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_brewery_daily_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_brewery_daily_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_brewery_daily_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_cohorts" TO "anon";
GRANT ALL ON TABLE "public"."analytics_cohorts" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_cohorts" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_content_daily" TO "anon";
GRANT ALL ON TABLE "public"."analytics_content_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_content_daily" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_content_daily_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_content_daily_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_content_daily_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "anon";
GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_feature_usage" TO "anon";
GRANT ALL ON TABLE "public"."analytics_feature_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_feature_usage" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_feature_usage_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_feature_usage_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_feature_usage_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_report_logs" TO "anon";
GRANT ALL ON TABLE "public"."analytics_report_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_report_logs" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_report_settings" TO "anon";
GRANT ALL ON TABLE "public"."analytics_report_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_report_settings" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_system_hourly" TO "anon";
GRANT ALL ON TABLE "public"."analytics_system_hourly" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_system_hourly" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_system_hourly_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_system_hourly_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_system_hourly_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_user_daily" TO "anon";
GRANT ALL ON TABLE "public"."analytics_user_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_user_daily" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_user_daily_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_user_daily_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_user_daily_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beat_friend_challenges" TO "anon";
GRANT ALL ON TABLE "public"."beat_friend_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."beat_friend_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."botlguide_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."botlguide_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."botlguide_audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."botlguide_audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."botlguide_audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."botlguide_audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."botlguide_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."botlguide_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."botlguide_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."botlguide_feedback" TO "anon";
GRANT ALL ON TABLE "public"."botlguide_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."botlguide_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."botlguide_insights" TO "anon";
GRANT ALL ON TABLE "public"."botlguide_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."botlguide_insights" TO "service_role";



GRANT ALL ON TABLE "public"."bottle_scans" TO "anon";
GRANT ALL ON TABLE "public"."bottle_scans" TO "authenticated";
GRANT ALL ON TABLE "public"."bottle_scans" TO "service_role";



GRANT ALL ON TABLE "public"."bottles" TO "anon";
GRANT ALL ON TABLE "public"."bottles" TO "authenticated";
GRANT ALL ON TABLE "public"."bottles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bounty_claims" TO "anon";
GRANT ALL ON TABLE "public"."bounty_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."bounty_claims" TO "service_role";



GRANT ALL ON TABLE "public"."brew_measurements" TO "anon";
GRANT ALL ON TABLE "public"."brew_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."brew_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON TABLE "public"."brew_style_averages" TO "anon";
GRANT ALL ON TABLE "public"."brew_style_averages" TO "authenticated";
GRANT ALL ON TABLE "public"."brew_style_averages" TO "service_role";



GRANT ALL ON TABLE "public"."flavor_profiles" TO "anon";
GRANT ALL ON TABLE "public"."flavor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."flavor_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."brew_style_flavor_averages" TO "anon";
GRANT ALL ON TABLE "public"."brew_style_flavor_averages" TO "authenticated";
GRANT ALL ON TABLE "public"."brew_style_flavor_averages" TO "service_role";



GRANT ALL ON TABLE "public"."brew_views" TO "anon";
GRANT ALL ON TABLE "public"."brew_views" TO "authenticated";
GRANT ALL ON TABLE "public"."brew_views" TO "service_role";



GRANT ALL ON TABLE "public"."brewer_bounties" TO "anon";
GRANT ALL ON TABLE "public"."brewer_bounties" TO "authenticated";
GRANT ALL ON TABLE "public"."brewer_bounties" TO "service_role";



GRANT ALL ON TABLE "public"."breweries" TO "anon";
GRANT ALL ON TABLE "public"."breweries" TO "authenticated";
GRANT ALL ON TABLE "public"."breweries" TO "service_role";



GRANT ALL ON TABLE "public"."brewery_feed" TO "anon";
GRANT ALL ON TABLE "public"."brewery_feed" TO "authenticated";
GRANT ALL ON TABLE "public"."brewery_feed" TO "service_role";



GRANT ALL ON TABLE "public"."brewery_members" TO "anon";
GRANT ALL ON TABLE "public"."brewery_members" TO "authenticated";
GRANT ALL ON TABLE "public"."brewery_members" TO "service_role";



GRANT ALL ON TABLE "public"."brewery_saved_brews" TO "anon";
GRANT ALL ON TABLE "public"."brewery_saved_brews" TO "authenticated";
GRANT ALL ON TABLE "public"."brewery_saved_brews" TO "service_role";



GRANT ALL ON TABLE "public"."brewery_settings" TO "anon";
GRANT ALL ON TABLE "public"."brewery_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."brewery_settings" TO "service_role";



GRANT ALL ON TABLE "public"."brewing_sessions" TO "anon";
GRANT ALL ON TABLE "public"."brewing_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."brewing_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."btb_used_nonces" TO "anon";
GRANT ALL ON TABLE "public"."btb_used_nonces" TO "authenticated";
GRANT ALL ON TABLE "public"."btb_used_nonces" TO "service_role";



GRANT ALL ON TABLE "public"."collected_caps" TO "anon";
GRANT ALL ON TABLE "public"."collected_caps" TO "authenticated";
GRANT ALL ON TABLE "public"."collected_caps" TO "service_role";



GRANT ALL ON TABLE "public"."content_appeals" TO "anon";
GRANT ALL ON TABLE "public"."content_appeals" TO "authenticated";
GRANT ALL ON TABLE "public"."content_appeals" TO "service_role";



GRANT ALL ON TABLE "public"."enterprise_codes" TO "anon";
GRANT ALL ON TABLE "public"."enterprise_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."enterprise_codes" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_profiles" TO "anon";
GRANT ALL ON TABLE "public"."equipment_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."forum_bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."forum_bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."forum_categories" TO "anon";
GRANT ALL ON TABLE "public"."forum_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_categories" TO "service_role";



GRANT ALL ON TABLE "public"."forum_poll_options" TO "anon";
GRANT ALL ON TABLE "public"."forum_poll_options" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_poll_options" TO "service_role";



GRANT ALL ON TABLE "public"."forum_poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."forum_poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_poll_votes" TO "service_role";



GRANT ALL ON TABLE "public"."forum_polls" TO "anon";
GRANT ALL ON TABLE "public"."forum_polls" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_polls" TO "service_role";



GRANT ALL ON TABLE "public"."forum_posts" TO "anon";
GRANT ALL ON TABLE "public"."forum_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_posts" TO "service_role";



GRANT ALL ON TABLE "public"."forum_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."forum_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."forum_threads" TO "anon";
GRANT ALL ON TABLE "public"."forum_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_threads" TO "service_role";



GRANT ALL ON TABLE "public"."forum_votes" TO "anon";
GRANT ALL ON TABLE "public"."forum_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_votes" TO "service_role";



GRANT ALL ON TABLE "public"."label_templates" TO "anon";
GRANT ALL ON TABLE "public"."label_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."label_templates" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rating_used_nonces" TO "anon";
GRANT ALL ON TABLE "public"."rating_used_nonces" TO "authenticated";
GRANT ALL ON TABLE "public"."rating_used_nonces" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."scan_event_members" TO "anon";
GRANT ALL ON TABLE "public"."scan_event_members" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_event_members" TO "service_role";



GRANT ALL ON TABLE "public"."scan_events" TO "anon";
GRANT ALL ON TABLE "public"."scan_events" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_events" TO "service_role";



GRANT ALL ON TABLE "public"."scan_intent_feedback" TO "anon";
GRANT ALL ON TABLE "public"."scan_intent_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_intent_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_history" TO "anon";
GRANT ALL ON TABLE "public"."subscription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_history" TO "service_role";



GRANT ALL ON TABLE "public"."tasting_score_events" TO "anon";
GRANT ALL ON TABLE "public"."tasting_score_events" TO "authenticated";
GRANT ALL ON TABLE "public"."tasting_score_events" TO "service_role";



GRANT ALL ON TABLE "public"."team_knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."team_knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."team_knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."team_knowledge_chunks" TO "anon";
GRANT ALL ON TABLE "public"."team_knowledge_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."team_knowledge_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."user_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."user_stash" TO "anon";
GRANT ALL ON TABLE "public"."user_stash" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stash" TO "service_role";



GRANT ALL ON TABLE "public"."vibe_check_used_nonces" TO "anon";
GRANT ALL ON TABLE "public"."vibe_check_used_nonces" TO "authenticated";
GRANT ALL ON TABLE "public"."vibe_check_used_nonces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































