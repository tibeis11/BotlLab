-- Migration: Fix handle_new_user() trigger function
-- Corrects the column name from 'username' to 'display_name' and reads correct metadata key.

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
    birthdate,
    -- Premium fields:
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'birthdate','')::date,
    -- Premium defaults:
    'free',  -- Standard-Plan für neue User
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile for new user; writes display_name, birthdate, and initial premium fields';
