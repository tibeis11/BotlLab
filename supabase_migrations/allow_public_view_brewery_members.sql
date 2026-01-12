-- Allow public access to brewery members list (needed for public brewery profiles)
-- This supplements the existing "Members can view their brewery members" policy.

DROP POLICY IF EXISTS "Everyone can view brewery members" ON public.brewery_members;

CREATE POLICY "Everyone can view brewery members"
ON public.brewery_members
FOR SELECT
USING (true);
