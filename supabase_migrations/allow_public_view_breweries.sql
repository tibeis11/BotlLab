-- Allow public access to breweries (needed for public brewery profiles)

DROP POLICY IF EXISTS "Everyone can view breweries" ON public.breweries;

CREATE POLICY "Everyone can view breweries"
ON public.breweries
FOR SELECT
USING (true);
