-- ============================================================================
-- Phase 8: Konsolidierung der Event-Tabellen
--
-- Bisher: Eingeloggte Events → tasting_score_events (user_id NOT NULL)
--         Gast-Events       → anonymous_game_sessions (separate Tabelle)
--
-- Neu:    ALLE Events       → tasting_score_events (user_id nullable)
--         Gäste nutzen session_token + ip_hash statt user_id.
--         Bei Registrierung: einfaches UPDATE statt Tabellenumkopierung.
--
-- Rollback-Strategie: Backup-Tabelle wird angelegt. Nach 30 Tagen manuell
-- droppen, wenn keine Probleme aufgetreten sind.
-- ============================================================================


-- ─── 1. Schema-Änderungen an tasting_score_events ───────────────────────────

-- 1a. user_id auf nullable setzen (Gäste haben keine user_id)
ALTER TABLE public.tasting_score_events
  ALTER COLUMN user_id DROP NOT NULL;

-- 1b. Neue Spalten für Gast-Tracking
ALTER TABLE public.tasting_score_events
  ADD COLUMN IF NOT EXISTS session_token TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- 1c. session_token ist unique (für Claiming: UPDATE WHERE session_token = X)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasting_score_events_session_token
  ON public.tasting_score_events(session_token)
  WHERE session_token IS NOT NULL;


-- ─── 2. RLS-Policies aktualisieren ─────────────────────────────────────────
-- Alte Policies referenzieren user_id = auth.uid() — das bricht, wenn
-- user_id NULL ist (Gäste). Wir ersetzen sie.

-- 2a. Alte SELECT-Policy droppen und neu anlegen
DROP POLICY IF EXISTS "Users can view their own tasting score events"
  ON public.tasting_score_events;

CREATE POLICY "Users can view their own tasting score events"
  ON public.tasting_score_events FOR SELECT
  USING (
    -- Auth-User: Eigene Events sehen
    (user_id IS NOT NULL AND user_id = auth.uid())
    -- Gäste: Kein direkter Zugriff (Daten nur via service_role Server Actions)
  );

-- 2b. Alte INSERT-Policy droppen und neu anlegen
-- Inserts laufen ausschließlich über service_role (Server Actions)
DROP POLICY IF EXISTS "Server-side insert only for tasting score events"
  ON public.tasting_score_events;

CREATE POLICY "Service role insert for tasting score events"
  ON public.tasting_score_events FOR INSERT
  WITH CHECK (
    -- Auth-User darf eigene Events einfügen
    (user_id IS NOT NULL AND user_id = auth.uid())
    -- Gäste-Inserts via service_role: kein auth.uid() verfügbar,
    -- service_role bypassed RLS automatisch
  );

-- 2c. UPDATE-Policy für Claiming (session_token → user_id setzen)
CREATE POLICY "Service role update for claiming anonymous events"
  ON public.tasting_score_events FOR UPDATE
  USING (
    -- Nur eigene Events oder service_role (RLS bypass)
    user_id IS NULL OR user_id = auth.uid()
  )
  WITH CHECK (
    -- Nach dem Update muss der User gesetzt sein
    user_id = auth.uid()
  );


-- ─── 3. Backup der anonymous_game_sessions ─────────────────────────────────
-- Guard: Tabelle könnte bereits durch eine frühere Migration gedroppt worden sein.

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'anonymous_game_sessions'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.anonymous_game_sessions_backup AS
      SELECT * FROM public.anonymous_game_sessions;

    COMMENT ON TABLE public.anonymous_game_sessions_backup
      IS 'Backup von anonymous_game_sessions vor Konsolidierung (Phase 8). Kann nach 30 Tagen gelöscht werden.';
  END IF;
END $$;


-- ─── 4. Historische UNGECLAIMTE Daten migrieren ─────────────────────────────
-- Guard: Nur ausführen wenn die Quelltabelle noch existiert.

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'anonymous_game_sessions'
  ) THEN
    INSERT INTO public.tasting_score_events (
      user_id,
      event_type,
      brew_id,
      points_delta,
      match_score,
      metadata,
      session_token,
      ip_hash,
      created_at
    )
    SELECT
      NULL,
      ags.event_type,
      ags.brew_id,
      0,
      ags.match_score,
      CASE
        WHEN ags.flavor_profile_id IS NOT NULL
        THEN ags.payload || jsonb_build_object('flavor_profile_id', ags.flavor_profile_id)
        ELSE ags.payload
      END,
      ags.session_token,
      ags.ip_hash,
      ags.created_at
    FROM public.anonymous_game_sessions ags
    WHERE ags.claimed_by_user_id IS NULL
      AND ags.expires_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.tasting_score_events tse
        WHERE tse.session_token = ags.session_token
      );
  END IF;
END $$;


-- ─── 5. claim_anonymous_session Funktion aktualisieren ──────────────────────
-- Neue Logik: Statt aus anonymous_game_sessions zu lesen und in
-- tasting_score_events zu kopieren, machen wir nur noch ein UPDATE
-- auf tasting_score_events.

CREATE OR REPLACE FUNCTION public.claim_anonymous_session(
  p_session_token TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_new_iq INT;
  v_points INT;
BEGIN
  -- A: Event atomar claimen via session_token
  UPDATE public.tasting_score_events
  SET user_id = p_user_id
  WHERE session_token = p_session_token
    AND user_id IS NULL
  RETURNING * INTO v_event;

  -- Kein Event gefunden oder bereits geclaimed
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_claimed');
  END IF;

  -- B: flavor_profiles.user_id patchen (über metadata → flavor_profile_id)
  IF v_event.metadata IS NOT NULL AND v_event.metadata->>'flavor_profile_id' IS NOT NULL THEN
    UPDATE public.flavor_profiles
    SET user_id = p_user_id
    WHERE id = (v_event.metadata->>'flavor_profile_id')::UUID
      AND user_id IS NULL;
  END IF;

  -- C: Punkte berechnen + auf Event setzen
  IF v_event.event_type = 'beat_the_brewer' THEN
    v_points := GREATEST(0, LEAST(10, ROUND(COALESCE(v_event.match_score, 0) * 10)));
  ELSE
    v_points := 3; -- VibeCheck fixed points
  END IF;

  -- points_delta war 0, jetzt die echten Punkte setzen
  UPDATE public.tasting_score_events
  SET points_delta = v_points
  WHERE id = v_event.id;

  -- D: Tasting IQ atomar erhöhen
  SELECT public.increment_tasting_iq(p_user_id, v_points) INTO v_new_iq;

  RETURN jsonb_build_object(
    'success', true,
    'event_type', v_event.event_type,
    'brew_id', v_event.brew_id,
    'points_awarded', v_points,
    'new_tasting_iq', v_new_iq
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nur Service Role darf Claiming ausführen
REVOKE ALL ON FUNCTION public.claim_anonymous_session(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_anonymous_session(TEXT, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_anonymous_session(TEXT, UUID) TO service_role;


-- ─── 6. Verifikation & Hinweis ─────────────────────────────────────────────
-- Die Tabelle anonymous_game_sessions wird NICHT automatisch gelöscht.
-- Nach Verifikation (Row-Count-Vergleich) manuell ausführen:
--
--   DROP TABLE public.anonymous_game_sessions;
--
-- Backup (anonymous_game_sessions_backup) nach 30 Tagen manuell droppen:
--
--   DROP TABLE public.anonymous_game_sessions_backup;
--
-- ============================================================================
