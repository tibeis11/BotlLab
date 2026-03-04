-- ──────────────────────────────────────────────────────────────────────────────
-- Fix: Replace COALESCE-based unique index on botlguide_embeddings
--      with a NULLS NOT DISTINCT index (PostgreSQL 15+).
--
-- The COALESCE index (source_type, source_id, COALESCE(user_id::text, ''))
-- is not recognized by PostgREST as a valid ON CONFLICT target.
-- NULLS NOT DISTINCT treats NULL values as equal, so the standard
-- ON CONFLICT (source_type, source_id, user_id) works even when user_id IS NULL.
-- ──────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.botlguide_embeddings_unique_idx;
ALTER TABLE public.botlguide_embeddings
  DROP CONSTRAINT IF EXISTS botlguide_embeddings_source_type_source_id_user_id_key;

CREATE UNIQUE INDEX botlguide_embeddings_unique_idx
  ON public.botlguide_embeddings (source_type, source_id, user_id)
  NULLS NOT DISTINCT;
