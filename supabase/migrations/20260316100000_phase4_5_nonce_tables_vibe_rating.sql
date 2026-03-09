-- ============================================================================
-- Phase 4 + 5: Token-Nonce-Tabellen für VibeCheck und Rating
--
-- Jeder QR-Scan erzeugt ein Token. Dieses Token wird EINMALIG pro
-- Kombination (nonce, bottle_id, brew_id, session_id) verbrannt.
-- Wird die Flasche neu befüllt (neuer Sud → neue session_id/brew_id),
-- funktioniert derselbe physische QR-Code erneut.
--
-- session_id ist nullable → PostgreSQL kann NULL nicht in einem
-- normalen PRIMARY KEY verarbeiten. Deshalb: Surrogate UUID PK +
-- UNIQUE INDEX mit COALESCE auf einen Sentinel-UUID.
--
-- RLS: Kein Enduser darf direkt lesen/schreiben.
-- Zugriff ausschließlich via service_role (Server Actions).
-- ============================================================================


-- ─── 1. vibe_check_used_nonces ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vibe_check_used_nonces (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce      TEXT        NOT NULL,
  bottle_id  UUID        NOT NULL REFERENCES public.bottles(id) ON DELETE CASCADE,
  brew_id    UUID        NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  session_id UUID        REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash    TEXT        -- SHA-256-Hash, niemals Plain-IP speichern
);

-- Eindeutigkeit auch bei NULL-session_id erzwingen
CREATE UNIQUE INDEX IF NOT EXISTS unique_vibe_check_nonce
ON public.vibe_check_used_nonces (
  nonce,
  bottle_id,
  brew_id,
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- RLS: Kein direkter Zugriff — nur service_role
ALTER TABLE public.vibe_check_used_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.vibe_check_used_nonces
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.vibe_check_used_nonces
  IS 'Anti-Replay Nonces für VibeCheck. Jeder QR-Token wird pro Sud/Flasche/Rezept einmalig verbrannt.';


-- ─── 2. rating_used_nonces ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rating_used_nonces (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce      TEXT        NOT NULL,
  bottle_id  UUID        NOT NULL REFERENCES public.bottles(id) ON DELETE CASCADE,
  brew_id    UUID        NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  session_id UUID        REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash    TEXT
);

-- Eindeutigkeit auch bei NULL-session_id erzwingen
CREATE UNIQUE INDEX IF NOT EXISTS unique_rating_nonce
ON public.rating_used_nonces (
  nonce,
  bottle_id,
  brew_id,
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- RLS: Kein direkter Zugriff — nur service_role
ALTER TABLE public.rating_used_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.rating_used_nonces
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.rating_used_nonces
  IS 'Anti-Replay Nonces für Ratings. Jeder QR-Token wird pro Sud/Flasche/Rezept einmalig verbrannt. Bewertung zusätzlich limitiert auf 1x pro User pro Rezept.';
