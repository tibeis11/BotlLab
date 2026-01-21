-- ============================================================================
-- ADMIN ANALYTICS: Setup Cron Jobs for Aggregation
-- Created: 2026-01-21
-- Purpose: Automated data aggregation via Edge Functions
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: These cron jobs will call Supabase Edge Functions
-- Edge Functions must be deployed first before these will work
-- For local development, these can be triggered manually via API calls

-- ============================================================================
-- Daily Aggregation (runs at 2 AM every day)
-- ============================================================================
-- Aggregates previous day's data into:
-- - analytics_user_daily
-- - analytics_brewery_daily
-- - analytics_content_daily
-- - analytics_feature_usage

SELECT cron.schedule(
  'aggregate-daily-analytics',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url:='http://127.0.0.1:54321/functions/v1/aggregate-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{"mode": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Hourly Aggregation (runs every hour at :05)
-- ============================================================================
-- Aggregates last hour's data into:
-- - analytics_system_hourly

SELECT cron.schedule(
  'aggregate-hourly-analytics',
  '5 * * * *', -- Every hour at :05
  $$
  SELECT net.http_post(
    url:='http://127.0.0.1:54321/functions/v1/aggregate-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{"mode": "hourly"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Cohort Calculation (runs weekly on Monday at 3 AM)
-- ============================================================================
-- Recalculates retention metrics for all cohorts

SELECT cron.schedule(
  'calculate-cohorts',
  '0 3 * * 1', -- Every Monday at 3 AM
  $$
  SELECT net.http_post(
    url:='http://127.0.0.1:54321/functions/v1/aggregate-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{"mode": "cohorts"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Feature Usage Aggregation (runs daily at 2:30 AM)
-- ============================================================================

SELECT cron.schedule(
  'aggregate-feature-usage',
  '30 2 * * *', -- Daily at 2:30 AM
  $$
  SELECT net.http_post(
    url:='http://127.0.0.1:54321/functions/v1/aggregate-analytics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{"mode": "features"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Data Retention Cleanup (runs daily at 4 AM)
-- ============================================================================
-- Deletes old raw analytics_events data (already aggregated)
-- Keeps last 90 days of raw events for debugging

SELECT cron.schedule(
  'cleanup-raw-analytics',
  '0 4 * * *', -- Daily at 4 AM
  $$
  DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM analytics_system_hourly WHERE timestamp < NOW() - INTERVAL '365 days';
  $$
);

-- ============================================================================
-- View all scheduled jobs
-- ============================================================================
-- To check status: SELECT * FROM cron.job;
-- To check execution history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

COMMENT ON EXTENSION pg_cron IS 'Scheduled jobs for analytics aggregation and cleanup';
