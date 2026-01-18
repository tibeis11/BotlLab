-- Migration: Set default subscription tier to 'free' and update all existing users
-- Previously: 'enterprise' (Early Access)

-- 1. Change column default for profiles table
ALTER TABLE public.profiles 
ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- 2. Update existing users to 'free'
UPDATE public.profiles
SET subscription_tier = 'free'
WHERE subscription_tier != 'free';

-- 3. Update the auth trigger function to default to 'free' for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    -- Premium fields:
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    -- Default is now 'free' (moved from 'enterprise' Beta phase)
    'free',
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile for new user with Free status (default)';
