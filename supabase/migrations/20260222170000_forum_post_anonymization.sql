-- Migration: Forum Post Anonymization (DSGVO Fix)
-- When a user deletes their account, forum threads and posts should NOT be
-- cascade-deleted. Instead, author_id is set to NULL so content is preserved
-- but anonymized ("Gelöschter Nutzer" shown in UI).

-- ── forum_threads ─────────────────────────────────────────────────────────────

-- Make author_id nullable
ALTER TABLE public.forum_threads
    ALTER COLUMN author_id DROP NOT NULL;

-- Drop the old CASCADE constraint
ALTER TABLE public.forum_threads
    DROP CONSTRAINT IF EXISTS forum_threads_author_id_fkey;

-- Re-add as SET NULL
ALTER TABLE public.forum_threads
    ADD CONSTRAINT forum_threads_author_id_fkey
    FOREIGN KEY (author_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- ── forum_posts ───────────────────────────────────────────────────────────────

-- Make author_id nullable
ALTER TABLE public.forum_posts
    ALTER COLUMN author_id DROP NOT NULL;

-- Drop the old CASCADE constraint
ALTER TABLE public.forum_posts
    DROP CONSTRAINT IF EXISTS forum_posts_author_id_fkey;

-- Re-add as SET NULL
ALTER TABLE public.forum_posts
    ADD CONSTRAINT forum_posts_author_id_fkey
    FOREIGN KEY (author_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
