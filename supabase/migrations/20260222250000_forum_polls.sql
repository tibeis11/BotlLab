/* ============================================================
   Forum Polls
   One optional poll per thread; supports single & multi-choice.
   ============================================================ */

CREATE TABLE IF NOT EXISTS forum_polls (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    question        text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 200),
    multiple_choice boolean NOT NULL DEFAULT false,
    ends_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT forum_polls_thread_unique UNIQUE (thread_id)
);

CREATE TABLE IF NOT EXISTS forum_poll_options (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     uuid NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
    label       text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order  smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS forum_poll_votes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id   uuid NOT NULL REFERENCES forum_poll_options(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT forum_poll_votes_user_option_unique UNIQUE (option_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_forum_polls_thread       ON forum_polls (thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_options_poll  ON forum_poll_options (poll_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_votes_option  ON forum_poll_votes (option_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_votes_user    ON forum_poll_votes (user_id);

-- RLS
ALTER TABLE forum_polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_votes   ENABLE ROW LEVEL SECURITY;

-- Read open to all authenticated users
CREATE POLICY "polls_read"   ON forum_polls        FOR SELECT USING (true);
CREATE POLICY "options_read" ON forum_poll_options FOR SELECT USING (true);
CREATE POLICY "votes_read"   ON forum_poll_votes   FOR SELECT USING (true);

-- Votes: authenticated users can insert/delete their own
CREATE POLICY "votes_insert" ON forum_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON forum_poll_votes FOR DELETE USING  (auth.uid() = user_id);

-- Thread authors & admins can insert polls/options (simplified: service role handles this)
CREATE POLICY "polls_insert"   ON forum_polls        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "options_insert" ON forum_poll_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
