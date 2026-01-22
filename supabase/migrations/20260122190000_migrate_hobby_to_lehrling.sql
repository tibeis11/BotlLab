-- 1. Migrate any remaining 'hobby' users to 'lehrling'
UPDATE public.profiles 
SET tier = 'lehrling' 
WHERE tier = 'hobby';

-- 2. Change the default value for the tier column
ALTER TABLE public.profiles 
ALTER COLUMN tier SET DEFAULT 'lehrling';

-- 3. Update the check constraint to reflect the new strict tier system
-- We drop the old constraint that included 'hobby', 'braumeister' and brewery tiers
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS "profiles_tier_check";

-- Re-add constraint with only valid Reputation Levels
ALTER TABLE public.profiles 
ADD CONSTRAINT "profiles_tier_check" 
CHECK (tier IN ('lehrling', 'geselle', 'meister', 'legende'));
