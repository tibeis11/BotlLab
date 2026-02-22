/* ============================================================
   Forum Thread Subscriptions
   A user can subscribe to any thread to receive notifications
   whenever a new reply is posted.
   ============================================================ */

CREATE TABLE IF NOT EXISTS forum_subscriptions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_id   uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT forum_subscriptions_user_thread_unique UNIQUE (user_id, thread_id)
);

-- Fast lookups by user and by thread
CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_user   ON forum_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_thread ON forum_subscriptions (thread_id);

-- Row Level Security
ALTER TABLE forum_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read/manage their own subscriptions
CREATE POLICY "Users manage own subscriptions"
    ON forum_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
