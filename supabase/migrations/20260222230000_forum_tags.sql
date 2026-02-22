-- Add tags column to forum_threads
ALTER TABLE forum_threads
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN index for fast tag filtering (e.g. WHERE 'Frage' = ANY(tags))
CREATE INDEX IF NOT EXISTS idx_forum_threads_tags ON forum_threads USING GIN(tags);
