-- ────────────────────────────────────────────────────────────────────────────
-- brew_views: implicit engagement-signal table for the recommendation engine
-- Records every meaningful view event (dwell ≥ 3s) in the Discover feed.
-- Used in Stufe B of the personalisation roadmap for collaborative-filtering.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brew_views (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  brew_id       uuid        NOT NULL,
  viewed_at     timestamptz NOT NULL DEFAULT now(),
  dwell_seconds integer,
  source        text        CHECK (source IN ('discover', 'search', 'direct', 'profile'))
);

-- Efficient lookups for the recommendation engine and deduplication
CREATE INDEX IF NOT EXISTS brew_views_user_brew  ON brew_views (user_id, brew_id);
CREATE INDEX IF NOT EXISTS brew_views_brew       ON brew_views (brew_id);
CREATE INDEX IF NOT EXISTS brew_views_user_time  ON brew_views (user_id, viewed_at DESC);

-- Row-Level Security: users can only see and write their own rows
ALTER TABLE brew_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own views"
  ON brew_views
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
