-- Fix Discrepancy: Link measurements to Session, not Brew
-- Session ID column added in 20260219160000_update_schema_sessions_3_0.sql

-- Add index (separated to ensure column exists)
CREATE INDEX IF NOT EXISTS "idx_measurements_session_id_time" ON "public"."brew_measurements"("session_id", "measured_at");
