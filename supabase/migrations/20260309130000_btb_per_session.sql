-- ============================================================================
-- BTB per brewing session (batch)
--
-- Previously BTB was scoped to (user, brew_id) = per recipe.
-- Different batches of the same recipe can taste differently, so a user
-- should be able to play BTB once per brewing session (batch).
--
-- Changes:
--   1. flavor_profiles: add session_id, new unique index per (user, session)
--   2. flavor_profiles: new anon unique index per (session, ip_hash)
--   3. anonymous_game_sessions: add session_id, update BTB unique index
-- ============================================================================

-- 1. session_id on flavor_profiles
ALTER TABLE public.flavor_profiles
  ADD COLUMN IF NOT EXISTS session_id UUID
    REFERENCES public.brewing_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flavor_profiles_session_id
  ON public.flavor_profiles(session_id)
  WHERE session_id IS NOT NULL;

-- Auth users: 1 profile per user per session (replaces brew-scoped unique when session exists)
CREATE UNIQUE INDEX IF NOT EXISTS uq_flavor_profiles_user_session
  ON public.flavor_profiles(user_id, session_id)
  WHERE session_id IS NOT NULL AND user_id IS NOT NULL;

-- Anon users: 1 profile per session per IP (only if ip_hash column already exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flavor_profiles' AND column_name = 'ip_hash'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flavor_profiles_anon_session_ip
      ON public.flavor_profiles(session_id, ip_hash)
      WHERE user_id IS NULL AND session_id IS NOT NULL;
  END IF;
END $$;

-- 2. session_id on anonymous_game_sessions (only if table already exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'anonymous_game_sessions'
  ) THEN
    ALTER TABLE public.anonymous_game_sessions
      ADD COLUMN IF NOT EXISTS session_id UUID
        REFERENCES public.brewing_sessions(id) ON DELETE SET NULL;

    -- Drop old BTB brew+ip unique index
    DROP INDEX IF EXISTS idx_anon_sessions_btb_limit;

    -- New: 1 anonymous BTB per session + IP (where session is available)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_sessions_btb_session_limit
      ON public.anonymous_game_sessions (session_id, ip_hash)
      WHERE claimed_by_user_id IS NULL
        AND event_type = 'beat_the_brewer'
        AND session_id IS NOT NULL;

    -- Fallback: keep brew+ip uniqueness for bottles without a session
    CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_sessions_btb_brew_limit
      ON public.anonymous_game_sessions (brew_id, ip_hash)
      WHERE claimed_by_user_id IS NULL
        AND event_type = 'beat_the_brewer'
        AND session_id IS NULL;
  END IF;
END $$;
