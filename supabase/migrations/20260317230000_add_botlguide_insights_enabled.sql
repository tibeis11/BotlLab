ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "botlguide_insights_enabled" boolean DEFAULT true NOT NULL;
