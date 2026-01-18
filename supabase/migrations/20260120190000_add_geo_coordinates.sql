-- Migration: Add geolocation coordinates (Latitude/Longitude)
-- Enables precise city-level heatmaps for analytics

-- Step 1: Add columns to bottle_scans
ALTER TABLE bottle_scans 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

COMMENT ON COLUMN bottle_scans.latitude IS 'Geographic latitude from IP lookup (approximate)';
COMMENT ON COLUMN bottle_scans.longitude IS 'Geographic longitude from IP lookup (approximate)';

-- Step 2: Index for coordinate queries (Optional given volume, but good practice)
CREATE INDEX IF NOT EXISTS idx_bottle_scans_geo
ON bottle_scans(brewery_id, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
