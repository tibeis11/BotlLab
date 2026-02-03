-- Fix Cron Jobs to use 'extensions' schema for pg_net functions
-- This prevents breakage after moving pg_net to the extensions schema

-- Update search_path for previously modified functions to be robust
-- Adding 'extensions' ensures access to utility functions if needed
ALTER FUNCTION public.increment_daily_stats(DATE, UUID, UUID, TEXT, TEXT) SET search_path = public, extensions;
ALTER FUNCTION public.handle_brew_image_change() SET search_path = public, extensions;
ALTER FUNCTION public.handle_brewery_logo_change() SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions;
ALTER FUNCTION public.update_thread_stats() SET search_path = public, extensions;
ALTER FUNCTION public.get_brew_taste_profile(UUID) SET search_path = public, extensions;

-- Re-schedule Cron Jobs using 'extensions.http_post'
-- 1. Daily Analytics
SELECT cron.unschedule('aggregate-daily-analytics');
SELECT cron.schedule(
  'aggregate-daily-analytics',
  '0 2 * * *',
  $$
  SELECT extensions.http_post(
    url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- 2. Hourly Analytics
SELECT cron.unschedule('aggregate-hourly-analytics');
SELECT cron.schedule(
  'aggregate-hourly-analytics',
  '5 * * * *',
  $$
  SELECT extensions.http_post(
     url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "hourly"}'::jsonb
  ) as request_id;
  $$
);

-- 3. Cohorts
SELECT cron.unschedule('calculate-cohorts');
SELECT cron.schedule(
  'calculate-cohorts',
  '0 3 * * 1',
  $$
  SELECT extensions.http_post(
     url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "cohorts"}'::jsonb
  ) as request_id;
  $$
);

-- 4. Feature Usage
SELECT cron.unschedule('aggregate-feature-usage');
SELECT cron.schedule(
  'aggregate-feature-usage',
  '30 2 * * *',
  $$
  SELECT extensions.http_post(
     url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/aggregate-analytics',
    headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{"mode": "features"}'::jsonb
  ) as request_id;
  $$
);
