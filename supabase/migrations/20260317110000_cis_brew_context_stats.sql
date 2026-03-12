-- Migration: CIS Environment Context — Phase 1.1 (cont.)
-- Adds typical_scan_hour and typical_temperature to brews.
--
-- These columns are populated nightly by the aggregate-cis-context cron job.
-- classifyCisScans() reads them at classify-time without any sub-queries,
-- keeping real-time classification fast.

ALTER TABLE brews
ADD COLUMN IF NOT EXISTS typical_scan_hour integer NULL,
ADD COLUMN IF NOT EXISTS typical_temperature integer NULL;

COMMENT ON COLUMN brews.typical_scan_hour IS
  'Mode (most frequent) local hour (0–23) of verified scans in the last 90 days. '
  'Set nightly by the aggregate-cis-context Edge Function.';

COMMENT ON COLUMN brews.typical_temperature IS
  'AVG(weather_temp_c) of verified scans in the last 90 days (°C). '
  'Set nightly by the aggregate-cis-context Edge Function.';
