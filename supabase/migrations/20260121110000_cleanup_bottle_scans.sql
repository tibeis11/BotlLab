-- Migration: Setup cleanup cron job for brewery analytics
-- Created: 2026-01-21
-- Purpose: Automatically delete raw scan data older than 12 months (GDPR)

-- Enable pg_cron if not already enabled (it should be)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Bottle Scans Cleanup (Daily at 3 AM)
-- ============================================================================
-- Deletes raw scan data older than 12 months.
-- Aggregated data in 'analytics_daily_stats' is preserved indefinitely.
SELECT cron.schedule(
  'cleanup-bottle-scans',
  '0 3 * * *', -- Daily at 3 AM
  $$
  DELETE FROM "public"."bottle_scans" 
  WHERE created_at < NOW() - INTERVAL '12 months';
  $$
);

-- Note: 'analytics_daily_stats' table does not need cleanup as it 
-- contains no PII and is needed for long-term trend analysis.
