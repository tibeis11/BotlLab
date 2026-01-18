-- Migration: Bottle Scans Analytics (Privacy-First)
-- Created: 2026-01-18
-- Purpose: Track QR code scans for brewery analytics with GDPR compliance

-- =====================================================
-- 1. CREATE TABLE: bottle_scans
-- =====================================================
CREATE TABLE IF NOT EXISTS bottle_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- What was scanned?
  bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  brew_id UUID REFERENCES brews(id) ON DELETE SET NULL,
  brewery_id UUID REFERENCES breweries(id) ON DELETE SET NULL,
  
  -- Who scanned? (Session hash for unique counting OR user ID)
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_hash TEXT, -- SHA256(IP+UA+Date+Salt), rotates daily
  
  -- Where? (Only resolved geo data, NO IP!)
  country_code TEXT, -- "DE", "AT", "US"...
  city TEXT, -- "Berlin", "Munich"...
  
  -- How? (Device info)
  user_agent_parsed TEXT, -- "Chrome on Android" (no raw UA string needed)
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'unknown')),
  
  -- Context
  scan_source TEXT DEFAULT 'qr_code' CHECK (scan_source IN ('qr_code', 'direct_link', 'share')),
  is_owner_scan BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- 2. INDEXES for Performance
-- =====================================================
CREATE INDEX idx_bottle_scans_aggregation 
ON bottle_scans(brewery_id, created_at DESC);

CREATE INDEX idx_bottle_scans_bottle 
ON bottle_scans(bottle_id);

CREATE INDEX idx_bottle_scans_brew 
ON bottle_scans(brew_id) WHERE brew_id IS NOT NULL;

CREATE INDEX idx_bottle_scans_session 
ON bottle_scans(session_hash) WHERE session_hash IS NOT NULL;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================
ALTER TABLE bottle_scans ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can insert scans (including anonymous users)
CREATE POLICY "Anyone can insert bottle scans"
ON bottle_scans
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy 2: Brewery owners can view their scans
CREATE POLICY "Brewery owners can view their analytics"
ON bottle_scans
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

-- Policy 3: Service role has full access
CREATE POLICY "Service role full access to scans"
ON bottle_scans
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. COMMENT
-- =====================================================
COMMENT ON TABLE bottle_scans IS 'Tracks QR code scans for brewery analytics (GDPR-compliant, no IP storage)';
