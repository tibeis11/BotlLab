


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






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
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


CREATE OR REPLACE FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") RETURNS "record"
    LANGUAGE "plpgsql"
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

  -- Check if reset is needed
  IF NOW() >= v_reset_date THEN
    UPDATE profiles
    SET ai_credits_used_this_month = 0,
        ai_credits_reset_at = date_trunc('month', NOW() + interval '1 month')
    WHERE id = user_id;
    v_used := 0;
  END IF;

  -- Get tier limit (Free is now 0)
  v_limit := CASE v_tier
    WHEN 'free' THEN 0
    WHEN 'brewer' THEN 50
    WHEN 'brewery' THEN 200
    WHEN 'enterprise' THEN -1  -- unlimited
    ELSE 0
  END;

  -- Check limit
  IF v_limit != -1 AND v_used >= v_limit THEN
    can_use := FALSE;
    reason := 'Monthly AI limit reached';
    RETURN;
  END IF;

  -- Check subscription status (Only brewer, brewery and enterprise need an active check, 
  -- but since free is 0 now, this is mostly for safety)
  IF v_tier != 'free' AND v_status != 'active' AND v_status != 'trial' THEN
    can_use := FALSE;
    reason := 'Subscription inactive';
    RETURN;
  END IF;

  -- Increment counter
  UPDATE profiles
  SET ai_credits_used_this_month = ai_credits_used_this_month + 1
  WHERE id = user_id;

  can_use := TRUE;
  reason := 'OK';
END;
$$;


ALTER FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."get_auth_user_brewery_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT brewery_id 
    FROM brewery_members 
    WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_brewery_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_brewery_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT brewery_id FROM brewery_members WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_brewery_ids"() OWNER TO "postgres";


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
declare
    brew_owner_id uuid;
    brew_name text;
begin
    -- 1. Get the owner of the brew
    select user_id, name into brew_owner_id, brew_name
    from public.brews
    where id = new.brew_id;

    -- 2. Determine if we should notify
    -- Constraint: Do NOT notify if user likes their own brew
    if brew_owner_id is distinct from new.user_id then
        
        insert into public.notifications (
            user_id,
            actor_id,
            type,
            data
        ) values (
            brew_owner_id,
            new.user_id,
            'brew_like',
            jsonb_build_object(
                'brew_id', new.brew_id,
                'brew_name', brew_name
            )
        );
        
    end if;

    return new;
end;
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
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
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


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates profile for new user with Free tier (fixed username->display_name)';



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


CREATE OR REPLACE FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_analytics_report_settings_updated_at"() OWNER TO "postgres";

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
    CONSTRAINT "check_brew_type" CHECK (("brew_type" = ANY (ARRAY['beer'::"text", 'wine'::"text", 'softdrink'::"text"])))
);


ALTER TABLE "public"."brews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."brews"."is_public" IS 'Bestimmt, ob das Rezept öffentlich auf der Brauerei-Seite und in Discovery angezeigt wird';



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



CREATE TABLE IF NOT EXISTS "public"."analytics_daily_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "brewery_id" "uuid" NOT NULL,
    "brew_id" "uuid",
    "country_code" "text",
    "device_type" "text",
    "total_scans" integer DEFAULT 0 NOT NULL,
    "unique_visitors" integer DEFAULT 0 NOT NULL,
    "hour_distribution" "jsonb"
);


ALTER TABLE "public"."analytics_daily_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_daily_stats" IS 'Pre-aggregated daily scan statistics for fast dashboard queries';



COMMENT ON COLUMN "public"."analytics_daily_stats"."hour_distribution" IS 'JSON object with hourly scan distribution: {"0": 5, "1": 3, "14": 45, ...}';



CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "path" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "user_agent" "text"
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


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
    CONSTRAINT "bottle_scans_device_type_check" CHECK (("device_type" = ANY (ARRAY['mobile'::"text", 'desktop'::"text", 'tablet'::"text", 'unknown'::"text"]))),
    CONSTRAINT "bottle_scans_scan_source_check" CHECK (("scan_source" = ANY (ARRAY['qr_code'::"text", 'direct_link'::"text", 'share'::"text"])))
);


ALTER TABLE "public"."bottle_scans" OWNER TO "postgres";


COMMENT ON TABLE "public"."bottle_scans" IS 'Tracks QR code scans for brewery analytics (GDPR-compliant, no IP storage)';



