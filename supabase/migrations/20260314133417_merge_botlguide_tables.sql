-- Merge botlguide_insights and botlguide_feedback into analytics_ai_insights

-- 1. Add missing contextual columns to analytics_ai_insights
ALTER TABLE public.analytics_ai_insights
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.brewing_sessions(id) ON DELETE CASCADE;

-- 2. Drop the redundant tables
DROP TABLE IF EXISTS public.botlguide_insights CASCADE;
DROP TABLE IF EXISTS public.botlguide_feedback CASCADE;
