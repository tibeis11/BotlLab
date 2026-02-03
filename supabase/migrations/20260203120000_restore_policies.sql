-- Revert drop of potentially needed policies to fix image visibility issues

-- Restore redundant public access policies just in case (Safety first)
CREATE POLICY "Public brews are viewable by everyone" ON public.brews FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.brews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view breweries" ON public.breweries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for members" ON public.breweries FOR SELECT USING (true);

-- Restore bottle access just in case
CREATE POLICY "Enable read access for all users" ON public.bottles FOR SELECT USING (true);
