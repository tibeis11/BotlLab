-- =====================================================
-- TIME-TO-GLASS TRACKING (Phase 3)
-- =====================================================
-- Add hour tracking to understand WHEN beers are consumed
-- Useful for: Peak drinking hours, time-based marketing

ALTER TABLE bottle_scans
ADD COLUMN IF NOT EXISTS scanned_at_hour INTEGER;

COMMENT ON COLUMN bottle_scans.scanned_at_hour IS 'Hour of day (0-23) when scan occurred. Used for time-to-glass analysis.';

-- Index for time analysis queries
CREATE INDEX IF NOT EXISTS idx_bottle_scans_time_analysis
ON bottle_scans(brewery_id, scanned_at_hour)
WHERE scanned_at_hour IS NOT NULL;

-- =====================================================
-- CONVERSION TRACKING (Phase 3)
-- =====================================================
-- Track conversion from scan to rating
-- Adds flag to detect if user left a rating after scanning

ALTER TABLE bottle_scans
ADD COLUMN IF NOT EXISTS converted_to_rating BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bottle_scans.converted_to_rating IS 'TRUE if user left a rating after scanning. Enables conversion funnel analysis.';

-- Index for conversion rate queries
CREATE INDEX IF NOT EXISTS idx_bottle_scans_conversion
ON bottle_scans(brewery_id, converted_to_rating);

-- =====================================================
-- PERFORMANCE: scan_count on bottles table
-- =====================================================
-- Denormalized counter for fast display without JOIN

ALTER TABLE bottles
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN bottles.scan_count IS 'Denormalized total scan count for performance. Updated via trigger on bottle_scans inserts.';

-- Trigger function to increment scan_count
CREATE OR REPLACE FUNCTION increment_bottle_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the bottles.scan_count
  UPDATE bottles
  SET scan_count = scan_count + 1
  WHERE id = NEW.bottle_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on bottle_scans INSERT
DROP TRIGGER IF EXISTS trigger_increment_bottle_scan_count ON bottle_scans;
CREATE TRIGGER trigger_increment_bottle_scan_count
AFTER INSERT ON bottle_scans
FOR EACH ROW
EXECUTE FUNCTION increment_bottle_scan_count();

-- Backfill existing scan counts (run once)
UPDATE bottles
SET scan_count = (
  SELECT COUNT(*)
  FROM bottle_scans
  WHERE bottle_scans.bottle_id = bottles.id
)
WHERE EXISTS (
  SELECT 1 FROM bottle_scans WHERE bottle_scans.bottle_id = bottles.id
);

-- =====================================================
-- ANALYTICS_DAILY_STATS: Add time distribution
-- =====================================================
-- Add JSON field to store hourly distribution

ALTER TABLE analytics_daily_stats
ADD COLUMN IF NOT EXISTS hour_distribution JSONB;

COMMENT ON COLUMN analytics_daily_stats.hour_distribution IS 'JSON object with hourly scan distribution: {"0": 5, "1": 3, "14": 45, ...}';

-- Update increment function to include hour tracking
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_date DATE,
  p_brewery_id UUID,
  p_brew_id UUID,
  p_country_code TEXT,
  p_device_type TEXT,
  p_hour INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_existing_distribution JSONB;
  v_hour_key TEXT;
  v_hour_count INTEGER;
BEGIN
  -- Upsert the daily stats row
  INSERT INTO analytics_daily_stats (
    date, 
    brewery_id, 
    brew_id, 
    country_code, 
    device_type, 
    total_scans, 
    unique_visitors,
    hour_distribution
  )
  VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    1,
    CASE 
      WHEN p_hour IS NOT NULL THEN jsonb_build_object(p_hour::TEXT, 1)
      ELSE NULL
    END
  )
  ON CONFLICT (date, brewery_id, COALESCE(brew_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(country_code, ''), COALESCE(device_type, ''))
  DO UPDATE SET
    total_scans = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors + 1,
    hour_distribution = CASE
      WHEN p_hour IS NOT NULL THEN
        CASE
          WHEN analytics_daily_stats.hour_distribution IS NULL THEN
            jsonb_build_object(p_hour::TEXT, 1)
          ELSE
            jsonb_set(
              analytics_daily_stats.hour_distribution,
              ARRAY[p_hour::TEXT],
              to_jsonb(COALESCE((analytics_daily_stats.hour_distribution->>p_hour::TEXT)::INTEGER, 0) + 1)
            )
        END
      ELSE analytics_daily_stats.hour_distribution
    END;
END;
$$ LANGUAGE plpgsql;
