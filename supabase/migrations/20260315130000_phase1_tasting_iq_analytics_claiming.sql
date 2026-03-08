-- ============================================================================
-- Phase 1.1c — increment_tasting_iq Funktion + Analytics-Felder
--
-- 1. Atomare DB-Funktion für Race-Condition-freies IQ-Update (Phase 2.5)
-- 2. BTB-Spielzähler in analytics_brewery_daily (Phase 1.4)
-- 3. Claiming-RPC für atomare Post-Registrierung Attribution (Phase 1.2)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Atomarer Tasting IQ Increment (SECURITY DEFINER)
--    Verhindert Race Conditions bei parallelen Requests.
--    Nur via Service Role aufrufbar (nicht vom Client).
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_tasting_iq(
  p_user_id UUID,
  p_delta INT
)
RETURNS INT AS $$
  UPDATE public.profiles
  SET tasting_iq = COALESCE(tasting_iq, 0) + p_delta
  WHERE id = p_user_id
  RETURNING tasting_iq;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Client-Zugriff verbieten
REVOKE ALL ON FUNCTION public.increment_tasting_iq(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_tasting_iq(UUID, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tasting_iq(UUID, INT) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Analytics-Felder für BTB-Spielzähler
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.analytics_brewery_daily
  ADD COLUMN IF NOT EXISTS btb_plays_total INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS btb_plays_anonymous INT DEFAULT 0;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Claiming-RPC: Atomare Post-Registrierung Attribution
--    Übernimmt in einer Transaktion:
--      a) anonymous_game_sessions.claimed_by_user_id setzen
--      b) flavor_profiles.user_id patchen
--      c) tasting_score_event einfügen (Punkte nachträglich gutschreiben)
--      d) tasting_iq atomar erhöhen
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_anonymous_session(
  p_session_token TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
  v_new_iq INT;
  v_points INT;
BEGIN
  -- A: Session atomar claimen (verhindert Double-Claim)
  UPDATE public.anonymous_game_sessions
  SET claimed_by_user_id = p_user_id
  WHERE session_token = p_session_token
    AND claimed_by_user_id IS NULL
  RETURNING * INTO v_session;

  -- Keine Session gefunden oder bereits geclaimed
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_claimed');
  END IF;

  -- B: flavor_profiles.user_id patchen (nur wenn noch anonym)
  IF v_session.flavor_profile_id IS NOT NULL THEN
    UPDATE public.flavor_profiles
    SET user_id = p_user_id
    WHERE id = v_session.flavor_profile_id
      AND user_id IS NULL;
  END IF;

  -- C: Punkte berechnen + tasting_score_event einfügen
  IF v_session.event_type = 'beat_the_brewer' THEN
    v_points := GREATEST(0, LEAST(10, ROUND(COALESCE(v_session.match_score, 0) * 10)));
  ELSE
    v_points := 3; -- VibeCheck fixed points
  END IF;

  INSERT INTO public.tasting_score_events (
    user_id, event_type, brew_id, points_delta, match_score, metadata
  ) VALUES (
    p_user_id,
    v_session.event_type,
    v_session.brew_id,
    v_points,
    v_session.match_score,
    v_session.payload
  );

  -- D: Tasting IQ atomar erhöhen
  SELECT public.increment_tasting_iq(p_user_id, v_points) INTO v_new_iq;

  RETURN jsonb_build_object(
    'success', true,
    'event_type', v_session.event_type,
    'brew_id', v_session.brew_id,
    'match_percent', v_session.match_percent,
    'points_awarded', v_points,
    'new_tasting_iq', v_new_iq
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nur Service Role darf Claiming ausführen
REVOKE ALL ON FUNCTION public.claim_anonymous_session(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_anonymous_session(TEXT, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_anonymous_session(TEXT, UUID) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. pg_cron Cleanup Jobs
--    Räumt abgelaufene anonyme Sessions und verwaiste flavor_profiles auf.
-- ────────────────────────────────────────────────────────────────────────────

-- Täglich um 3:00 UTC: Ungeclaimte abgelaufene Sessions löschen
SELECT cron.schedule(
  'cleanup-anon-sessions',
  '0 3 * * *',
  $$DELETE FROM public.anonymous_game_sessions WHERE expires_at < NOW() AND claimed_by_user_id IS NULL$$
);

-- Täglich um 4:00 UTC: Verwaiste anonyme flavor_profiles löschen
-- (Anonyme Profile, die älter als 8 Tage sind und keine Session-Referenz mehr haben)
SELECT cron.schedule(
  'cleanup-anon-flavor-profiles',
  '0 4 * * *',
  $$DELETE FROM public.flavor_profiles
    WHERE user_id IS NULL
      AND created_at < NOW() - INTERVAL '8 days'
      AND id NOT IN (
        SELECT flavor_profile_id FROM public.anonymous_game_sessions
        WHERE flavor_profile_id IS NOT NULL
      )$$
);
