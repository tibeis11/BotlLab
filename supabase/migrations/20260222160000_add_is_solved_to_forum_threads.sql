-- ============================================================
-- Migration: add is_solved to forum_threads
--
-- Ermöglicht es dem Thread-Ersteller, seinen Thread als
-- "Gelöst ✅" zu markieren.
-- ============================================================

ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS "is_solved" boolean DEFAULT false;

-- Index für die Sortierung nach gelösten Threads
CREATE INDEX IF NOT EXISTS idx_forum_threads_is_solved
  ON public.forum_threads (is_solved)
  WHERE is_solved = true;
