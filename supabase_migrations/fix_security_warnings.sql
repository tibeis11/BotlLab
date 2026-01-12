-- Fix security warnings (Linting)

-- 1. Fix mutable search paths for functions
-- This prevents malicious code from hijacking standard function calls by searching in other schemas first.
ALTER FUNCTION public.increment_bottle_fills() SET search_path = public;
ALTER FUNCTION public.increment_bottle_fills_insert() SET search_path = public;

-- 2. Tighten RLS Policies (Replace 'true' with 'authenticated')
-- Warning: 'true' allowed anonymous (unlogged) users to write. we are restricting this to logged-in users.

-- Table: bottles
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.bottles;
CREATE POLICY "Enable insert access for all users" ON public.bottles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for all users" ON public.bottles;
CREATE POLICY "Enable update access for all users" ON public.bottles FOR UPDATE USING (auth.role() = 'authenticated');

-- Table: brews
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.brews;
CREATE POLICY "Enable insert access for all users" ON public.brews FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for all users" ON public.brews;
CREATE POLICY "Enable update access for all users" ON public.brews FOR UPDATE USING (auth.role() = 'authenticated');

-- Table: ratings
DROP POLICY IF EXISTS "Jeder kann Ratings erstellen" ON public.ratings;
CREATE POLICY "Jeder kann Ratings erstellen" ON public.ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Table: profiles
-- Prevents creating profiles for other users.
DROP POLICY IF EXISTS "Anyone can create a profile" ON public.profiles;
CREATE POLICY "Anyone can create a profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Table: user_achievements
-- Ideally this should be server-side only, but restricting to authenticated is step 1.
DROP POLICY IF EXISTS "Achievements können vergeben werden" ON public.user_achievements;
CREATE POLICY "Achievements können vergeben werden" ON public.user_achievements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
