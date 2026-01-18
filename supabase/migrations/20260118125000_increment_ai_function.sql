-- Function to atomically check and increment AI credits
-- ⚠️ Fixes Race Condition: Check + Increment in single transaction
CREATE OR REPLACE FUNCTION check_and_increment_ai_credits(
  user_id UUID,
  OUT can_use BOOLEAN,
  OUT reason TEXT
)
LANGUAGE plpgsql
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

  -- Check if reset is needed
  IF NOW() >= v_reset_date THEN
    UPDATE profiles
    SET ai_credits_used_this_month = 0,
        ai_credits_reset_at = date_trunc('month', NOW() + interval '1 month')
    WHERE id = user_id;
    v_used := 0;
  END IF;

  -- Check subscription status
  IF v_status != 'active' THEN
    can_use := FALSE;
    reason := 'Subscription inactive';
    RETURN;
  END IF;

  -- Get tier limit
  v_limit := CASE v_tier
    WHEN 'free' THEN 5
    WHEN 'brewer' THEN 50
    WHEN 'brewery' THEN 200
    WHEN 'enterprise' THEN -1  -- unlimited
    ELSE 0
  END;

  -- Check limit
  IF v_limit != -1 AND v_used >= v_limit THEN
    can_use := FALSE;
    reason := 'Monthly AI limit reached';
    RETURN;
  END IF;

  -- Increment counter
  UPDATE profiles
  SET ai_credits_used_this_month = ai_credits_used_this_month + 1
  WHERE id = user_id;

  can_use := TRUE;
  reason := 'OK';
END;
$$;
