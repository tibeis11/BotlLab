-- Fix: function_search_path_mutable warnings for all public functions
-- Adds SET search_path = public to every affected function so Supabase
-- security linter no longer flags them.

-- 1. get_collaborative_recommendations — two overloaded variants
ALTER FUNCTION public.get_collaborative_recommendations(uuid, int)
  SET search_path = public;
ALTER FUNCTION public.get_collaborative_recommendations(uuid, int, int)
  SET search_path = public;

-- 2. get_low_quality_brews
ALTER FUNCTION public.get_low_quality_brews(int)
  SET search_path = public;

-- 3. get_quality_score_distribution
ALTER FUNCTION public.get_quality_score_distribution()
  SET search_path = public;

-- 4. admin_set_featured
ALTER FUNCTION public.admin_set_featured(uuid, bool)
  SET search_path = public;

-- 5. increment_daily_stats — original 6-param variant + new 7-param variant
ALTER FUNCTION public.increment_daily_stats(date, uuid, uuid, text, text, integer)
  SET search_path = public;
ALTER FUNCTION public.increment_daily_stats(date, uuid, uuid, text, text, integer, boolean)
  SET search_path = public;

-- 6. get_featured_brews_public
ALTER FUNCTION public.get_featured_brews_public()
  SET search_path = public;

-- 7. admin_set_trending_score
ALTER FUNCTION public.admin_set_trending_score(uuid, float8)
  SET search_path = public;

-- 8. admin_clear_trending_override
ALTER FUNCTION public.admin_clear_trending_override(uuid)
  SET search_path = public;

-- 9. handle_brew_image_change  (trigger function)
ALTER FUNCTION public.handle_brew_image_change()
  SET search_path = public;

-- 10. create_default_label_on_brewery_insert  (trigger function)
ALTER FUNCTION public.create_default_label_on_brewery_insert()
  SET search_path = public;

-- 11. generate_short_code
ALTER FUNCTION public.generate_short_code()
  SET search_path = public;

-- 12. set_short_code_before_insert  (trigger function)
ALTER FUNCTION public.set_short_code_before_insert()
  SET search_path = public;

-- Note: update_equipment_profiles_updated_at is patched in 20260222120000
