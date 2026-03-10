-- Stage 4: BotlGuide Proactive Insights
-- Opt-out flag + pg_cron job for the proactive-check edge function

-- 1. Add opt-out flag to profiles (default: insights enabled)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS botlguide_insights_enabled boolean NOT NULL DEFAULT true;

-- 2. Register pg_cron job for botlguide-proactive-check (every 6 hours)
-- Only runs if pg_cron extension is available (Supabase Pro / Enterprise)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule if already exists to avoid duplicates (ignore if not found)
    BEGIN
      PERFORM cron.unschedule('botlguide-proactive-check');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'botlguide-proactive-check',
      '0 */6 * * *',  -- every 6 hours
      $cron$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_edge_functions_url') || '/botlguide-proactive-check',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
          ),
          body := jsonb_build_object('source', 'cron')
        );
      $cron$
    );
  END IF;
END $$;
