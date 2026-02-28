-- Migration: Create admin_users table
-- Replaces ADMIN_EMAILS environment variable as source of truth for admin access.
-- Bootstrap: if table is empty, the first user from ADMIN_EMAILS is auto-inserted
-- by the application (see lib/admin-auth.ts).

CREATE TABLE IF NOT EXISTS public.admin_users (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  added_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email     ON public.admin_users (email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active    ON public.admin_users (is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.admin_users IS
  'Persistent admin user registry. Replaces ADMIN_EMAILS env var. Bootstrapped from env on first login.';

-- RLS: Only service role can read/write (all admin checks use getServiceRoleClient)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.admin_users FOR ALL USING (false);
