-- Migration: Fix Analytics Phase 3 Enhancements
-- This migration ensures all Phase 3 columns and functions are properly applied

-- Step 1: Ensure columns exist
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS scanned_at_hour INTEGER;
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS converted_to_rating BOOLEAN DEFAULT FALSE;
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE analytics_daily_stats ADD COLUMN IF NOT EXISTS hour_distribution JSONB;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_bottle_scans_time_analysis
ON bottle_scans(brewery_id, scanned_at_hour)
WHERE scanned_at_hour IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bottle_scans_conversion
ON bottle_scans(brewery_id, converted_to_rating);

-- Step 3: Update increment_daily_stats function with hour tracking
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_date DATE,
  p_brewery_id UUID,
  p_brew_id UUID,
  p_country_code TEXT,
  p_device_type TEXT,
  p_hour INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
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
  ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
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
