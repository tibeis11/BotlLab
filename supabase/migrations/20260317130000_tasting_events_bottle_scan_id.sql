-- ============================================================================
-- tasting_score_events: bottle_scan_id column
--
-- Links each tasting event (vibe_check, beat_the_brewer, rating_given) back
-- to the exact bottle_scan that triggered it. This enables the CIS engine
-- to look up whether a scan led to a meaningful consumer action and apply
-- the appropriate scoring bonus.
-- ============================================================================

-- 1. Add column
ALTER TABLE public.tasting_score_events
  ADD COLUMN IF NOT EXISTS bottle_scan_id UUID
    REFERENCES public.bottle_scans(id) ON DELETE SET NULL;

-- 2. Index for fast lookup by scan id
CREATE INDEX IF NOT EXISTS idx_tasting_score_events_bottle_scan_id
  ON public.tasting_score_events(bottle_scan_id)
  WHERE bottle_scan_id IS NOT NULL;

COMMENT ON COLUMN public.tasting_score_events.bottle_scan_id IS
  'FK to bottle_scans.id — links the tasting event to the QR scan that preceded it.';
