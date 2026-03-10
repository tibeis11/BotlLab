-- ============================================================================
-- Fix RLS on analytics_brewery_daily
-- The previous policy was USING (false), blocking all client reads.
-- Brewery members now can SELECT their own brewery's daily analytics.
-- ============================================================================

-- Drop the blocking placeholder policy
DROP POLICY IF EXISTS "Admin full access" ON analytics_brewery_daily;

-- Service role (used by aggregate-analytics Edge Function) always bypasses RLS,
-- so no explicit service-role policy is needed.

-- Brewery members can read their own brewery's analytics
CREATE POLICY "Brewery members can read own analytics"
ON analytics_brewery_daily
FOR SELECT
USING (
  brewery_id IN (
    SELECT brewery_id
    FROM brewery_members
    WHERE user_id = (SELECT auth.uid())
  )
);
