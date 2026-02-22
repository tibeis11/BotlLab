-- Migration: Full-Text-Search for Forum Threads and Posts
-- Adds tsvector columns with GIN indexes and trigger-based maintenance.
-- Uses 'german' dictionary for German + basic English terms.

-- ── forum_threads: search column ─────────────────────────────────────────────
ALTER TABLE public.forum_threads
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Backfill existing rows
UPDATE public.forum_threads
SET search_vector = to_tsvector('german', coalesce(title, '') || ' ' || coalesce(content, ''));

-- Trigger to keep search_vector in sync on INSERT / UPDATE
CREATE OR REPLACE FUNCTION forum_threads_search_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := to_tsvector('german',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_threads_search_trigger ON public.forum_threads;
CREATE TRIGGER forum_threads_search_trigger
    BEFORE INSERT OR UPDATE OF title, content
    ON public.forum_threads
    FOR EACH ROW EXECUTE FUNCTION forum_threads_search_update();

-- GIN index for fast FTS
CREATE INDEX IF NOT EXISTS forum_threads_search_idx
    ON public.forum_threads USING GIN (search_vector);

-- ── forum_posts: search column ────────────────────────────────────────────────
ALTER TABLE public.forum_posts
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE public.forum_posts
SET search_vector = to_tsvector('german', coalesce(content, ''));

CREATE OR REPLACE FUNCTION forum_posts_search_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := to_tsvector('german', coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_posts_search_trigger ON public.forum_posts;
CREATE TRIGGER forum_posts_search_trigger
    BEFORE INSERT OR UPDATE OF content
    ON public.forum_posts
    FOR EACH ROW EXECUTE FUNCTION forum_posts_search_update();

CREATE INDEX IF NOT EXISTS forum_posts_search_idx
    ON public.forum_posts USING GIN (search_vector);