COMMENT ON COLUMN "public"."bottle_scans"."scanned_at_hour" IS 'Hour of day (0-23) when scan occurred. Used for time-to-glass analysis.';



COMMENT ON COLUMN "public"."bottle_scans"."converted_to_rating" IS 'TRUE if user left a rating after scanning. Enables conversion funnel analysis.';



COMMENT ON COLUMN "public"."bottle_scans"."latitude" IS 'Geographic latitude from IP lookup (approximate)';



COMMENT ON COLUMN "public"."bottle_scans"."longitude" IS 'Geographic longitude from IP lookup (approximate)';



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
    "scan_count" integer DEFAULT 0 NOT NULL
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
    CONSTRAINT "breweries_tier_check" CHECK (("tier" = ANY (ARRAY['garage'::"text", 'micro'::"text", 'craft'::"text", 'industrial'::"text"])))
);


ALTER TABLE "public"."breweries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."breweries"."tier" IS 'Brewery tier level (garage/micro/craft/industrial)';



COMMENT ON COLUMN "public"."breweries"."custom_slogan" IS 'Team-defined slogan for Smart Labels (Premium feature)';



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
    "apparent_attenuation" numeric
);


ALTER TABLE "public"."brewing_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collected_caps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "brew_id" "uuid",
    "collected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."collected_caps" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "founded_year" integer,
    "location" "text",
    "bio" "text",
    "website" "text",
    "updated_at" timestamp with time zone,
    "logo_url" "text",
    "banner_url" "text",
    "tier" "text" DEFAULT 'hobby'::"text",
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
    CONSTRAINT "profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text", 'trial'::"text", 'paused'::"text"]))),
    CONSTRAINT "profiles_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'brewer'::"text", 'brewery'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "profiles_tier_check" CHECK (("tier" = ANY (ARRAY['lehrling'::"text", 'geselle'::"text", 'meister'::"text", 'legende'::"text", 'garage'::"text", 'micro'::"text", 'craft'::"text", 'industrial'::"text", 'hobby'::"text", 'braumeister'::"text"])))
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
    CONSTRAINT "ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bottles" ALTER COLUMN "bottle_number" SET DEFAULT "nextval"('"public"."bottles_bottle_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_date_brewery_id_brew_id_country_code__key" UNIQUE ("date", "brewery_id", "brew_id", "country_code", "device_type");



ALTER TABLE ONLY "public"."analytics_daily_stats"
    ADD CONSTRAINT "analytics_daily_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_report_logs"
    ADD CONSTRAINT "analytics_report_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_report_settings"
    ADD CONSTRAINT "analytics_report_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_report_settings"
    ADD CONSTRAINT "analytics_report_settings_user_id_brewery_id_key" UNIQUE ("user_id", "brewery_id");



ALTER TABLE ONLY "public"."bottle_scans"
    ADD CONSTRAINT "bottle_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."brewing_sessions"
    ADD CONSTRAINT "brewing_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_user_id_brew_id_key" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."enterprise_codes"
    ADD CONSTRAINT "enterprise_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."enterprise_codes"
    ADD CONSTRAINT "enterprise_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_brew_id_ip_address_key" UNIQUE ("brew_id", "ip_address");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "unique_user_brew_like" UNIQUE ("user_id", "brew_id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_key" UNIQUE ("user_id", "achievement_id");



CREATE UNIQUE INDEX "breweries_invite_code_idx" ON "public"."breweries" USING "btree" ("invite_code");



CREATE INDEX "brews_data_abv_num_idx" ON "public"."brews" USING "btree" (((("data" ->> 'abv'::"text"))::numeric)) WHERE ("data" ? 'abv'::"text");



CREATE INDEX "brews_data_gin_idx" ON "public"."brews" USING "gin" ("data");



CREATE INDEX "brews_data_ibu_num_idx" ON "public"."brews" USING "btree" (((("data" ->> 'ibu'::"text"))::numeric)) WHERE (("brew_type" = 'beer'::"text") AND ("data" ? 'ibu'::"text"));



CREATE INDEX "idx_ai_usage_date" ON "public"."ai_usage_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_usage_retention" ON "public"."ai_usage_logs" USING "btree" ("created_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_ai_usage_type" ON "public"."ai_usage_logs" USING "btree" ("generation_type");



CREATE INDEX "idx_ai_usage_user" ON "public"."ai_usage_logs" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_brew" ON "public"."analytics_daily_stats" USING "btree" ("brew_id") WHERE ("brew_id" IS NOT NULL);



CREATE INDEX "idx_analytics_category" ON "public"."analytics_events" USING "btree" ("category");



CREATE INDEX "idx_analytics_created_at" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_read" ON "public"."analytics_daily_stats" USING "btree" ("brewery_id", "date" DESC);



CREATE INDEX "idx_analytics_reports_due" ON "public"."analytics_report_settings" USING "btree" ("enabled", "frequency", "send_day") WHERE ("enabled" = true);



CREATE INDEX "idx_analytics_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_bottle_scans_aggregation" ON "public"."bottle_scans" USING "btree" ("brewery_id", "created_at" DESC);



CREATE INDEX "idx_bottle_scans_bottle" ON "public"."bottle_scans" USING "btree" ("bottle_id");



CREATE INDEX "idx_bottle_scans_brew" ON "public"."bottle_scans" USING "btree" ("brew_id") WHERE ("brew_id" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_conversion" ON "public"."bottle_scans" USING "btree" ("brewery_id", "converted_to_rating");



CREATE INDEX "idx_bottle_scans_geo" ON "public"."bottle_scans" USING "btree" ("brewery_id", "latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_bottle_scans_session" ON "public"."bottle_scans" USING "btree" ("session_hash") WHERE ("session_hash" IS NOT NULL);



CREATE INDEX "idx_bottle_scans_time_analysis" ON "public"."bottle_scans" USING "btree" ("brewery_id", "scanned_at_hour") WHERE ("scanned_at_hour" IS NOT NULL);



CREATE INDEX "idx_bottles_brew_id" ON "public"."bottles" USING "btree" ("brew_id");



CREATE INDEX "idx_bottles_brewery_id" ON "public"."bottles" USING "btree" ("brewery_id");



CREATE INDEX "idx_bottles_session_id" ON "public"."bottles" USING "btree" ("session_id");



CREATE INDEX "idx_bottles_user_id" ON "public"."bottles" USING "btree" ("user_id");



CREATE INDEX "idx_breweries_tier" ON "public"."breweries" USING "btree" ("tier");



CREATE INDEX "idx_brewery_feed_brewery_id" ON "public"."brewery_feed" USING "btree" ("brewery_id");



CREATE INDEX "idx_brewery_feed_user_id" ON "public"."brewery_feed" USING "btree" ("user_id");



CREATE INDEX "idx_brewery_members_user_id" ON "public"."brewery_members" USING "btree" ("user_id");



CREATE INDEX "idx_brewing_sessions_brew_id" ON "public"."brewing_sessions" USING "btree" ("brew_id");



CREATE INDEX "idx_brewing_sessions_brewery_id" ON "public"."brewing_sessions" USING "btree" ("brewery_id");



CREATE INDEX "idx_brews_brewery_id" ON "public"."brews" USING "btree" ("brewery_id");



CREATE INDEX "idx_brews_public" ON "public"."brews" USING "btree" ("is_public", "user_id") WHERE ("is_public" = true);



CREATE INDEX "idx_brews_remix_parent_id" ON "public"."brews" USING "btree" ("remix_parent_id");



CREATE INDEX "idx_brews_user_id" ON "public"."brews" USING "btree" ("user_id");



CREATE INDEX "idx_collected_caps_brew_id" ON "public"."collected_caps" USING "btree" ("brew_id");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_profiles_active_brewery_id" ON "public"."profiles" USING "btree" ("active_brewery_id");



CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_profiles_subscription_tier" ON "public"."profiles" USING "btree" ("subscription_tier");



CREATE INDEX "idx_profiles_tier" ON "public"."profiles" USING "btree" ("tier");



CREATE INDEX "idx_report_logs_brewery_date" ON "public"."analytics_report_logs" USING "btree" ("brewery_id", "created_at" DESC);



CREATE INDEX "idx_subscription_history_date" ON "public"."subscription_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_subscription_history_profile" ON "public"."subscription_history" USING "btree" ("profile_id");



CREATE INDEX "idx_user_achievements_achievement" ON "public"."user_achievements" USING "btree" ("achievement_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "likes_brew_id_idx" ON "public"."likes" USING "btree" ("brew_id");



CREATE INDEX "likes_user_id_idx" ON "public"."likes" USING "btree" ("user_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "ratings_brew_id_idx" ON "public"."ratings" USING "btree" ("brew_id");



CREATE OR REPLACE TRIGGER "on_like_change" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_likes_count"();



CREATE OR REPLACE TRIGGER "on_like_notify" AFTER INSERT ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_like_notification"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_fills" AFTER UPDATE ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_fills"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_fills_insert" AFTER INSERT ON "public"."bottles" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_fills_insert"();



CREATE OR REPLACE TRIGGER "trigger_increment_bottle_scan_count" AFTER INSERT ON "public"."bottle_scans" FOR EACH ROW EXECUTE FUNCTION "public"."increment_bottle_scan_count"();



CREATE OR REPLACE TRIGGER "trigger_update_analytics_report_settings_updated_at" BEFORE UPDATE ON "public"."analytics_report_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_analytics_report_settings_updated_at"();



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_profile_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "bottles_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id");



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."brewing_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bottles"
    ADD CONSTRAINT "bottles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



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



ALTER TABLE ONLY "public"."brewing_sessions"
    ADD CONSTRAINT "brewing_sessions_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brewing_sessions"
    ADD CONSTRAINT "brewing_sessions_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_brewery_id_fkey" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id");



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_remix_parent_id_fkey" FOREIGN KEY ("remix_parent_id") REFERENCES "public"."brews"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brews"
    ADD CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collected_caps"
    ADD CONSTRAINT "collected_caps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enterprise_codes"
    ADD CONSTRAINT "enterprise_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



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
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_brew_id_fkey" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Achievements können vergeben werden" ON "public"."user_achievements" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Achievements sind öffentlich lesbar" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Admins can manage enterprise codes" ON "public"."enterprise_codes" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admins can remove members" ON "public"."brewery_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members" "bm"
  WHERE (("bm"."brewery_id" = "brewery_members"."brewery_id") AND ("bm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("bm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Allow update for owners" ON "public"."bottles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Anyone can create a profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Anyone can insert bottle scans" ON "public"."bottle_scans" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Authenticated users can create breweries" ON "public"."breweries" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can view all breweries" ON "public"."breweries" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view breweries" ON "public"."breweries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Brewers can delete ratings of their brews" ON "public"."ratings" FOR DELETE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));



CREATE POLICY "Brewers can update ratings of their brews" ON "public"."ratings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "brews"."user_id"
   FROM "public"."brews"
  WHERE ("brews"."id" = "ratings"."brew_id"))));



CREATE POLICY "Brewery owners can view their analytics" ON "public"."bottle_scans" FOR SELECT TO "authenticated" USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Brewery owners can view their stats" ON "public"."analytics_daily_stats" FOR SELECT TO "authenticated" USING (("brewery_id" IN ( SELECT "brewery_members"."brewery_id"
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."user_id" = "auth"."uid"()) AND ("brewery_members"."role" = 'owner'::"text")))));



