-- ============================================================================
-- Phase 7: Cleanup — alte Constraints und Indizes droppen
--
-- Die neuen `_used_nonces`-Tabellen übernehmen jetzt die Duplicate-Kontrolle.
-- Die alten Spam-Schutz-Indizes auf `anonymous_game_sessions` (die auf
-- bottle_id + ip_hash oder brew_id + ip_hash basieren) sind damit obsolet
-- und verhindern nach dem Refill von Flaschen korrekte neue Einträge.
--
-- Achtung: Nur Indizes droppen, keine Daten löschen!
-- Historische Daten in anonymous_game_sessions bleiben erhalten bis Phase 8.
-- ============================================================================

-- 1. Alter Spam-Schutz-Index für BTB (brew_id, ip_hash) auf anonymous_game_sessions
DROP INDEX IF EXISTS public.idx_anon_sessions_btb_limit;

-- 2. Alter Spam-Schutz-Index für VibeCheck (brew_id, ip_hash) auf anonymous_game_sessions
DROP INDEX IF EXISTS public.idx_anon_sessions_vibe_limit;
