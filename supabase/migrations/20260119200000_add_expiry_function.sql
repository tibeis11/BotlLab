-- ============================================
-- Function: expire_subscriptions
-- Purpose: Bulk downgrade expired subscriptions
-- Called by: Daily cron job (Edge Function or GitHub Actions)
-- Returns: Count of expired users + their IDs
-- Phase: 1.2 - Batch Clean-up Job
-- ============================================

CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS TABLE(
  expired_count INTEGER, 
  expired_user_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  affected_users UUID[];
  row_count INTEGER;
BEGIN
  RAISE NOTICE '[Expiry] Starting subscription expiry check at %', NOW();
  
  -- Find and update expired subscriptions in one atomic operation
  WITH expired AS (
    UPDATE profiles
    SET 
      subscription_status = 'expired',
      subscription_tier = 'free',
      ai_credits_used_this_month = 0
    WHERE 
      subscription_expires_at < NOW()
      AND subscription_status = 'active'
      AND subscription_tier != 'enterprise' -- Protect beta users (lifetime access)
    RETURNING 
      id, 
      subscription_tier AS old_tier
  )
  SELECT array_agg(id) INTO affected_users 
  FROM expired;
  
  -- Get count of affected rows
  row_count := COALESCE(array_length(affected_users, 1), 0);
  
  RAISE NOTICE '[Expiry] Found % expired subscriptions', row_count;
  
  -- Log each expiry to history table
  IF row_count > 0 THEN
    INSERT INTO subscription_history (
      profile_id, 
      subscription_tier, 
      subscription_status, 
      previous_tier, 
      changed_reason,
      metadata
    )
    SELECT 
      p.id,
      'free',
      'expired',
      p.subscription_tier,
      'Automated batch expiry check',
      jsonb_build_object(
        'expired_at', p.subscription_expires_at,
        'batch_processed_at', NOW()
      )
    FROM profiles p
    WHERE p.id = ANY(affected_users);
    
    RAISE NOTICE '[Expiry] Logged % entries to subscription_history', row_count;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT row_count, affected_users;
END;
$$;

-- Grant execution to authenticated users (for manual testing)
GRANT EXECUTE ON FUNCTION expire_subscriptions() TO authenticated;

-- Grant execution to service role (for cron jobs)
GRANT EXECUTE ON FUNCTION expire_subscriptions() TO service_role;

COMMENT ON FUNCTION expire_subscriptions() IS 
  'Daily cron job to expire subscriptions past their end date. 
   Returns count and array of affected user IDs.
   Excludes enterprise tier users (lifetime beta access).
   Logs all changes to subscription_history table.';

-- Test query (run manually to verify function works)
-- SELECT * FROM expire_subscriptions();
