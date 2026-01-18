-- Enable RLS for premium-related tables
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policies for subscription_history
-- Users can view their own history
CREATE POLICY "Users can view own subscription history"
ON subscription_history
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

-- 2. Policies for ai_usage_logs
-- Users can view their own consumption logs
CREATE POLICY "Users can view own ai usage logs"
ON ai_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);
