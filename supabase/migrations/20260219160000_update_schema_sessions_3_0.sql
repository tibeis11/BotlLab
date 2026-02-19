-- Up Migration

-- 1. Updates to Brewing Sessions (The "Anchor" Stats)
ALTER TABLE "public"."brewing_sessions"
ADD COLUMN IF NOT EXISTS "measured_og" numeric,
ADD COLUMN IF NOT EXISTS "measured_fg" numeric,
ADD COLUMN IF NOT EXISTS "measured_abv" numeric,
ADD COLUMN IF NOT EXISTS "measure_volume" numeric,
ADD COLUMN IF NOT EXISTS "measured_efficiency" numeric,
ADD COLUMN IF NOT EXISTS "carbonation_level" numeric,
ADD COLUMN IF NOT EXISTS "target_og" numeric;

-- 2. Updates to Measurements (The "Graph" Data)
ALTER TABLE "public"."brew_measurements"
ADD COLUMN IF NOT EXISTS "pressure" numeric, -- Bar
ADD COLUMN IF NOT EXISTS "ph" numeric,
ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual', -- 'manual', 'tilt', etc.
ADD COLUMN IF NOT EXISTS "is_og" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "session_id" uuid REFERENCES "public"."brewing_sessions"("id") ON DELETE CASCADE;

-- 3. Indexes for Analytics
CREATE INDEX IF NOT EXISTS "idx_sessions_og" ON "public"."brewing_sessions"("measured_og");
