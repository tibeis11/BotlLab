-- Fix: Remove username column from handle_new_user trigger
-- The username column doesn't exist in profiles table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'free',
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile for new user with Free tier (fixed username->display_name)';
