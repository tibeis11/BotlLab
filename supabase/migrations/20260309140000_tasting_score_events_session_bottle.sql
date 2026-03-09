-- ============================================================================
-- tasting_score_events: proper session_id + bottle_id columns
--
-- Previously session_id (BTB) and bottle_id (VibeCheck) were stored only in
-- metadata JSONB — no FK, no index, no type safety.
--
-- This migration adds real columns, backfills from metadata, and creates
-- proper indexes so all queries can use .eq() instead of metadata->> filters.
-- ============================================================================

-- 1. Add columns
ALTER TABLE public.tasting_score_events
  ADD COLUMN IF NOT EXISTS session_id UUID
    REFERENCES public.brewing_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bottle_id UUID
    REFERENCES public.bottles(id) ON DELETE SET NULL;

-- 2. Backfill from metadata for existing rows
UPDATE public.tasting_score_events
  SET session_id = (metadata->>'session_id')::UUID
  WHERE event_type = 'beat_the_brewer'
    AND metadata->>'session_id' IS NOT NULL
    AND session_id IS NULL;

UPDATE public.tasting_score_events
  SET bottle_id = (metadata->>'bottle_id')::UUID
  WHERE event_type = 'vibe_check'
    AND metadata->>'bottle_id' IS NOT NULL
    AND bottle_id IS NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tasting_score_events_session_id
  ON public.tasting_score_events(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasting_score_events_bottle_id
  ON public.tasting_score_events(bottle_id)
  WHERE bottle_id IS NOT NULL;
