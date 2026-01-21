-- ============================================================================
-- ADMIN AUDIT LOGGING (Legal Requirement - DSGVO)
-- Created: 2026-01-21
-- Purpose: Track admin access to sensitive user data
-- ============================================================================

CREATE TABLE analytics_admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view_user_cohort', 'export_csv', 'view_revenue', 'view_user_details'
  resource_id TEXT, -- e.g. target_user_id or file_name
  details JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON analytics_admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON analytics_admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON analytics_admin_audit_logs(action);

COMMENT ON TABLE analytics_admin_audit_logs IS 'Immutable audit log for admin actions (GDPR compliance - "watching the watchers")';
COMMENT ON COLUMN analytics_admin_audit_logs.action IS 'Type of admin action performed';
COMMENT ON COLUMN analytics_admin_audit_logs.resource_id IS 'ID of the resource accessed (user_id, file_name, etc.)';
COMMENT ON COLUMN analytics_admin_audit_logs.details IS 'Additional context (filters used, query parameters, etc.)';

-- RLS: Audit Logs - Insert only by system, Read only by Super Admin
ALTER TABLE analytics_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (system logging)
CREATE POLICY "Service role can insert audit logs" 
ON analytics_admin_audit_logs 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Super admins can read (define super admin check later)
CREATE POLICY "Super admin read access" 
ON analytics_admin_audit_logs 
FOR SELECT 
USING (false); -- Adjust later with admin check
