-- Test Analytics System
-- This SQL script tests the analytics tables and functions

-- 1. Insert test bottle scan (simulates a QR code scan)
BEGIN;

-- Get a real brew_id from existing data
DO $$
DECLARE
  v_brew_id UUID;
  v_bottle_id UUID;
  v_session_hash TEXT;
BEGIN
  -- Get first brew (or create minimal test data)
  SELECT id INTO v_brew_id FROM brews LIMIT 1;
  
  IF v_brew_id IS NULL THEN
    RAISE NOTICE 'No brews found. Please seed some data first.';
    RETURN;
  END IF;

  -- Get or create a bottle
  SELECT id INTO v_bottle_id FROM bottles WHERE brew_id = v_brew_id LIMIT 1;
  
  IF v_bottle_id IS NULL THEN
    INSERT INTO bottles (brew_id, bottle_number)
    VALUES (v_brew_id, 999)
    RETURNING id INTO v_bottle_id;
    RAISE NOTICE 'Created test bottle: %', v_bottle_id;
  END IF;

  -- Generate session hash (same as in trackBottleScan)
  v_session_hash := encode(digest('test-ip-' || now()::date || '-salt', 'sha256'), 'hex');

  -- Insert scan record
  INSERT INTO bottle_scans (
    bottle_id,
    brew_id,
    session_hash,
    country_code,
    city,
    device_type,
    scan_source
  ) VALUES (
    v_bottle_id,
    v_brew_id,
    v_session_hash,
    'DE',
    'Berlin',
    'desktop',
    'qr_code'
  );

  RAISE NOTICE 'Inserted scan for bottle: % (session: %)', v_bottle_id, v_session_hash;

  -- Test aggregation function
  PERFORM increment_daily_stats(
    NULL,  -- brewery_id
    v_brew_id,
    'DE',
    'desktop',
    v_session_hash
  );

  RAISE NOTICE 'Called increment_daily_stats()';

  -- Query results
  RAISE NOTICE 'Analytics Daily Stats:';
  FOR v_session_hash IN 
    SELECT 
      date::date,
      total_scans,
      unique_visitors,
      country_code,
      device_type
    FROM analytics_daily_stats
    WHERE brew_id = v_brew_id
    ORDER BY date DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '%', v_session_hash;
  END LOOP;

END $$;

ROLLBACK; -- Don't commit test data

-- Verify table structures
\d bottle_scans
\d analytics_daily_stats

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('bottle_scans', 'analytics_daily_stats');
