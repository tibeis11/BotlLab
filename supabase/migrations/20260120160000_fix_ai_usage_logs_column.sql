-- Fix column name in ai_usage_logs: rename profile_id to user_id for consistency
ALTER TABLE ai_usage_logs 
  RENAME COLUMN profile_id TO user_id;

-- Update index to match new column name
DROP INDEX IF EXISTS idx_ai_usage_profile;
CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id);

-- Note: Foreign key constraint will automatically update to reference the new column name
