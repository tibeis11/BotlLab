-- Migration: CIS Environment Context — Phase 1.1
-- Adds local_time to bottle_scans for timezone-aware CIS scoring.
--
-- Column type is `timestamp without time zone` (NOT timestamptz).
-- The client inserts its local wall-clock time as a naive datetime string
-- (e.g. "2026-03-17T21:00:00.000", no Z, no offset).  By using a plain
-- timestamp, PostgreSQL stores it verbatim — EXTRACT(HOUR FROM local_time)
-- always returns the user's LOCAL hour regardless of server timezone.
--
-- scanned_at_hour stays as-is for backward compat; new CIS logic reads local_time.

ALTER TABLE bottle_scans
ADD COLUMN IF NOT EXISTS local_time timestamp WITHOUT TIME ZONE NULL;

COMMENT ON COLUMN bottle_scans.local_time IS
  'Client wall-clock datetime at scan time (no timezone). '
  'Inserted as "YYYY-MM-DDTHH:MM:SS" so EXTRACT(HOUR) returns the local hour. '
  'Used for: timezone-correct hour comparison, weekend/holiday detection in CIS scoring.';
