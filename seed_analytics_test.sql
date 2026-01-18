-- Create test data for analytics
BEGIN;

-- 1. Create test user (if not exists)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'test@analytics.local',
  crypt('test123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create brewery
INSERT INTO breweries (
  id,
  name,
  description,
  created_at
) VALUES (
  'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
  'Test Brauerei Analytics',
  'Demo Brauerei für Analytics Tests',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 3. Add user as brewery owner
INSERT INTO brewery_members (
  brewery_id,
  user_id,
  role,
  joined_at
) VALUES (
  'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  'owner',
  now()
) ON CONFLICT (brewery_id, user_id) DO NOTHING;

-- 4. Create test brews
INSERT INTO brews (
  id,
  name,
  style,
  user_id,
  brewery_id,
  brew_type,
  description,
  created_at
) VALUES 
(
  'cccccccc-dddd-eeee-ffff-000000000001'::uuid,
  'Test IPA',
  'IPA',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
  'extract',
  'Demo IPA für Analytics',
  now()
),
(
  'cccccccc-dddd-eeee-ffff-000000000002'::uuid,
  'Test Lager',
  'Lager',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001'::uuid,
  'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
  'extract',
  'Demo Lager für Analytics',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 5. Create test bottles
INSERT INTO bottles (
  id,
  brew_id,
  bottle_number,
  created_at
) VALUES 
(
  'dddddddd-eeee-ffff-0000-000000000001'::uuid,
  'cccccccc-dddd-eeee-ffff-000000000001'::uuid,
  1,
  now()
),
(
  'dddddddd-eeee-ffff-0000-000000000002'::uuid,
  'cccccccc-dddd-eeee-ffff-000000000002'::uuid,
  1,
  now()
) ON CONFLICT (id) DO NOTHING;

-- 6. Create test analytics data (last 30 days)
DO $$
DECLARE
  v_date DATE;
  v_day_offset INT;
  v_session_hash TEXT;
  v_brew_id UUID;
BEGIN
  FOR v_day_offset IN 0..29 LOOP
    v_date := CURRENT_DATE - v_day_offset;
    
    -- IPA scans
    FOR i IN 1..(5 + (random() * 15)::int) LOOP
      v_session_hash := encode(digest('test-session-' || v_date || '-' || i || '-' || random(), 'sha256'), 'hex');
      
      INSERT INTO bottle_scans (
        bottle_id,
        brew_id,
        brewery_id,
        session_hash,
        country_code,
        city,
        device_type,
        scan_source,
        created_at
      ) VALUES (
        'dddddddd-eeee-ffff-0000-000000000001'::uuid,
        'cccccccc-dddd-eeee-ffff-000000000001'::uuid,
        'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
        v_session_hash,
        CASE (random() * 4)::int
          WHEN 0 THEN 'DE'
          WHEN 1 THEN 'AT'
          WHEN 2 THEN 'CH'
          WHEN 3 THEN 'US'
          ELSE 'GB'
        END,
        CASE (random() * 3)::int
          WHEN 0 THEN 'Berlin'
          WHEN 1 THEN 'Munich'
          ELSE 'Vienna'
        END,
        CASE (random() * 3)::int
          WHEN 0 THEN 'mobile'
          WHEN 1 THEN 'desktop'
          ELSE 'tablet'
        END,
        'qr_code',
        v_date + (random() * interval '24 hours')
      );
      
      -- Aggregate to daily stats
      INSERT INTO analytics_daily_stats (
        date,
        brewery_id,
        brew_id,
        country_code,
        device_type,
        total_scans,
        unique_visitors
      ) VALUES (
        v_date,
        'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
        'cccccccc-dddd-eeee-ffff-000000000001'::uuid,
        CASE (random() * 4)::int
          WHEN 0 THEN 'DE'
          WHEN 1 THEN 'AT'
          WHEN 2 THEN 'CH'
          WHEN 3 THEN 'US'
          ELSE 'GB'
        END,
        CASE (random() * 3)::int
          WHEN 0 THEN 'mobile'
          WHEN 1 THEN 'desktop'
          ELSE 'tablet'
        END,
        1,
        CASE WHEN i % 3 = 0 THEN 1 ELSE 0 END
      )
      ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
      DO UPDATE SET
        total_scans = analytics_daily_stats.total_scans + 1,
        unique_visitors = analytics_daily_stats.unique_visitors + EXCLUDED.unique_visitors;
    END LOOP;
    
    -- Lager scans (fewer)
    FOR i IN 1..(3 + (random() * 8)::int) LOOP
      v_session_hash := encode(digest('test-session-lager-' || v_date || '-' || i || '-' || random(), 'sha256'), 'hex');
      
      INSERT INTO bottle_scans (
        bottle_id,
        brew_id,
        brewery_id,
        session_hash,
        country_code,
        city,
        device_type,
        scan_source,
        created_at
      ) VALUES (
        'dddddddd-eeee-ffff-0000-000000000002'::uuid,
        'cccccccc-dddd-eeee-ffff-000000000002'::uuid,
        'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
        v_session_hash,
        CASE (random() * 3)::int
          WHEN 0 THEN 'DE'
          WHEN 1 THEN 'AT'
          ELSE 'CH'
        END,
        CASE (random() * 2)::int
          WHEN 0 THEN 'Berlin'
          ELSE 'Hamburg'
        END,
        CASE (random() * 2)::int
          WHEN 0 THEN 'mobile'
          ELSE 'desktop'
        END,
        'qr_code',
        v_date + (random() * interval '24 hours')
      );
      
      -- Aggregate to daily stats
      INSERT INTO analytics_daily_stats (
        date,
        brewery_id,
        brew_id,
        country_code,
        device_type,
        total_scans,
        unique_visitors
      ) VALUES (
        v_date,
        'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid,
        'cccccccc-dddd-eeee-ffff-000000000002'::uuid,
        CASE (random() * 3)::int
          WHEN 0 THEN 'DE'
          WHEN 1 THEN 'AT'
          ELSE 'CH'
        END,
        CASE (random() * 2)::int
          WHEN 0 THEN 'mobile'
          ELSE 'desktop'
        END,
        1,
        CASE WHEN i % 2 = 0 THEN 1 ELSE 0 END
      )
      ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
      DO UPDATE SET
        total_scans = analytics_daily_stats.total_scans + 1,
        unique_visitors = analytics_daily_stats.unique_visitors + EXCLUDED.unique_visitors;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Test data created successfully!';
END $$;

COMMIT;

-- Show summary
SELECT 
  'Bottle Scans' as table_name,
  COUNT(*) as count
FROM bottle_scans
WHERE brewery_id = 'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid

UNION ALL

SELECT 
  'Daily Stats' as table_name,
  COUNT(*) as count
FROM analytics_daily_stats
WHERE brewery_id = 'bbbbbbbb-cccc-dddd-eeee-000000000001'::uuid;

-- Show login info
SELECT 
  '🔑 Login Credentials' as info,
  'test@analytics.local' as email,
  'test123' as password,
  'bbbbbbbb-cccc-dddd-eeee-000000000001' as brewery_id;
