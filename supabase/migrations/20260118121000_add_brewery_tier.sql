-- Add tier column to breweries table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'breweries' AND column_name = 'tier'
  ) THEN
    ALTER TABLE breweries
      ADD COLUMN tier TEXT DEFAULT 'garage' NOT NULL;

    ALTER TABLE breweries
      ADD CONSTRAINT breweries_tier_check
      CHECK (tier IN ('garage', 'micro', 'craft', 'industrial'));

    CREATE INDEX idx_breweries_tier ON breweries(tier);

    COMMENT ON COLUMN breweries.tier IS 'Brewery tier level (garage/micro/craft/industrial)';
  END IF;
END $$;
