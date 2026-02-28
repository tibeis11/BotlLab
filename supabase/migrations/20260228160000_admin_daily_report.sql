-- Migration: Add daily_report_enabled to admin_users + moderator role support
-- Enables per-super-admin toggle for the daily platform status email.

-- 1. Add daily_report_enabled column (only meaningful for super_admins, but stored for all)
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS daily_report_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Expand role constraint to include the new 'moderator' role
ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'super_admin', 'moderator'));

COMMENT ON COLUMN public.admin_users.daily_report_enabled IS
  'If true (and role = super_admin), receive the daily platform status email. Default: true.';
