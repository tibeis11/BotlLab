-- =============================================================================
-- Migration: Backfill logged_in_scans from bottle_scans history
-- =============================================================================
-- Problem: The logged_in_scans column was added in migration 20260301000000
-- with DEFAULT 0. All historical analytics_daily_stats rows have
-- logged_in_scans=0 even though bottle_scans.viewer_user_id proves
-- users were logged in. This breaks the Verified Drinker Funnel:
-- Cap Collectors=1 but Eingeloggte Besuche=0 is logically impossible.
--
-- Fix: Recalculate logged_in_scans from bottle_scans source of truth.
-- =============================================================================

-- Backfill logged_in_scans by counting bottle_scans with viewer_user_id
UPDATE public.analytics_daily_stats ads
SET logged_in_scans = backfill.logged_count
FROM (
  SELECT
    (bs.created_at::date)                                                       AS scan_date,
    bs.brewery_id,
    COALESCE(bs.brew_id,      '00000000-0000-0000-0000-000000000000'::uuid)    AS brew_id_key,
    COALESCE(bs.country_code, '')                                              AS country_key,
    COALESCE(bs.device_type,  '')                                              AS device_key,
    COUNT(*) FILTER (WHERE bs.viewer_user_id IS NOT NULL)                      AS logged_count
  FROM public.bottle_scans bs
  WHERE bs.brewery_id IS NOT NULL
  GROUP BY scan_date, bs.brewery_id, brew_id_key, country_key, device_key
) backfill
WHERE ads.date         = backfill.scan_date
  AND ads.brewery_id   = backfill.brewery_id
  AND COALESCE(ads.brew_id,      '00000000-0000-0000-0000-000000000000'::uuid) = backfill.brew_id_key
  AND COALESCE(ads.country_code, '') = backfill.country_key
  AND COALESCE(ads.device_type,  '') = backfill.device_key;

-- Verification query (run manually to confirm):
-- SELECT 
--   SUM(total_scans) AS total,
--   SUM(logged_in_scans) AS logged_in,
--   SUM(unique_visitors) AS unique_v
-- FROM analytics_daily_stats;
