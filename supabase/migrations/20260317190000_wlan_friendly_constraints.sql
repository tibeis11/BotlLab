-- 1. Ratings IP Block
ALTER TABLE "public"."ratings" DROP CONSTRAINT IF EXISTS "ratings_brew_id_ip_address_key";
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_brew_rating ON public.ratings (brew_id, user_id) WHERE user_id IS NOT NULL;

-- 2. Flavor Profiles IP Block
DROP INDEX IF EXISTS public.idx_flavor_profiles_anon_ip;
DROP INDEX IF EXISTS public.idx_flavor_profiles_anon_session_ip;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_brew_flavor_profile ON public.flavor_profiles (brew_id, user_id) WHERE user_id IS NOT NULL;
