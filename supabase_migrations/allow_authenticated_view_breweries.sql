-- Fix Discovery Page: Allow authenticated users to see details of ALL breweries
-- (Currently, users can only see breweries they are members of, leading to "Unbekannte Brauerei" in the feed)

CREATE POLICY "Authenticated users can view all breweries" 
ON public.breweries 
FOR SELECT 
USING (auth.role() = 'authenticated');
