-- Migration: Analytics Daily Stats (Performance Layer)
-- Created: 2026-01-18
-- Purpose: Pre-aggregate scan data for fast dashboard queries

-- =====================================================
-- 1. CREATE TABLE: analytics_daily_stats
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  
  -- Dimensions (what to group by)
  brew_id UUID REFERENCES brews(id) ON DELETE SET NULL,
  country_code TEXT,
  device_type TEXT,
  
  -- Metrics (counters)
  total_scans INTEGER DEFAULT 0 NOT NULL,
  unique_visitors INTEGER DEFAULT 0 NOT NULL,
  
  -- Prevent duplicates for same day/brewery/dimensions
  UNIQUE(date, brewery_id, brew_id, country_code, device_type)
);

-- =====================================================
-- 2. INDEXES for Fast Dashboard Reads
-- =====================================================
CREATE INDEX idx_analytics_read 
ON analytics_daily_stats(brewery_id, date DESC);

CREATE INDEX idx_analytics_brew 
ON analytics_daily_stats(brew_id) WHERE brew_id IS NOT NULL;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policy 1: Brewery owners can read their stats
CREATE POLICY "Brewery owners can view their stats"
ON analytics_daily_stats
FOR SELECT
TO authenticated
USING (
  brewery_id IN (
    SELECT brewery_id 
    FROM brewery_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Policy 2: Service role has full access
CREATE POLICY "Service role full access to stats"
ON analytics_daily_stats
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. FUNCTION: Increment Daily Stats
-- =====================================================
-- This function will be called by the tracking action
-- to update or insert daily aggregated stats
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_date DATE,
  p_brewery_id UUID,
  p_brew_id UUID,
  p_country_code TEXT,
  p_device_type TEXT,
  p_is_unique BOOLEAN
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
    unique_visitors
  ) VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    CASE WHEN p_is_unique THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
  DO UPDATE SET
    total_scans = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors + 
      CASE WHEN p_is_unique THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMMENT
-- =====================================================
COMMENT ON TABLE analytics_daily_stats IS 'Pre-aggregated daily scan statistics for fast dashboard queries';
COMMENT ON FUNCTION increment_daily_stats IS 'Increments or creates daily aggregated analytics stats';
