-- Add subscription columns to profiles table
-- DEFAULT 'enterprise' = Early Access Status für Beta-Phase
ALTER TABLE profiles
  ADD COLUMN subscription_tier TEXT DEFAULT 'enterprise' NOT NULL,
  ADD COLUMN subscription_status TEXT DEFAULT 'active' NOT NULL,
  ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN ai_credits_used_this_month INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN ai_credits_reset_at TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW() + interval '1 month') NOT NULL,
  ADD COLUMN custom_brewery_slogan TEXT,
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT UNIQUE;

-- Add constraint for valid subscription tiers
ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'brewer', 'brewery', 'enterprise'));

-- Add constraint for valid subscription status
ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial', 'paused'));

-- Index for quick subscription lookups
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Comment fields for documentation
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription level (free/brewer/brewery/enterprise). Default: enterprise for development.';
COMMENT ON COLUMN profiles.subscription_status IS 'Current subscription status (active/cancelled/expired/trial/paused)';
COMMENT ON COLUMN profiles.subscription_expires_at IS 'When the subscription ends. NULL = lifetime/no expiry.';
COMMENT ON COLUMN profiles.ai_credits_used_this_month IS 'Counter for AI generations this billing period';
COMMENT ON COLUMN profiles.ai_credits_reset_at IS 'Next reset date for AI credits counter';
COMMENT ON COLUMN profiles.custom_brewery_slogan IS 'User-defined slogan for Smart Labels (Premium feature)';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for payment processing (future)';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe Subscription ID (future)';
