-- =====================================================
-- ANALYTICS REPORT SETTINGS
-- =====================================================
-- Allows brewery owners to configure automated weekly/monthly email reports
-- Email sending will be implemented later via Resend/Sendgrid

CREATE TABLE IF NOT EXISTS analytics_report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Who receives the report?
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,

  -- Report Configuration
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  email TEXT NOT NULL, -- Can differ from profile email
  
  -- Which day to send? (1=Monday, 7=Sunday for weekly; 1-28 for monthly)
  send_day INTEGER NOT NULL CHECK (
    (frequency = 'weekly' AND send_day BETWEEN 1 AND 7) OR
    (frequency = 'monthly' AND send_day BETWEEN 1 AND 28)
  ),
  
  -- Report Content Preferences
  include_top_brews BOOLEAN DEFAULT TRUE,
  include_geographic_data BOOLEAN DEFAULT TRUE,
  include_device_stats BOOLEAN DEFAULT TRUE,
  include_time_analysis BOOLEAN DEFAULT FALSE, -- Phase 3 feature
  
  -- Metadata
  last_sent_at TIMESTAMPTZ,
  send_count INTEGER DEFAULT 0,

  UNIQUE(user_id, brewery_id)
);

-- Index for finding reports to send (cron job)
CREATE INDEX idx_analytics_reports_due
ON analytics_report_settings(enabled, frequency, send_day)
WHERE enabled = TRUE;

-- RLS Policies
ALTER TABLE analytics_report_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own report settings
CREATE POLICY "Users can manage own report settings"
ON analytics_report_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- REPORT GENERATION LOG (for debugging & tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  report_setting_id UUID NOT NULL REFERENCES analytics_report_settings(id) ON DELETE CASCADE,
  brewery_id UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  
  -- Report Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  
  -- Metadata
  total_scans INTEGER,
  unique_visitors INTEGER,
  top_brew_id UUID REFERENCES brews(id) ON DELETE SET NULL,
  
  -- Email delivery (when implemented)
  email_sent_to TEXT,
  email_provider TEXT, -- 'resend', 'sendgrid', etc.
  email_id TEXT -- External email service ID
);

-- Index for querying recent reports
CREATE INDEX idx_report_logs_brewery_date
ON analytics_report_logs(brewery_id, created_at DESC);

-- RLS: Users can view logs for their breweries
ALTER TABLE analytics_report_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brewery report logs"
ON analytics_report_logs
FOR SELECT
USING (
  brewery_id IN (
    SELECT brewery_id FROM brewery_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- =====================================================
-- FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_analytics_report_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analytics_report_settings_updated_at
BEFORE UPDATE ON analytics_report_settings
FOR EACH ROW
EXECUTE FUNCTION update_analytics_report_settings_updated_at();

-- =====================================================
-- COMMENT
-- =====================================================
COMMENT ON TABLE analytics_report_settings IS 'Configuration for automated weekly/monthly analytics email reports. Email sending to be implemented via Resend/Sendgrid.';
COMMENT ON TABLE analytics_report_logs IS 'Log of sent/failed analytics reports for debugging and tracking delivery.';
