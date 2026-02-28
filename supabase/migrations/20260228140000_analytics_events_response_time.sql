-- Migration: Add response_time_ms column to analytics_events
-- Allows API route handlers to report their response latency.
-- Used by aggregate-analytics Edge Function to compute avg_response_time_ms
-- in analytics_system_hourly.

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

COMMENT ON COLUMN public.analytics_events.response_time_ms IS
  'Optional API response time in milliseconds, set by instrumented route handlers.';
