-- ============================================================================
-- VibeCheck per-bottle scope
--
-- Previously VibeCheck was uniquely scoped to (user/ip, brew_id).
-- Different bottles of the same recipe can taste differently (batch variance,
-- off-flavors) so a user should be able to VibeCheck each physical bottle.
--
-- Changes:
--   1. Add bottle_id to anonymous_game_sessions
--   2. Drop old brew-scoped vibe_check unique index
--   3. Add new bottle-scoped vibe_check unique index
-- ============================================================================

-- 1. Add bottle_id column (nullable for backward compat with existing rows + BTB)
ALTER TABLE public.anonymous_game_sessions
  ADD COLUMN IF NOT EXISTS bottle_id UUID REFERENCES public.bottles(id) ON DELETE SET NULL;

-- 2. Drop old brew+ip unique index for vibe_check
DROP INDEX IF EXISTS idx_anon_sessions_vibe_limit;

-- 3. New index: 1 anonymous vibe_check per bottle + IP (unclaimed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_sessions_vibe_bottle_limit
  ON public.anonymous_game_sessions (bottle_id, ip_hash)
  WHERE claimed_by_user_id IS NULL
    AND event_type = 'vibe_check'
    AND bottle_id IS NOT NULL;
