-- Add analytics opt-out column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS analytics_opt_out BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.analytics_opt_out IS 'If true, user data is excluded from internal analytics (Opt-Out via Dashboard)';
