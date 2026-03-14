-- Recreate the botlguide_feedback table that was accidentally dropped

CREATE TABLE IF NOT EXISTS public.botlguide_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    context_key TEXT NOT NULL, 
    feedback TEXT NOT NULL CHECK (feedback IN ('up', 'down')),
    generated_text TEXT, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    capability TEXT
);

CREATE INDEX IF NOT EXISTS idx_botlguide_feedback_user_capability 
  ON public.botlguide_feedback (user_id, capability);

ALTER TABLE public.botlguide_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" 
ON public.botlguide_feedback FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read feedback" 
ON public.botlguide_feedback FOR SELECT 
TO service_role 
USING (true);

CREATE POLICY "Users can read own feedback"
ON public.botlguide_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
