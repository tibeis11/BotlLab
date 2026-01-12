-- Migration: Allow Authenticated Users to Create Breweries (Squads)
-- Fixes the error {} (RLS Violation) when creating a new Squad.

-- 1. Policies for 'breweries' table
-- We need to ensure users can INSERT a new brewery.
DROP POLICY IF EXISTS "Authenticated users can create breweries" ON public.breweries;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.breweries;

CREATE POLICY "Authenticated users can create breweries"
ON public.breweries
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure users can SELECT the brewery they just created (and others)
-- Assuming "allow_authenticated_view_breweries.sql" handles SELECT, but let's be safe:
DROP POLICY IF EXISTS "Authenticated users can view breweries" ON public.breweries;
CREATE POLICY "Authenticated users can view breweries"
ON public.breweries
FOR SELECT
TO authenticated
USING (true); 
-- (Or restrict to membership? Usually browsing squads is allowed or fine)


-- 2. Policies for 'brewery_members' table
-- After creating a brewery, the user inserts themselves as 'owner'.
DROP POLICY IF EXISTS "Users can add themselves to a brewery" ON public.brewery_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.brewery_members;

CREATE POLICY "Users can add themselves to a brewery"
ON public.brewery_members
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

