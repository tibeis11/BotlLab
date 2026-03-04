-- Migration: free_tier_5_credits_teaser
-- Description: Grants Free users 5 AI credits/month as a teaser so they can
--              experience AI features before committing to a paid plan.
--              Supersedes the zero-credit policy set in 20260120150000_set_free_credits_to_zero.sql

-- Re-create check_and_increment_ai_credits with WHEN 'free' THEN 5
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_credits(
  user_id UUID,
  OUT can_use BOOLEAN,
  OUT reason TEXT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
  v_used INTEGER;
  v_limit INTEGER;
  v_reset_date TIMESTAMPTZ;
BEGIN
  -- Lock row for update to prevent race condition
  SELECT subscription_tier, subscription_status, ai_credits_used_this_month, ai_credits_reset_at
  INTO v_tier, v_status, v_used, v_reset_date
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;

  -- Default to 'free' if tier is null
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Check if monthly reset is needed
  IF NOW() >= v_reset_date THEN
    UPDATE profiles
    SET ai_credits_used_this_month = 0,
        ai_credits_reset_at = date_trunc('month', NOW() + interval '1 month')
    WHERE id = user_id;
    v_used := 0;
  END IF;

  -- Get tier limit
  -- Free users receive 5 teaser credits/month so they can try AI without buying first.
  v_limit := CASE v_tier
    WHEN 'free' THEN 5
    WHEN 'brewer' THEN 50
    WHEN 'brewery' THEN 200
    WHEN 'enterprise' THEN -1  -- unlimited
    ELSE 5  -- safe fallback: unknown tiers treated like free
  END;

  -- Check limit
  IF v_limit != -1 AND v_used >= v_limit THEN
    can_use := FALSE;
    reason := 'Monthly AI limit reached';
    RETURN;
  END IF;

  -- Check subscription status for paid tiers
  -- Free tier skipped intentionally – no active subscription required for teaser credits.
  IF v_tier != 'free' AND v_status != 'active' AND v_status != 'trial' THEN
    can_use := FALSE;
    reason := 'Subscription inactive';
    RETURN;
  END IF;

  -- Increment usage counter
  UPDATE profiles
  SET ai_credits_used_this_month = ai_credits_used_this_month + 1
  WHERE id = user_id;

  can_use := TRUE;
  reason := 'OK';
END;
$$;
