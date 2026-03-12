-- ============================================================================
-- Backfill: tasting_score_events.bottle_scan_id (RELAXED MATCHING)
--
-- Für jede bestehende Zeile in tasting_score_events suchen wir den am besten 
-- passenden bottle_scans-Eintrag:
--   - viewer_user_id = tasting_score_events.user_id
--   - brew_id        = tasting_score_events.brew_id
--
-- Da manche Scans eventuell ein anderes `created_at` aufweisen (oder chronologisch
-- wenige Minuten nach dem Event angelegt wurden), entfernen wir die harte Zeitgrenze (< tse.created_at).
-- Wir nehmen einfach den Scan dieses Users für dieses Brew.
-- Falls mehrere existieren, nehmen wir den neuesten (ORDER BY created_at DESC).
-- ============================================================================

UPDATE public.tasting_score_events tse
SET bottle_scan_id = (
  SELECT bs.id
  FROM   public.bottle_scans bs
  WHERE  bs.viewer_user_id = tse.user_id
    AND  bs.brew_id        = tse.brew_id
  ORDER  BY ABS(EXTRACT(EPOCH FROM (bs.created_at - tse.created_at))) ASC
  LIMIT  1
)
WHERE tse.bottle_scan_id IS NULL
  AND tse.user_id IS NOT NULL
  AND tse.brew_id IS NOT NULL
  AND tse.event_type IN ('vibe_check', 'rating_given', 'beat_the_brewer');
