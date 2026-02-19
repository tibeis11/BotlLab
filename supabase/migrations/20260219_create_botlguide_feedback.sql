-- Create table for BotlGuide feedback
CREATE TABLE IF NOT EXISTS public.botlguide_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    context_key TEXT NOT NULL, -- e.g. "rast.maltoserast"
    feedback TEXT NOT NULL CHECK (feedback IN ('up', 'down')),
    generated_text TEXT, -- Optional: Store what was generated to improve it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.botlguide_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert own feedback" 
ON public.botlguide_feedback FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Only admins/service role can read feedback
CREATE POLICY "Service role can read feedback" 
ON public.botlguide_feedback FOR SELECT 
TO service_role 
USING (true);
