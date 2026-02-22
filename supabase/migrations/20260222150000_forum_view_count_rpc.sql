-- ============================================================
-- Migration: forum thread view count RPC
--
-- Erstellt eine SECURITY DEFINER RPC-Funktion, die den
-- view_count eines Forum-Threads atomar inkrementiert.
-- Wird aufgerufen, wenn ein Nutzer einen Thread aufruft.
-- ============================================================

-- ─── RPC: increment_forum_view_count ─────────────────────────
-- Aufruf: SELECT increment_forum_view_count('<thread_id>');
CREATE OR REPLACE FUNCTION public.increment_forum_view_count(
  thread_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE forum_threads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = thread_id;
$$;

-- Zugriff für alle (auch anonym) erlauben
GRANT EXECUTE ON FUNCTION public.increment_forum_view_count(uuid) TO anon, authenticated;
