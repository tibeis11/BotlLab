-- Fix Unique Visitors Logic
-- 1. Index for fast uniqueness check on brewery visits (session based)
CREATE INDEX IF NOT EXISTS idx_bottle_scans_unique_visitor 
ON bottle_scans(brewery_id, session_hash, created_at);

-- 2. Update increment_daily_stats to accept p_is_new_visitor flag
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_date DATE,
  p_brewery_id UUID,
  p_brew_id UUID,
  p_country_code TEXT,
  p_device_type TEXT,
  p_hour INTEGER DEFAULT NULL,
  p_is_new_visitor BOOLEAN DEFAULT TRUE
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
    CASE WHEN p_is_new_visitor THEN 1 ELSE 0 END,
    CASE 
      WHEN p_hour IS NOT NULL THEN jsonb_build_object(p_hour::TEXT, 1)
      ELSE NULL
    END
  )
  ON CONFLICT (date, brewery_id, COALESCE(brew_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(country_code, ''), COALESCE(device_type, ''))
  DO UPDATE SET
    total_scans = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors + (CASE WHEN p_is_new_visitor THEN 1 ELSE 0 END),
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
