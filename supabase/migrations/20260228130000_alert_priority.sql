-- Migration: Add priority column to analytics_alert_rules
-- Allows HIGH-priority alerts to trigger email notifications via Resend

ALTER TABLE analytics_alert_rules
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'));

COMMENT ON COLUMN analytics_alert_rules.priority IS
  'Alert severity. HIGH alerts trigger email notifications to admin recipients.';
