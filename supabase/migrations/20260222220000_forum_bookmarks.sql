-- 1.6 Bookmarks: users can bookmark threads and posts
CREATE TABLE IF NOT EXISTS forum_bookmarks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    target_id   UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'post')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, target_id)
);

-- RLS
ALTER TABLE forum_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks"
    ON forum_bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
    ON forum_bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
    ON forum_bookmarks FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_user ON forum_bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_target ON forum_bookmarks (target_id);
