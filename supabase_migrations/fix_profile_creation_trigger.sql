-- Migration: Fix Profile Creation by moving it to a Server-Side Trigger
-- This resolves RLS issues where a new user cannot insert their own profile
-- because they are not yet fully authenticated (e.g. pending email confirmation).

-- 1. Create the function that will handle the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    founded_year,
    logo_url,
    tier
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'Neue Brauerei'),
    EXTRACT(YEAR FROM now()),
    '/tiers/lehrling.png',
    'lehrling'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to the auth.users table
-- Drop first to be safe (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure RLS allows the user to update their profile later
-- (Already handled in fix_profiles_rls.sql, but ensuring here doesn't hurt)
-- We rely on existing policies for UPDATE/SELECT.

