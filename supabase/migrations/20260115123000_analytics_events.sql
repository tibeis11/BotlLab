-- Create analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Who (Nullable for anonymous/deleted users)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- What
  event_type text NOT NULL,
  category text NOT NULL, -- 'monetization', 'ux', 'system'
  
  -- Context
  path text,
  payload jsonb DEFAULT '{}'::jsonb,
  user_agent text
);

-- Indexes for Dashboard Performance
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_category ON public.analytics_events(category);

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 1. Admins/Service Role can do everything (Read for Dashboard, Insert for Tracking)
CREATE POLICY "Service role full access" 
ON public.analytics_events 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 2. Authenticated users can INSERT their own events
-- (They cannot READ them, so no SELECT policy for authenticated)
CREATE POLICY "Users can insert own events" 
ON public.analytics_events 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
