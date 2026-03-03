-- ============================================================
-- Fix Verified Drinker Funnel RLS Policies
-- 
-- Problem: Two RLS issues break the funnel analytics:
--
-- 1. collected_caps SELECT policy = "auth.uid() = user_id"
--    → Brewery owners can't see other users' caps on their brews
--    → Cap Collectors always shows 0 in the funnel
--
-- 2. bottle_scans has no UPDATE policy for regular users
--    AND the SELECT policy only allows brewery owners
--    → trackConversion (called by the rater) can't find/update
--      the scan to mark converted_to_rating = true
--    → Verified Drinkers always shows 0
--
-- Fix 1: Add a SELECT policy on collected_caps for brewery owners.
-- Fix 2: trackConversion moved to API route with supabaseAdmin
--         (service_role bypasses RLS → no policy change needed).
-- ============================================================

-- 1. Allow brewery owners to read collected_caps for their brews
--    This enables the Verified Drinker Funnel to count cap collectors.
CREATE POLICY "Brewery owners can view caps for their brews"
ON public.collected_caps
FOR SELECT
TO authenticated
USING (
  brew_id IN (
    SELECT b.id
    FROM public.brews b
    JOIN public.brewery_members bm ON bm.brewery_id = b.brewery_id
    WHERE bm.user_id = (SELECT auth.uid())
      AND bm.role = 'owner'
  )
);
