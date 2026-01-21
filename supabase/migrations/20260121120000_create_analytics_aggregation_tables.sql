-- ============================================================================
-- ADMIN ANALYTICS: Aggregation Tables
-- Created: 2026-01-21
-- Purpose: Pre-aggregated analytics data for fast Admin Dashboard queries
-- ============================================================================

-- ============================================================================
-- User Activity Summary (Daily)
-- ============================================================================
CREATE TABLE analytics_user_daily (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  events_count INTEGER DEFAULT 0,
  session_duration_seconds INTEGER DEFAULT 0,
  features_used TEXT[], -- Array of feature identifiers
  last_event_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_daily_date ON analytics_user_daily(date);
CREATE INDEX idx_user_daily_user ON analytics_user_daily(user_id);
CREATE INDEX idx_user_daily_user_date ON analytics_user_daily(user_id, date DESC);

COMMENT ON TABLE analytics_user_daily IS 'Daily aggregated user activity metrics';
COMMENT ON COLUMN analytics_user_daily.features_used IS 'Array of feature categories used (e.g., [brew, session, bottle])';

-- ============================================================================
-- Brewery Activity Summary (Daily)
-- ============================================================================
CREATE TABLE analytics_brewery_daily (
  id BIGSERIAL PRIMARY KEY,
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  members_count INTEGER DEFAULT 0,
  brews_count INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  bottles_scanned INTEGER DEFAULT 0,
  ratings_received INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0, -- Members with activity this day
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brewery_id, date)
);

CREATE INDEX idx_brewery_daily_date ON analytics_brewery_daily(date);
CREATE INDEX idx_brewery_daily_brewery ON analytics_brewery_daily(brewery_id);
CREATE INDEX idx_brewery_daily_brewery_date ON analytics_brewery_daily(brewery_id, date DESC);

COMMENT ON TABLE analytics_brewery_daily IS 'Daily aggregated brewery team activity';

-- ============================================================================
-- Content Metrics (Daily)
-- ============================================================================
CREATE TABLE analytics_content_daily (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_brews INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_bottles INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  public_brews INTEGER DEFAULT 0,
  private_brews INTEGER DEFAULT 0,
  team_brews INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  brews_created_today INTEGER DEFAULT 0,
  sessions_created_today INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_daily_date ON analytics_content_daily(date DESC);

COMMENT ON TABLE analytics_content_daily IS 'Daily snapshot of all content metrics';

-- ============================================================================
-- System Health Metrics (Hourly)
-- ============================================================================
CREATE TABLE analytics_system_hourly (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  hour INTEGER NOT NULL, -- 0-23
  date DATE NOT NULL,
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  active_users_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, hour)
);

CREATE INDEX idx_system_hourly_date ON analytics_system_hourly(date DESC);
CREATE INDEX idx_system_hourly_timestamp ON analytics_system_hourly(timestamp DESC);

COMMENT ON TABLE analytics_system_hourly IS 'Hourly system health and performance metrics';

-- ============================================================================
-- User Cohorts
-- ============================================================================
CREATE TABLE analytics_cohorts (
  cohort_id TEXT PRIMARY KEY, -- Format: YYYY-MM (Signup Month)
  user_count INTEGER DEFAULT 0,
  retention_day1 DECIMAL(5,2) DEFAULT 0, -- Percentage
  retention_day7 DECIMAL(5,2) DEFAULT 0,
  retention_day30 DECIMAL(5,2) DEFAULT 0,
  retention_day90 DECIMAL(5,2) DEFAULT 0,
  avg_events_per_user DECIMAL(8,2) DEFAULT 0,
  avg_brews_per_user DECIMAL(5,2) DEFAULT 0,
  paid_conversion_rate DECIMAL(5,2) DEFAULT 0, -- Future: Stripe integration
  avg_ltv DECIMAL(10,2) DEFAULT 0, -- Lifetime Value (Future)
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cohorts_id ON analytics_cohorts(cohort_id DESC);

COMMENT ON TABLE analytics_cohorts IS 'Monthly user cohort retention and engagement metrics';

-- ============================================================================
-- Feature Usage Tracking
-- ============================================================================
CREATE TABLE analytics_feature_usage (
  id BIGSERIAL PRIMARY KEY,
  feature TEXT NOT NULL, -- e.g. 'bottle_scanner', 'session_log', 'ai_generation'
  date DATE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(feature, date)
);

CREATE INDEX idx_feature_usage_date ON analytics_feature_usage(date DESC);
CREATE INDEX idx_feature_usage_feature ON analytics_feature_usage(feature);
CREATE INDEX idx_feature_usage_feature_date ON analytics_feature_usage(feature, date DESC);

COMMENT ON TABLE analytics_feature_usage IS 'Daily feature usage metrics';

-- ============================================================================
-- Alert Rules
-- ============================================================================
CREATE TABLE analytics_alert_rules (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL, -- e.g. 'error_rate', 'response_time', 'active_users'
  condition TEXT NOT NULL, -- e.g. 'greater_than', 'less_than', 'drops_by_percent'
  threshold DECIMAL NOT NULL,
  timeframe_minutes INTEGER DEFAULT 5,
  notification_channels TEXT[] DEFAULT ARRAY['email'], -- ['email', 'slack', 'webhook']
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_enabled ON analytics_alert_rules(enabled);

COMMENT ON TABLE analytics_alert_rules IS 'Configurable alerting rules for automated monitoring';

-- ============================================================================
-- Alert History
-- ============================================================================
CREATE TABLE analytics_alert_history (
  id BIGSERIAL PRIMARY KEY,
  rule_id BIGINT REFERENCES analytics_alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT NOW(),
  metric_value DECIMAL,
  message TEXT,
  resolved_at TIMESTAMP,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_history_rule ON analytics_alert_history(rule_id);
CREATE INDEX idx_alert_history_triggered ON analytics_alert_history(triggered_at DESC);
CREATE INDEX idx_alert_history_unresolved ON analytics_alert_history(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE analytics_alert_history IS 'History of triggered alerts';

-- ============================================================================
-- RLS Policies (Admin Only)
-- ============================================================================

-- User Daily: Admin only
ALTER TABLE analytics_user_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_user_daily FOR ALL USING (false);

-- Brewery Daily: Admin only
ALTER TABLE analytics_brewery_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_brewery_daily FOR ALL USING (false);

-- Content Daily: Admin only
ALTER TABLE analytics_content_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_content_daily FOR ALL USING (false);

-- System Hourly: Admin only
ALTER TABLE analytics_system_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_system_hourly FOR ALL USING (false);

-- Cohorts: Admin only
ALTER TABLE analytics_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_cohorts FOR ALL USING (false);

-- Feature Usage: Admin only
ALTER TABLE analytics_feature_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_feature_usage FOR ALL USING (false);

-- Alert Rules: Admin only
ALTER TABLE analytics_alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_alert_rules FOR ALL USING (false);

-- Alert History: Admin only
ALTER TABLE analytics_alert_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON analytics_alert_history FOR ALL USING (false);
