-- Migration: Forum Vote / Reaction System
-- One record per (user, target, reaction_type).
-- Toggling = delete existing row OR insert new row (handled by server action).

CREATE TABLE IF NOT EXISTS public.forum_votes (
    "id"            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "target_id"     uuid NOT NULL,
    "target_type"   text NOT NULL CHECK (target_type IN ('thread', 'post')),
    "user_id"       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "reaction_type" text NOT NULL CHECK (reaction_type IN ('prost', 'hilfreich', 'feuer')),
    "created_at"    timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT forum_votes_unique UNIQUE (target_id, user_id, reaction_type)
);

-- RLS
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts
CREATE POLICY "Forum votes are publicly readable"
    ON public.forum_votes FOR SELECT USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Authenticated users can vote"
    ON public.forum_votes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can remove own votes"
    ON public.forum_votes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Index for fast lookups by target
CREATE INDEX IF NOT EXISTS forum_votes_target_idx
    ON public.forum_votes (target_id, reaction_type);

CREATE INDEX IF NOT EXISTS forum_votes_user_idx
    ON public.forum_votes (user_id, target_id);
