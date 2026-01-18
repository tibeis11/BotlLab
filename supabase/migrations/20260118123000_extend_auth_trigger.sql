-- Extend existing handle_new_user() function with premium fields
-- ⚠️ This REPLACES the existing function - do not create a duplicate trigger!
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

-- Verify trigger exists (should already be attached from previous migrations)
-- Trigger name: on_auth_user_created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Expected trigger on_auth_user_created not found! Check migration history.';
  END IF;
END $$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile for new user with Early Access premium status (beta phase)';
