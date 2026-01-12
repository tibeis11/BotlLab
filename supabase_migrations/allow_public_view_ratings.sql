-- Allow everyone (authenticated and anonymous) to view ratings
-- This ensures that comments and star ratings are visible on the brew page and discovery page.

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.ratings;

CREATE POLICY "Enable read access for all users"
ON public.ratings
FOR SELECT
USING (true);
