-- Migration: Add Plausibility Scores / Shadowban fields
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS "plausibility_score" NUMERIC DEFAULT 1.0;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS "is_shadowbanned" BOOLEAN DEFAULT false;

ALTER TABLE public.tasting_score_events ADD COLUMN IF NOT EXISTS "plausibility_score" NUMERIC DEFAULT 1.0;
ALTER TABLE public.tasting_score_events ADD COLUMN IF NOT EXISTS "is_shadowbanned" BOOLEAN DEFAULT false;

ALTER TABLE public.flavor_profiles ADD COLUMN IF NOT EXISTS "plausibility_score" NUMERIC DEFAULT 1.0;
ALTER TABLE public.flavor_profiles ADD COLUMN IF NOT EXISTS "is_shadowbanned" BOOLEAN DEFAULT false;

-- For fast filtering in dashboards
CREATE INDEX IF NOT EXISTS "idx_ratings_shadowban" ON public.ratings("is_shadowbanned") WHERE "is_shadowbanned" = true;
CREATE INDEX IF NOT EXISTS "idx_tse_shadowban" ON public.tasting_score_events("is_shadowbanned") WHERE "is_shadowbanned" = true;
