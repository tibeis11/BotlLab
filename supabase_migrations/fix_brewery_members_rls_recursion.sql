-- Fix Infinite Recursion in brewery_members RLS

-- The problem: RLS policies on 'brewery_members' check if a user is a member of the brewery.
-- This requires querying 'brewery_members', which triggers RLS again -> Infinite Loop.

-- The solution: Create a secure helper function (SECURITY DEFINER) that bypasses RLS 
-- to fetch the user's breweries.

CREATE OR REPLACE FUNCTION public.get_auth_user_brewery_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public -- Security best practice
STABLE
AS $$
    SELECT brewery_id 
    FROM brewery_members 
    WHERE user_id = auth.uid();
$$;

-- Now replace the problematic SELECT policy.
-- Note: We drop likely existing names based on standard naming or previous report.

DROP POLICY IF EXISTS "Members can view their brewery members" ON public.brewery_members;
DROP POLICY IF EXISTS "Users can view own brewery membership" ON public.brewery_members;
-- Also drop potentially conflicting read policies if they exist under other names
DROP POLICY IF EXISTS "Everyone can view brewery members" ON public.brewery_members; 

-- Re-create the VIEW (Select) Policy using the function
CREATE POLICY "Members can view their brewery members" 
ON public.brewery_members
FOR SELECT
USING (
    -- User can see entry if they are the user OR if they belong to the same brewery (via secure function)
    user_id = auth.uid()
    OR
    brewery_id IN (SELECT get_auth_user_brewery_ids())
);
