-- ============================================================================
-- Phase 1.1b — anonymous_game_sessions Tabelle
--
-- Speichert anonyme BTB- und VibeCheck-Abgaben für:
-- 1. State-Persistenz (Session-Token für späteres Claiming)
-- 2. Post-Registrierung Attribution (claimed_by_user_id)
-- 3. Analytics (anonyme vs. eingeloggte Plays zählen)
--
-- FK auf flavor_profiles.id → verknüpft die anonyme Abgabe mit dem
-- tatsächlichen Profil-Eintrag, der in flavor_profiles steht.
--
-- Voraussetzung: 20260315110000_phase1_flavor_profiles_anonymous.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_game_sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT         UNIQUE NOT NULL,
  event_type      TEXT         NOT NULL CHECK (event_type IN ('beat_the_brewer', 'vibe_check')),
  brew_id         UUID         NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  payload         JSONB        NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  match_score     NUMERIC(5,4),
  match_percent   INT,
  claimed_by_user_id UUID      REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash         TEXT         NOT NULL,
  flavor_profile_id UUID      REFERENCES public.flavor_profiles(id) ON DELETE SET NULL,
  bottle_id       UUID         REFERENCES public.bottles(id) ON DELETE SET NULL,
  session_id      UUID         REFERENCES public.brewing_sessions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_anon_sessions_brew_id
  ON public.anonymous_game_sessions(brew_id);
CREATE INDEX IF NOT EXISTS idx_anon_sessions_token
  ON public.anonymous_game_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_anon_sessions_expires
  ON public.anonymous_game_sessions(expires_at)
  WHERE claimed_by_user_id IS NULL;

-- Spam-Schutz: Max 1 anonymer BTB-Eintrag pro Brew + IP (ungeclaimed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_sessions_btb_limit
  ON public.anonymous_game_sessions (brew_id, ip_hash)
  WHERE claimed_by_user_id IS NULL AND event_type = 'beat_the_brewer';

-- Bottle-scope VibeCheck: 1 anonymer VibeCheck pro Flasche + IP (ungeclaimed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_sessions_vibe_bottle_limit
  ON public.anonymous_game_sessions (bottle_id, ip_hash)
  WHERE claimed_by_user_id IS NULL
    AND event_type = 'vibe_check'
    AND bottle_id IS NOT NULL;

-- ─── Row Level Security ───
ALTER TABLE public.anonymous_game_sessions ENABLE ROW LEVEL SECURITY;

-- Nur Service Role darf lesen (für Claiming-Flow + Analytics)
CREATE POLICY "anon_sessions_service_select"
  ON public.anonymous_game_sessions FOR SELECT
  USING (auth.role() = 'service_role');

-- Nur Service Role darf einfügen (Server Actions via createAdminClient)
CREATE POLICY "anon_sessions_service_insert"
  ON public.anonymous_game_sessions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Nur Service Role darf updaten (Claiming: claimed_by_user_id setzen)
CREATE POLICY "anon_sessions_service_update"
  ON public.anonymous_game_sessions FOR UPDATE
  USING (auth.role() = 'service_role');

-- Nur Service Role darf löschen (pg_cron Cleanup)
CREATE POLICY "anon_sessions_service_delete"
  ON public.anonymous_game_sessions FOR DELETE
  USING (auth.role() = 'service_role');
