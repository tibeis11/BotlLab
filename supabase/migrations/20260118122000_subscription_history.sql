-- Track subscription changes over time
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  changed_reason TEXT,
  previous_tier TEXT,
  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_subscription_history_profile ON subscription_history(profile_id);
CREATE INDEX idx_subscription_history_date ON subscription_history(changed_at DESC);

COMMENT ON TABLE subscription_history IS 'Audit log for subscription tier changes';
