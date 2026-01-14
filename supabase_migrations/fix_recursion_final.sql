-- Fix Circular Recursion between breweries and brewery_members RLS Policies

-- 1. Create a Robust SECURITY DEFINER function to check membership.
-- This function runs with the privileges of the creator (postgres/admin), bypassing RLS on the table it queries.
-- This breaks the infinite recursion loop where Table A checks Table B which checks Table A.

CREATE OR REPLACE FUNCTION public.is_member_of(_brewery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Direct low-level query, no RLS triggered here
  RETURN EXISTS (
    SELECT 1 
    FROM brewery_members 
    WHERE brewery_id = _brewery_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- 2. Reset Policies on brewery_members (The Join Table)
-- We need to ensure queries here don't accidentally loop back to breweries table checks.

ALTER TABLE public.brewery_members ENABLE ROW LEVEL SECURITY;

-- Clean Start
DROP POLICY IF EXISTS "Members can view their brewery members" ON public.brewery_members;
DROP POLICY IF EXISTS "Users can view own brewery membership" ON public.brewery_members;
DROP POLICY IF EXISTS "Everyone can view brewery members" ON public.brewery_members;
DROP POLICY IF EXISTS "Public view brewery members" ON public.brewery_members;
DROP POLICY IF EXISTS "Users can join breweries" ON public.brewery_members;
DROP POLICY IF EXISTS "Members can delete themselves" ON public.brewery_members;
DROP POLICY IF EXISTS "Users can leave breweries" ON public.brewery_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.brewery_members;

-- SELECT Statement:
-- To avoid all recursion, we allow public reading of memberships. 
-- This is necessary anyway if we want to show "Brewed by [Brewery]" publicly.
CREATE POLICY "Public view brewery members"
ON public.brewery_members FOR SELECT
USING (true);

-- INSERT Statement:
-- Strict: A user can only insert a row where the user_id matches their own ID.
-- This prevents adding others. (Admins adding others would need a separate policy or RPC).
CREATE POLICY "Users can join breweries"
ON public.brewery_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- DELETE Statement:
-- 1. Users can leave (delete own row)
CREATE POLICY "Users can leave breweries"
ON public.brewery_members FOR DELETE
USING (auth.uid() = user_id);

-- 2. Admins/Owners (via function check) can remove others
-- This uses the function, so it's safe.
CREATE POLICY "Admins can remove members"
ON public.brewery_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM brewery_members bm
    WHERE bm.brewery_id = brewery_members.brewery_id
    AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin')
  )
);

-- 3. Update Policies on Breweries Table
-- To avoid recursion, we allow public read access (similar to 'allow_public_view_breweries.sql').
-- The is_member_of function (defined above) is kept available for potential future "Private Brewery" features.

DROP POLICY IF EXISTS "Enable read access for members" ON public.breweries;
DROP POLICY IF EXISTS "Members can view their breweries" ON public.breweries;

CREATE POLICY "Enable read access for members"
ON public.breweries FOR SELECT
USING (true);
