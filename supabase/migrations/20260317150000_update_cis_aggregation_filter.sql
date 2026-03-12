-- Update migration: include probability-based scans in CIS aggregation
-- Allows iterative improvement by also looking at scans where drinking_probability >= 50%

CREATE OR REPLACE FUNCTION aggregate_cis_brew_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brews b
  SET
    typical_scan_hour = (
      SELECT MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM s.local_time)::integer)
      FROM   bottle_scans s
      WHERE  s.brew_id          = b.id
        AND  s.local_time       IS NOT NULL
        AND  (s.converted_to_rating = TRUE OR s.confirmed_drinking = TRUE OR s.drinking_probability >= 50)
        AND  s.created_at       > NOW() - INTERVAL '90 days'
    ),
    typical_temperature = (
      SELECT ROUND(AVG(s.weather_temp_c))::integer
      FROM   bottle_scans s
      WHERE  s.brew_id           = b.id
        AND  s.weather_temp_c    IS NOT NULL
        AND  (s.converted_to_rating = TRUE OR s.confirmed_drinking = TRUE OR s.drinking_probability >= 50)
        AND  s.created_at        > NOW() - INTERVAL '90 days'
    );
END;
$$;