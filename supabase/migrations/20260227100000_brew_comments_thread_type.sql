-- ============================================================
-- Migration: Brew Comments System
-- Date: 2026-02-27
-- 
-- Adds thread_type column to forum_threads so that system-
-- generated "brew comment" threads can be distinguished from
-- user-initiated discussions.
--
-- Design: One canonical brew_comments thread per brew (unique).
-- The thread is auto-created on the first comment via Server Action.
-- ============================================================

BEGIN;

-- 1. Add thread_type column.
--    DEFAULT 'discussion' so all existing threads keep their type.
ALTER TABLE "public"."forum_threads"
  ADD COLUMN IF NOT EXISTS "thread_type" TEXT NOT NULL DEFAULT 'discussion';

-- 2. UNIQUE INDEX: only one brew_comments thread per brew.
--    Partial index keeps it surgical — only brew_comments threads
--    are constrained, discussions can have many threads per brew.
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_threads_brew_comments
  ON "public"."forum_threads" (brew_id)
  WHERE thread_type = 'brew_comments';

-- 3. Add a hidden system category for brew comment threads.
--    sort_order 999 keeps it at the bottom / out of normal nav.
INSERT INTO "public"."forum_categories" (slug, title, description, icon, sort_order)
VALUES (
  'rezept-kommentare',
  'Rezept-Kommentare',
  'System-generierte Kommentar-Threads zu einzelnen Rezepten. Nicht im normalen Feed sichtbar.',
  'MessageSquare',
  999
)
ON CONFLICT (slug) DO NOTHING;

-- 4. RLS: lock down manual creation of brew_comments threads.
--    Authenticated users can only INSERT threads with type 'discussion'.
--    Server Actions that use the service_role key bypass RLS and can
--    therefore still create brew_comments threads automatically.
DROP POLICY IF EXISTS "Authenticated users can create threads" ON "public"."forum_threads";
CREATE POLICY "Authenticated users can create discussion threads"
  ON "public"."forum_threads"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (thread_type = 'discussion' OR thread_type IS NULL)
  );

COMMIT;
