-- Fix security linter warnings by setting explicit search_path for functions

-- 1. increment_daily_stats
ALTER FUNCTION public.increment_daily_stats(DATE, UUID, UUID, TEXT, TEXT, INTEGER) SET search_path = public;

-- 2. handle_brew_image_change
ALTER FUNCTION public.handle_brew_image_change() SET search_path = public;

-- 3. handle_brewery_logo_change
ALTER FUNCTION public.handle_brewery_logo_change() SET search_path = public;

-- 4. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 5. update_thread_stats
ALTER FUNCTION public.update_thread_stats() SET search_path = public;

-- 6. get_brew_taste_profile
ALTER FUNCTION public.get_brew_taste_profile(UUID) SET search_path = public;

-- 7. Fix extension_in_public for pg_net
-- Skipped: pg_net does not support SET SCHEMA
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
-- ALTER EXTENSION pg_net SET SCHEMA extensions;

