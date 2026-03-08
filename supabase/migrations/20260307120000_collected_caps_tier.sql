-- Add cap_tier to collected_caps
-- Each collected cap receives a randomly rolled tier at claim time.
-- Probabilities: gold 0.5% | silver 4.5% | bronze 15% | zinc 80%

ALTER TABLE collected_caps
  ADD COLUMN IF NOT EXISTS cap_tier text
    NOT NULL
    DEFAULT 'zinc'
    CHECK (cap_tier IN ('gold', 'silver', 'bronze', 'zinc'));

COMMENT ON COLUMN collected_caps.cap_tier IS
  'Rarity tier rolled at collection time. gold=0.5%, silver=4.5%, bronze=15%, zinc=80%.';
