-- Migration: DSA Content Appeals (Widerspruchsverfahren)
-- Required by Digital Services Act (EU) Art. 20 — Internal complaint handling
-- Date: 2026-02-22
--
-- Users whose content was moderated (removed/restricted) must be able to
-- submit an appeal with a justification. The platform must process appeals
-- in a timely, non-discriminatory, and non-arbitrary manner.

CREATE TABLE IF NOT EXISTS public.content_appeals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    
    -- The user who files the appeal (content author)
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reference to the original report that triggered moderation (if available)
    report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
    
    -- What was moderated
    target_type text NOT NULL,           -- 'forum_thread', 'forum_post', 'brew', 'brewery', etc.
    target_title text,                   -- Snapshot of the content title/preview at time of moderation
    moderation_reason text,              -- Original moderation reason ('spam', 'nsfw', etc.)
    
    -- User's appeal
    appeal_text text NOT NULL CHECK (length(appeal_text) >= 10),
    
    -- Processing
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    admin_response text,                 -- Admin's response to the appeal (DSA requires reasoned decision)
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    
    created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.content_appeals ENABLE ROW LEVEL SECURITY;

-- Users can view their own appeals
CREATE POLICY "Users can view own appeals"
ON public.content_appeals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create appeals
CREATE POLICY "Users can create appeals"
ON public.content_appeals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS content_appeals_user_idx ON public.content_appeals(user_id);
CREATE INDEX IF NOT EXISTS content_appeals_status_idx ON public.content_appeals(status);
