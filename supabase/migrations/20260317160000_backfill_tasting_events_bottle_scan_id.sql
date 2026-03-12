-- ============================================================================
-- Backfill: tasting_score_events.bottle_scan_id
--
-- Für jede bestehende Zeile in tasting_score_events (vibe_check, rating_given,
-- beat_the_brewer) suchen wir den zeitlich passenden bottle_scans-Eintrag:
--   - viewer_user_id = tasting_score_events.user_id
--   - brew_id        = tasting_score_events.brew_id
--   - Scan liegt VOR dem Event (≤ tse.created_at)
--   - Zeitfenster: max. 24 Stunden vor dem Event
--   - Falls mehrere → neuester gewinnt (ORDER BY created_at DESC)
--
-- Nur Zeilen mit bottle_scan_id IS NULL werden aktualisiert (idempotent).
-- Anonyme Events (user_id IS NULL) können nicht zugeordnet werden → skip.
-- ============================================================================

UPDATE public.tasting_score_events tse
SET bottle_scan_id = (
  SELECT bs.id
  FROM   public.bottle_scans bs
  WHERE  bs.viewer_user_id = tse.user_id
    AND  bs.brew_id        = tse.brew_id
    AND  bs.created_at    <= tse.created_at
    AND  bs.created_at    >= tse.created_at - INTERVAL '24 hours'
  ORDER  BY bs.created_at DESC
  LIMIT  1
)
WHERE tse.bottle_scan_id IS NULL
  AND tse.user_id IS NOT NULL
  AND tse.brew_id IS NOT NULL
  AND tse.event_type IN ('vibe_check', 'rating_given', 'beat_the_brewer');
