-- Seed file for local development
-- This runs after migrations via `supabase db reset`

-- Only seed in local dev (check if we're not in production)
DO $$
BEGIN
  -- Create demo user and brewery with analytics data
  IF current_setting('server_version_num')::int >= 140000 THEN
    
    -- Skip if data already exists
    IF NOT EXISTS (SELECT 1 FROM breweries WHERE name = 'Demo Brauerei Analytics') THEN
      
      -- 1. Create demo brewery
      INSERT INTO breweries (id, name, description, tier)
      VALUES (
        '11111111-2222-3333-4444-000000000001'::uuid,
        'Demo Brauerei Analytics',
        'Automatisch generierte Demo-Daten für Analytics-Tests',
        'garage'
      );
      
      RAISE NOTICE '✅ Demo brewery created';
      
      -- 2. Create demo brews (will be linked to user after registration)
      INSERT INTO brews (id, name, style, brewery_id, brew_type, description)
      VALUES 
      (
        '22222222-3333-4444-5555-000000000001'::uuid,
        'Demo IPA',
        'IPA',
        '11111111-2222-3333-4444-000000000001'::uuid,
        'beer',
        'Demo-Rezept mit vielen Scans'
      ),
      (
        '22222222-3333-4444-5555-000000000002'::uuid,
        'Demo Lager',
        'Lager',
        '11111111-2222-3333-4444-000000000001'::uuid,
        'beer',
        'Demo-Rezept mit weniger Scans'
      );
      
      RAISE NOTICE '✅ Demo brews created';
      
      -- 3. Generate 30 days of analytics data
      FOR day_offset IN 0..29 LOOP
        DECLARE
          v_date DATE := CURRENT_DATE - day_offset;
          v_countries TEXT[] := ARRAY['DE', 'AT', 'CH', 'US', 'GB', 'FR', 'NL'];
          v_devices TEXT[] := ARRAY['mobile', 'desktop', 'tablet'];
          v_scans_ipa INT := 5 + floor(random() * 20)::int;
          v_scans_lager INT := 2 + floor(random() * 10)::int;
        BEGIN
          
          -- IPA Stats
          FOR i IN 1..v_scans_ipa LOOP
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
              '11111111-2222-3333-4444-000000000001'::uuid,
              '22222222-3333-4444-5555-000000000001'::uuid,
              v_countries[1 + floor(random() * array_length(v_countries, 1))::int],
              v_devices[1 + floor(random() * array_length(v_devices, 1))::int],
              1,
              CASE WHEN i % 3 = 0 THEN 1 ELSE 0 END
            )
            ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
            DO UPDATE SET
              total_scans = analytics_daily_stats.total_scans + 1,
              unique_visitors = analytics_daily_stats.unique_visitors + EXCLUDED.unique_visitors;
          END LOOP;
          
          -- Lager Stats
          FOR i IN 1..v_scans_lager LOOP
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
              '11111111-2222-3333-4444-000000000001'::uuid,
              '22222222-3333-4444-5555-000000000002'::uuid,
              v_countries[1 + floor(random() * array_length(v_countries, 1))::int],
              v_devices[1 + floor(random() * array_length(v_devices, 1))::int],
              1,
              CASE WHEN i % 2 = 0 THEN 1 ELSE 0 END
            )
            ON CONFLICT (date, brewery_id, brew_id, country_code, device_type)
            DO UPDATE SET
              total_scans = analytics_daily_stats.total_scans + 1,
              unique_visitors = analytics_daily_stats.unique_visitors + EXCLUDED.unique_visitors;
          END LOOP;
          
        END;
      END LOOP;
      
      RAISE NOTICE '✅ 30 days of analytics data generated';
      
      -- Show summary
      RAISE NOTICE '';
      RAISE NOTICE '═══════════════════════════════════════════════════════';
      RAISE NOTICE '🎉 Demo Data Seeded Successfully!';
      RAISE NOTICE '═══════════════════════════════════════════════════════';
      RAISE NOTICE '';
      RAISE NOTICE '📊 To access analytics:';
      RAISE NOTICE '   1. Register a new user';
      RAISE NOTICE '   2. Join brewery: 11111111-2222-3333-4444-000000000001';
      RAISE NOTICE '   3. Visit: /team/11111111-2222-3333-4444-000000000001/analytics';
      RAISE NOTICE '';
      
    END IF;
    
  END IF;
END $$;
