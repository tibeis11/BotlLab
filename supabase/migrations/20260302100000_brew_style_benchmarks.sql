-- ============================================================================
-- Phase 4: Bierstil-Benchmark
-- Materialisierte View + Cron-Refresh
-- ============================================================================

-- 4.1 — Materialisierte View: brew_style_averages
-- Aggregiert Taste-Profile-Durchschnitte pro Bierstil über alle öffentlichen Brews.
-- Mindestens 3 verschiedene Brews pro Stil erforderlich (k-Anonymität auf Brew-Ebene).

CREATE MATERIALIZED VIEW IF NOT EXISTS brew_style_averages AS
SELECT
  LOWER(TRIM(b.style))               AS style_normalized,
  b.style                            AS style_display,
  COUNT(DISTINCT b.id)               AS brew_count,
  COUNT(r.id)                        AS rating_count,
  ROUND(AVG(r.rating)::numeric,         2) AS avg_overall,
  ROUND(AVG(r.taste_bitterness)::numeric, 2) AS avg_bitterness,
  ROUND(AVG(r.taste_sweetness)::numeric,  2) AS avg_sweetness,
  ROUND(AVG(r.taste_body)::numeric,       2) AS avg_body,
  ROUND(AVG(r.taste_carbonation)::numeric,2) AS avg_carbonation,
  ROUND(AVG(r.taste_acidity)::numeric,    2) AS avg_acidity
FROM brews b
JOIN ratings r ON r.brew_id = b.id
WHERE
  b.is_public   = true
  AND b.style   IS NOT NULL
  AND TRIM(b.style) <> ''
  AND LOWER(TRIM(b.style)) <> 'unbekannt'
  AND r.moderation_status = 'auto_approved'
GROUP BY
  LOWER(TRIM(b.style)),
  b.style
HAVING
  COUNT(DISTINCT b.id) >= 3   -- Mind. 3 Brews für sinnvollen Benchmark
WITH DATA;

-- Schneller Lookup per normalisertem Stil (unique wegen GROUP BY)
CREATE UNIQUE INDEX IF NOT EXISTS brew_style_averages_style_idx
  ON brew_style_averages (style_normalized);

-- Eingeloggte Nutzer dürfen lesen (kein Schreiben über API möglich)
GRANT SELECT ON brew_style_averages TO authenticated;

-- ============================================================================
-- 4.2 — Cron-Job: tägliches Refresh der materialisierten View
-- ============================================================================

-- Refresh-Funktion (SECURITY DEFINER, damit sie mit owner-Rechten laufen kann)
CREATE OR REPLACE FUNCTION refresh_brew_style_averages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY brew_style_averages;
END;
$$;

-- Cron-Job: täglich um 03:00 UTC
SELECT cron.schedule(
  'refresh-brew-style-averages',
  '0 3 * * *',
  'SELECT refresh_brew_style_averages()'
);
