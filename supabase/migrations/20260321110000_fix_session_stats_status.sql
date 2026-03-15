-- Fix: accept both 'ARCHIVED' and 'completed' sessions for stats aggregation
-- Quick sessions use status='completed', full sessions use status='ARCHIVED'

CREATE OR REPLACE FUNCTION fn_update_recipe_session_stats(p_brew_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'og_sg',         ROUND(AVG(measured_og)::numeric, 4),
    'fg_sg',         ROUND(AVG(measured_fg)::numeric, 4),
    'abv',           ROUND(AVG(measured_abv)::numeric, 2),
    'efficiency',    ROUND(AVG(measured_efficiency)::numeric, 1),
    'abv_min',       ROUND(MIN(measured_abv)::numeric, 2),
    'abv_max',       ROUND(MAX(measured_abv)::numeric, 2),
    'og_sg_min',     ROUND(MIN(measured_og)::numeric, 4),
    'og_sg_max',     ROUND(MAX(measured_og)::numeric, 4),
    'session_count', COUNT(*),
    'last_updated',  NOW()
  )
  INTO v_stats
  FROM (
    SELECT measured_og, measured_fg, measured_abv, measured_efficiency
    FROM brewing_sessions
    WHERE brew_id     = p_brew_id
      AND status      IN ('ARCHIVED', 'completed')
      AND measured_og IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 10
  ) sub;

  IF (v_stats ->> 'session_count')::int > 0 THEN
    UPDATE brews
    SET session_stats = v_stats
    WHERE id = p_brew_id;
  END IF;
END;
$$;
