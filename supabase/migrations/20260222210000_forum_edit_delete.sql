-- 1.4 Edit & Delete: add deleted_at to forum_posts and forum_threads
-- Soft-delete: content replaced with "[Gelöscht]" in the app layer

ALTER TABLE forum_posts
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE forum_threads
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- RLS: still readable (so reply-tree stays intact), but content hidden by app
