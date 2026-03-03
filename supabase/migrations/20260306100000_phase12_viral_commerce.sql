-- ============================================================================
-- PHASE 12: VIRAL & COMMERCE LOOPS
-- 12.2 — User Stash (Digitaler Kühlschrank / Point of Sale)
-- 12.3 — Brewer Bounties (Phygital Rewards)
-- 12.4 — Beat a Friend Challenges (Head-to-Head / K-Faktor)
-- ============================================================================

-- ─── 12.2: user_stash ────────────────────────────────────────────────────────
-- Stores the user's "digital fridge" with optional POS location

CREATE TABLE IF NOT EXISTS user_stash (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brew_id         UUID NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  purchase_location TEXT CHECK (purchase_location IN (
    'supermarket', 'specialty_store', 'online', 'taproom', 'other'
  )),
  notes           TEXT,
  UNIQUE (user_id, brew_id)
);

CREATE INDEX idx_user_stash_user ON user_stash(user_id);
CREATE INDEX idx_user_stash_brew ON user_stash(brew_id);

ALTER TABLE user_stash ENABLE ROW LEVEL SECURITY;

-- Users can manage their own stash
CREATE POLICY "user_stash_owner" ON user_stash
  FOR ALL
  USING (user_id = auth.uid());

-- Brewery members can read stash data for their brews (POS analytics)
CREATE POLICY "user_stash_brewery_read" ON user_stash
  FOR SELECT
  USING (
    brew_id IN (
      SELECT brews.id FROM brews
      JOIN brewery_members ON brewery_members.brewery_id = brews.brewery_id
      WHERE brewery_members.user_id = auth.uid()
    )
  );

-- ─── 12.3: brewer_bounties ───────────────────────────────────────────────────
-- Challenges posted by breweries (e.g., "match >95% to win free beer")

CREATE TABLE IF NOT EXISTS brewer_bounties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id      UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  brew_id         UUID REFERENCES brews(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  reward_type     TEXT NOT NULL CHECK (reward_type IN ('discount', 'free_beer', 'merchandise', 'other')),
  reward_value    TEXT NOT NULL,             -- e.g. "10 Pints Freibier" or "15% Rabatt"
  reward_code     TEXT,                      -- actual discount/QR code to reveal
  condition_type  TEXT NOT NULL CHECK (condition_type IN ('match_score', 'vibe_check', 'rating_count')),
  condition_value NUMERIC NOT NULL,          -- e.g. 95 for ">95% match score"
  max_claims      INTEGER,                   -- NULL = unlimited
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brewer_bounties_brewery ON brewer_bounties(brewery_id);
CREATE INDEX idx_brewer_bounties_brew ON brewer_bounties(brew_id);
CREATE INDEX idx_brewer_bounties_active ON brewer_bounties(is_active, expires_at);

ALTER TABLE brewer_bounties ENABLE ROW LEVEL SECURITY;

-- Anyone can read active bounties
CREATE POLICY "brewer_bounties_public_read" ON brewer_bounties
  FOR SELECT USING (is_active = true);

-- Brewery members (owner/admin) can manage bounties
CREATE POLICY "brewer_bounties_brewery_write" ON brewer_bounties
  FOR ALL
  USING (
    brewery_id IN (
      SELECT brewery_id FROM brewery_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── 12.3: bounty_claims ─────────────────────────────────────────────────────
-- Tracks which users have claimed which bounties

CREATE TABLE IF NOT EXISTS bounty_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id       UUID NOT NULL REFERENCES brewer_bounties(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualifying_event_id UUID,                  -- references tasting_score_events.id
  UNIQUE (bounty_id, user_id)
);

CREATE INDEX idx_bounty_claims_bounty ON bounty_claims(bounty_id);
CREATE INDEX idx_bounty_claims_user ON bounty_claims(user_id);

ALTER TABLE bounty_claims ENABLE ROW LEVEL SECURITY;

-- Users see their own claims
CREATE POLICY "bounty_claims_owner" ON bounty_claims
  FOR ALL
  USING (user_id = auth.uid());

-- Brewery members can read claims for their bounties
CREATE POLICY "bounty_claims_brewery_read" ON bounty_claims
  FOR SELECT
  USING (
    bounty_id IN (
      SELECT b.id FROM brewer_bounties b
      JOIN brewery_members bm ON bm.brewery_id = b.brewery_id
      WHERE bm.user_id = auth.uid()
    )
  );

-- ─── 12.4: beat_friend_challenges ────────────────────────────────────────────
-- Challenge tokens for "Beat a Friend" viral loop

CREATE TABLE IF NOT EXISTS beat_friend_challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token               TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  challenger_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brew_id             UUID NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
  challenger_profile  JSONB NOT NULL,        -- FlavorProfile snapshot
  challenger_score    INTEGER NOT NULL,      -- match % vs brewer
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  -- Set once a friend accepts:
  challenged_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  challenged_profile  JSONB,
  challenged_score    INTEGER,
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_bfc_token ON beat_friend_challenges(token);
CREATE INDEX idx_bfc_challenger ON beat_friend_challenges(challenger_id);
CREATE INDEX idx_bfc_brew ON beat_friend_challenges(brew_id);

ALTER TABLE beat_friend_challenges ENABLE ROW LEVEL SECURITY;

-- Challenger can create & read their own challenges
CREATE POLICY "bfc_challenger_all" ON beat_friend_challenges
  FOR ALL
  USING (challenger_id = auth.uid());

-- Anyone can read a challenge by token (for the invite page — checked app-side by token)
CREATE POLICY "bfc_public_token_read" ON beat_friend_challenges
  FOR SELECT
  USING (true);

-- Any logged-in user can accept (fill in challenged_* fields) a challenge once
CREATE POLICY "bfc_accept_update" ON beat_friend_challenges
  FOR UPDATE
  USING (
    challenged_id IS NULL AND
    challenger_id != auth.uid() AND
    expires_at > now()
  );
