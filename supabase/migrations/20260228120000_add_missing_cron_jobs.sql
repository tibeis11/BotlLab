-- ============================================================================
-- Add missing cron jobs: expire-subscriptions + evaluate-alerts
-- Created: 2026-02-28
-- Purpose: 
--   1. expire-subscriptions: Downgrade users whose Premium has lapsed
--      (Edge Function existed but was NEVER scheduled — Bug B.2)
--   2. evaluate-alerts: Check live metrics against alert rules and fire
--      alerts into analytics_alert_history
--      (New Edge Function — Phase B.3)
-- ============================================================================

-- Ensure pg_cron and net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 1. Expire Subscriptions (daily at 00:05 UTC)
-- Runs 5 minutes after midnight to process any subscriptions that expired
-- during the previous day. The edge function calls expire_subscriptions() 
-- DB function which downgrades profiles where subscription ends < NOW().
-- ============================================================================

-- Remove any existing duplicate before creating to make migration idempotent
SELECT cron.unschedule('expire-subscriptions-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions-daily'
);

SELECT cron.schedule(
  'expire-subscriptions-daily',
  '5 0 * * *',  -- Daily at 00:05 UTC
  $$
  SELECT net.http_post(
    url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/expire-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- 2. Evaluate Alerts (every 15 minutes)
-- Checks all enabled alert rules against current metrics and inserts into
-- analytics_alert_history when thresholds are exceeded.
-- ============================================================================

SELECT cron.unschedule('evaluate-alerts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'evaluate-alerts'
);

SELECT cron.schedule(
  'evaluate-alerts',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/evaluate-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Verification queries (run manually after deploying):
-- SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname IN ('expire-subscriptions-daily', 'evaluate-alerts')
-- ) ORDER BY start_time DESC LIMIT 10;
-- ============================================================================