CREATE POLICY "Brews are viewable by everyone" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Enable insert access for all users" ON "public"."bottles" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable insert access for all users" ON "public"."brews" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."bottles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."brews" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "Enable read access for members" ON "public"."breweries" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all users" ON "public"."bottles" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable update access for all users" ON "public"."brews" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Everyone can view breweries" ON "public"."breweries" FOR SELECT USING (true);



CREATE POLICY "Jeder kann Ratings erstellen" ON "public"."ratings" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Manage sessions for members" ON "public"."brewing_sessions" USING (("auth"."uid"() IN ( SELECT "brewery_members"."user_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."brewery_id" = "brewing_sessions"."brewery_id"))));



CREATE POLICY "Members can create brewery brews" ON "public"."brews" FOR INSERT WITH CHECK (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can delete brewery brews" ON "public"."brews" FOR DELETE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can manage brewery bottles" ON "public"."bottles" USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can update brewery brews" ON "public"."brews" FOR UPDATE USING (("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")));



CREATE POLICY "Members can view brewery bottles" ON "public"."bottles" FOR SELECT USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Members can view brewery brews" ON "public"."brews" FOR SELECT USING ((("brewery_id" IN ( SELECT "public"."get_my_brewery_ids"() AS "get_my_brewery_ids")) OR ("is_public" = true) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Mitglieder sehen ihre Brauerei" ON "public"."breweries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "breweries"."id") AND ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



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



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public view brewery members" ON "public"."brewery_members" FOR SELECT USING (true);



CREATE POLICY "Ratings sind öffentlich lesbar" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "Service role full access" ON "public"."analytics_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to scans" ON "public"."bottle_scans" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to stats" ON "public"."analytics_daily_stats" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Team members can insert feed items" ON "public"."brewery_feed" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Team members can view feed" ON "public"."brewery_feed" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_feed"."brewery_id") AND ("brewery_members"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "User can only see their own brews" ON "public"."brews" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "User sehen eigene Achievements" ON "public"."user_achievements" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can add themselves to a brewery" ON "public"."brewery_members" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can add to their collection" ON "public"."collected_caps" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own bottles" ON "public"."bottles" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own brews" ON "public"."brews" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."likes" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert own events" ON "public"."analytics_events" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert themselves as members" ON "public"."brewery_members" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can join breweries" ON "public"."brewery_members" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can leave breweries" ON "public"."brewery_members" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage own report settings" ON "public"."analytics_report_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only add to ther own bottles" ON "public"."bottles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only add to ther own brews" ON "public"."brews" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR true));



CREATE POLICY "Users can remove saved brews from their team" ON "public"."brewery_saved_brews" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_saved_brews"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can save brews to their team" ON "public"."brewery_saved_brews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."brewery_members"
  WHERE (("brewery_members"."brewery_id" = "brewery_saved_brews"."brewery_id") AND ("brewery_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can see their own bottles" ON "public"."bottles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view codes if they know the code" ON "public"."enterprise_codes" FOR SELECT USING (true);



CREATE POLICY "Users can view own ai usage logs" ON "public"."ai_usage_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



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



CREATE POLICY "View sessions for members" ON "public"."brewing_sessions" FOR SELECT USING (("auth"."uid"() IN ( SELECT "brewery_members"."user_id"
   FROM "public"."brewery_members"
  WHERE ("brewery_members"."brewery_id" = "brewing_sessions"."brewery_id"))));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_report_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_report_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bottle_scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bottles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breweries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_feed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewery_saved_brews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brewing_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collected_caps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enterprise_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_brews_select" ON "public"."brews" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_brews_select" ON "public"."brews" FOR SELECT USING (("is_public" = true));



CREATE POLICY "public_profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "public_ratings_select" ON "public"."ratings" FOR SELECT USING ((("moderation_status")::"text" = 'auto_approved'::"text"));



ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."brewery_feed";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_timeline_entry"("p_session_id" "uuid", "p_new_entry" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_increment_ai_credits"("user_id" "uuid", OUT "can_use" boolean, OUT "reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_own_squad"("name_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_brewery_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_brewery_ids"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_is_unique" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_stats"("p_date" "date", "p_brewery_id" "uuid", "p_brew_id" "uuid", "p_country_code" "text", "p_device_type" "text", "p_hour" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of"("_brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_enterprise_code"("input_code" "text", "input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_active_brewery"("brewery_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_analytics_report_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_analytics_report_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_analytics_report_settings_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."brews" TO "anon";
GRANT ALL ON TABLE "public"."brews" TO "authenticated";
GRANT ALL ON TABLE "public"."brews" TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_liked"("brew_row" "public"."brews") TO "service_role";
























GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "anon";
GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_daily_stats" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_report_logs" TO "anon";
GRANT ALL ON TABLE "public"."analytics_report_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_report_logs" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_report_settings" TO "anon";
GRANT ALL ON TABLE "public"."analytics_report_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_report_settings" TO "service_role";



GRANT ALL ON TABLE "public"."bottle_scans" TO "anon";
GRANT ALL ON TABLE "public"."bottle_scans" TO "authenticated";
GRANT ALL ON TABLE "public"."bottle_scans" TO "service_role";



GRANT ALL ON TABLE "public"."bottles" TO "anon";
GRANT ALL ON TABLE "public"."bottles" TO "authenticated";
GRANT ALL ON TABLE "public"."bottles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bottles_bottle_number_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."brewing_sessions" TO "anon";
GRANT ALL ON TABLE "public"."brewing_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."brewing_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."collected_caps" TO "anon";
GRANT ALL ON TABLE "public"."collected_caps" TO "authenticated";
GRANT ALL ON TABLE "public"."collected_caps" TO "service_role";



GRANT ALL ON TABLE "public"."enterprise_codes" TO "anon";
GRANT ALL ON TABLE "public"."enterprise_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."enterprise_codes" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_history" TO "anon";
GRANT ALL ON TABLE "public"."subscription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";









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































