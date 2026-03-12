-- Migration: CIS Environment Context — Phase 1.2
-- Nightly aggregation: typical_scan_hour + typical_temperature per brew.
--
-- Registers:
--   1. SQL function  aggregate_cis_brew_context()  (called by Edge Function)
--   2. pg_cron schedule  aggregate-cis-context  (03:00 UTC daily)

-- ============================================================================
-- 1. Aggregation function
-- ============================================================================
-- Runs as SECURITY DEFINER so the Edge Function's service-role JWT
-- is enough to invoke it — no direct table grants needed.

CREATE OR REPLACE FUNCTION aggregate_cis_brew_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brews b
  SET
    -- MODE() is the correct aggregation for cyclic hour data.
    -- AVG({23,1}) = 12 (midnight) — completely wrong.
    -- MODE({23,23,1}) = 23         — correct.
    typical_scan_hour = (
      SELECT MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM s.local_time)::integer)
      FROM   bottle_scans s
      WHERE  s.brew_id          = b.id
        AND  s.local_time       IS NOT NULL
        AND  (s.converted_to_rating = TRUE OR s.confirmed_drinking = TRUE)
        AND  s.created_at       > NOW() - INTERVAL '90 days'
    ),
    -- AVG is correct for temperature (not cyclic).
    -- Use weather_temp_c — the actual column name in bottle_scans.
    typical_temperature = (
      SELECT ROUND(AVG(s.weather_temp_c))::integer
      FROM   bottle_scans s
      WHERE  s.brew_id           = b.id
        AND  s.weather_temp_c    IS NOT NULL
        AND  (s.converted_to_rating = TRUE OR s.confirmed_drinking = TRUE)
        AND  s.created_at        > NOW() - INTERVAL '90 days'
    );
END;
$$;

-- ============================================================================
-- 2. Nightly cron (03:00 UTC — after midnight, before the daily analytics job)
-- ============================================================================
SELECT cron.schedule(
  'aggregate-cis-context',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL')
               || '/functions/v1/aggregate-cis-context',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
