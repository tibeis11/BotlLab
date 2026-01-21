-- ============================================================================
-- ADMIN ANALYTICS: Setup Cron Jobs (Private Table Strategy)
-- Created: 2026-01-21
-- Purpose: Automated data aggregation without relying on ALTER DATABASE permissions
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Create a secure table for configuration keys
CREATE SCHEMA IF NOT EXISTS private_system;

CREATE TABLE IF NOT EXISTS private_system.secrets (
    key text PRIMARY KEY,
    value text NOT NULL
);

-- Secure it: Only Postgres/ServiceRole can read
ALTER TABLE private_system.secrets ENABLE ROW LEVEL SECURITY;
-- No standard policies means public has NO access anyway, which is good.

-- ============================================================================
-- Daily Aggregation (runs at 2 AM every day)
-- ============================================================================

SELECT cron.schedule(
  'aggregate-daily-analytics',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Hourly Aggregation (runs every hour at :05)
-- ============================================================================

SELECT cron.schedule(
  'aggregate-hourly-analytics',
  '5 * * * *', -- Every hour at :05
  $$
  SELECT net.http_post(
     url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "hourly"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Cohort Calculation (runs weekly on Monday at 3 AM)
-- ============================================================================

SELECT cron.schedule(
  'calculate-cohorts',
  '0 3 * * 1', -- Every Monday at 3 AM
  $$
  SELECT net.http_post(
     url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
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
     url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "features"}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- Data Retention Cleanup (runs daily at 4 AM)
-- ============================================================================

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
