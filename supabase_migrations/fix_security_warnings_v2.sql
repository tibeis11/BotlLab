-- Fix Security Warnings & Cleanup

-- 1. DELETE Zombie Function (verursacht die Linter Warnung 'has_liked_brew')
DROP FUNCTION IF EXISTS public.has_liked_brew(brews);
DROP FUNCTION IF EXISTS public.has_liked_brew(uuid); 

-- 2. Fix 'user_has_liked' (Sicherheits-Update: search_path)
CREATE OR REPLACE FUNCTION user_has_liked(brew_row brews)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 
    from public.likes 
    where brew_id = brew_row.id
    and user_id = auth.uid()
  );
$$;

-- 3. Fix 'handle_new_user' (Sicherheits-Update: search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, founded_year, logo_url, tier)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'Neue Brauerei'),
    EXTRACT(YEAR FROM now()),
    '/tiers/lehrling.png',
    'lehrling'
  );
  RETURN new;
END;
$$;

-- 4. Fix 'breweries' INSERT Policy (Linter-Fix)
-- Wir erlauben das Erstellen weiterhin, ersetzen nur 'true' durch eine explizite Pruefung.
DROP POLICY IF EXISTS "Authenticated users can create breweries" ON public.breweries;

CREATE POLICY "Authenticated users can create breweries"
ON public.breweries
FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() IS NOT NULL );

