-- Migration: Create Reports Table
-- Date: 2026-01-22

CREATE TYPE report_target_type AS ENUM ('brew', 'user', 'brewery', 'forum_post', 'comment');
CREATE TYPE report_reason AS ENUM ('spam', 'nsfw', 'harassment', 'copyright', 'other');
CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE "public"."reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "reporter_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    "target_id" uuid NOT NULL,
    "target_type" report_target_type NOT NULL,
    
    "reason" report_reason NOT NULL,
    "details" text,
    
    "status" report_status DEFAULT 'open' NOT NULL,
    
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "resolved_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    "resolved_at" timestamptz
);

-- RLS Policies
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

-- Reporters can view their own reports
CREATE POLICY "Users can view their own reports" 
ON "public"."reports" FOR SELECT 
TO authenticated 
USING (auth.uid() = reporter_id);

-- Reporters can create reports
CREATE POLICY "Users can create reports" 
ON "public"."reports" FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports (assuming admin function or role, keeping it simple for now matching moderation pattern)
-- For now, we rely on server-side queries for admin dashboard which bypass RLS with service role or use specific admin policies if role based.
-- Adding a generic policy for consistency if we add role based RLS later.
-- For now, no public read access.

-- Index for faster queries
CREATE INDEX reports_target_idx ON public.reports(target_id, target_type);
CREATE INDEX reports_status_idx ON public.reports(status);
