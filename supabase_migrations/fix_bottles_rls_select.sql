-- Fix missing SELECT policy for bottles table
-- This allows bottles to be viewed by the public (needed for scanning QR codes) and authenticated users (dashboard)

DROP POLICY IF EXISTS "Enable read access for all users" ON public.bottles;

CREATE POLICY "Enable read access for all users" ON public.bottles
FOR SELECT
USING (true);
