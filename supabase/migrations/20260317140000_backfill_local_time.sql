-- Backfill local_time for older scans using created_at
-- This allows the new CIS aggregated metrics to calculate using historical data

UPDATE bottle_scans
SET local_time = created_at
WHERE local_time IS NULL;
