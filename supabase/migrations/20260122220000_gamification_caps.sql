-- Enable Gamification features for Bottle Caps
ALTER TABLE collected_caps ADD COLUMN IF NOT EXISTS rating_id UUID REFERENCES ratings(id) ON DELETE SET NULL;
ALTER TABLE collected_caps ADD COLUMN IF NOT EXISTS claimed_via TEXT DEFAULT 'scan'; -- 'scan' | 'rating'

-- Avoid duplicate claims via rating (one cap per brew via rating, although general unique constraint might already exist)
-- Existing constraints might only be on user_id + brew_id.
-- Let's check if there is an existing unique constraint on (user_id, brew_id).
-- If not, we should probably add one, but maybe users can collect multiple caps if they scan multiple bottles?
-- The roadmap implies "Sammle deine Kronkorken" refers to unique designs/brews.
-- For now, let's just add the index for rating-based claims as specified.

CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_caps_rating_unique ON collected_caps(user_id, brew_id) WHERE claimed_via = 'rating';
