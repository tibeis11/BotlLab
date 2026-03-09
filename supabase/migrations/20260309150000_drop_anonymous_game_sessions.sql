-- ============================================================================
-- Phase 8.5: DROP TABLE anonymous_game_sessions + Backup
--
-- Voraussetzungen (alle erfüllt):
--   - Phase 8 Migration hat alle Daten nach tasting_score_events migriert
--   - Alle Code-Referenzen (BTB anon path, VibeCheck anon path) schreiben
--     jetzt direkt in tasting_score_events
--   - anonymous_game_sessions_backup existiert als Sicherheitsnetz
-- ============================================================================

DROP TABLE IF EXISTS public.anonymous_game_sessions;
DROP TABLE IF EXISTS public.anonymous_game_sessions_backup;
