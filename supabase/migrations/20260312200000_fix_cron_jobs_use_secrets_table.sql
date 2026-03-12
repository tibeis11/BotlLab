-- ============================================================================
-- Fix: classify-scan-intent + fetch-scan-weather pg_cron jobs
--
-- The previous cron registrations used current_setting('app.settings.service_url')
-- and current_setting('app.site_url') which are never set in production.
-- All other cron jobs use private_system.secrets — align these two as well.
--
-- After applying this migration, set the secrets in Supabase:
--   INSERT INTO private_system.secrets (key, value)
--   VALUES ('APP_URL', 'https://<your-app>.vercel.app'),
--          ('CRON_SECRET', '<your-CRON_SECRET-env-value>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- ============================================================================

-- 1. Add APP_URL + CRON_SECRET placeholders (won't overwrite if already set)
INSERT INTO private_system.secrets (key, value)
VALUES
  ('APP_URL',     'REPLACE_WITH_PRODUCTION_URL'),
  ('CRON_SECRET', 'REPLACE_WITH_CRON_SECRET')
ON CONFLICT (key) DO NOTHING;

-- 2. Fix: classify-scan-intent — every 15 minutes
SELECT cron.unschedule('classify-scan-intent');
SELECT cron.schedule(
  'classify-scan-intent',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM private_system.secrets WHERE key = 'APP_URL')
               || '/api/analytics/classify-scan-intent',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'CRON_SECRET')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. Fix: fetch-scan-weather — every hour at :15
SELECT cron.unschedule('fetch-scan-weather');
SELECT cron.schedule(
  'fetch-scan-weather',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM private_system.secrets WHERE key = 'APP_URL')
               || '/api/analytics/fetch-weather',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'CRON_SECRET')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
