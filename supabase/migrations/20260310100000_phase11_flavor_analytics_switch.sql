-- ============================================================================
-- Phase 11.6 — Analytics-Umstellung auf flavor_profiles
--
-- Ersetzt die alte Datenquelle (ratings.taste_*) durch flavor_profiles.
-- Die Analytics-Cards zeigen jetzt die Beat-the-Brewer-Dimensionen:
--   sweetness, bitterness, body, roast, fruitiness (statt carbonation, acidity)
--
-- Werte werden auf 0–10 Skala normalisiert (flavor_profiles speichert 0.0–1.0).
-- ============================================================================

-- 1. Neue RPC-Funktion: flavor_profiles statt ratings.taste_*
CREATE OR REPLACE FUNCTION public.get_brew_flavor_profile(p_brew_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bitterness',  ROUND(AVG(bitterness)::numeric  * 10, 1),
    'sweetness',   ROUND(AVG(sweetness)::numeric   * 10, 1),
    'body',        ROUND(AVG(body)::numeric        * 10, 1),
    'roast',       ROUND(AVG(roast)::numeric       * 10, 1),
    'fruitiness',  ROUND(AVG(fruitiness)::numeric  * 10, 1),
    'count',       COUNT(*)
  )
  INTO result
  FROM public.flavor_profiles
  WHERE brew_id = p_brew_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

ALTER FUNCTION public.get_brew_flavor_profile(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_brew_flavor_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brew_flavor_profile(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_brew_flavor_profile(UUID) TO anon;

-- 2. Materialisierte View: Stil-Benchmark aus flavor_profiles
--    Bleibt parallel zur alten brew_style_averages bestehen (kein DROP).
CREATE MATERIALIZED VIEW IF NOT EXISTS public.brew_style_flavor_averages AS
SELECT
  LOWER(TRIM(b.style))                                  AS style_normalized,
  b.style                                                AS style_display,
  COUNT(DISTINCT b.id)                                   AS brew_count,
  COUNT(fp.id)                                           AS profile_count,
  ROUND(AVG(fp.bitterness)::numeric  * 10, 2)           AS avg_bitterness,
  ROUND(AVG(fp.sweetness)::numeric   * 10, 2)           AS avg_sweetness,
  ROUND(AVG(fp.body)::numeric        * 10, 2)           AS avg_body,
  ROUND(AVG(fp.roast)::numeric       * 10, 2)           AS avg_roast,
  ROUND(AVG(fp.fruitiness)::numeric  * 10, 2)           AS avg_fruitiness
FROM public.brews b
JOIN public.flavor_profiles fp ON fp.brew_id = b.id
WHERE
  b.is_public       = true
  AND b.style       IS NOT NULL
  AND TRIM(b.style) <> ''
  AND LOWER(TRIM(b.style)) <> 'unbekannt'
GROUP BY
  LOWER(TRIM(b.style)),
  b.style
HAVING
  COUNT(DISTINCT b.id) >= 3
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS brew_style_flavor_averages_style_idx
  ON public.brew_style_flavor_averages (style_normalized);

GRANT SELECT ON public.brew_style_flavor_averages TO authenticated;

-- 3. Refresh-Funktion fuer den Cron-Job
CREATE OR REPLACE FUNCTION public.refresh_brew_style_flavor_averages()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.brew_style_flavor_averages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 4. Cron: taeglich 03:15 UTC refreshen (5 Min nach dem alten View)
SELECT cron.schedule(
  'refresh-brew-style-flavor-averages',
  '15 3 * * *',
  'SELECT public.refresh_brew_style_flavor_averages()'
);
