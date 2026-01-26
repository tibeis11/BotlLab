-- Migration: Update handle_new_user() trigger function to persist birthdate
-- This replaces the function to include reading 'birthdate' from raw_user_meta_data
-- and inserting it into profiles.birthdate (nullable, parsed as date).

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
    birthdate,
    -- Premium fields (NEW):
    subscription_tier,
    subscription_status,
    subscription_started_at,
    ai_credits_used_this_month,
    ai_credits_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'birthdate','')::date,
    -- Premium defaults (Beta-Phase):
    'enterprise',  -- ⚠️ Beta: Early Access für alle (später auf 'free' ändern)
    'active',
    NOW(),
    0,
    date_trunc('month', NOW() + interval '1 month')
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile for new user; writes username, birthdate, and initial premium fields';
