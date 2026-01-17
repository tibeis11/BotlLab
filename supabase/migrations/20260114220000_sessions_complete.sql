-- Consolidated Migration for Brewing Sessions 2.0 (Sessions V2)
-- Replaces multiple fragmented migrations:
-- 20260114220000_add_sessions, 20260115120000_fix_columns, 20260115140500_add_to_bottles, 20260115160000_v2

-- 1. Create the Brewing Sessions Table (V2 Structure)
CREATE TABLE IF NOT EXISTS "public"."brewing_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brew_id" "uuid" REFERENCES "public"."brews"("id") ON DELETE SET NULL, -- Only optional link to recipe
    "brewery_id" "uuid" REFERENCES "public"."breweries"("id") ON DELETE CASCADE NOT NULL,
    
    -- Core Dates
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "brewed_at" date DEFAULT CURRENT_DATE, -- The actual brew day
    "started_at" timestamp with time zone, -- Precise start timestamp
    "completed_at" timestamp with time zone, -- Finished/Archived date
    
    -- Status & Phase
    "status" text DEFAULT 'planning', -- detailed status: mashing, boiling, etc.
    "phase" text DEFAULT 'planning', -- high level: planning, brewing, fermenting, conditioning, completed
    
    -- Data & Logs
    "batch_code" text, -- e.g. "B-2026-01"
    "timeline" jsonb DEFAULT '[]'::jsonb, -- The Event Source Log
    "notes" text, -- Legacy/Summary notes
    
    -- Caches (Computed from Timeline)
    "measurements" jsonb DEFAULT '{}'::jsonb, -- Legacy/Quick Access (OG, FG)
    "current_gravity" numeric,
    "apparent_attenuation" numeric,

    CONSTRAINT "brewing_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."brewing_sessions" OWNER TO "postgres";

-- 2. Enable RLS
ALTER TABLE "public"."brewing_sessions" ENABLE ROW LEVEL SECURITY;

-- 3. Add column to Bottles (Link specific bottles to a session)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bottles' AND column_name = 'session_id') THEN
        ALTER TABLE "public"."bottles" ADD COLUMN "session_id" UUID REFERENCES "public"."brewing_sessions"("id") ON DELETE SET NULL;
        CREATE INDEX "idx_bottles_session_id" ON "public"."bottles"("session_id");
    END IF;
END $$;

-- 4. RLS Policies (Re-applied or Ensured)
-- (Removed Public View Policy due to missing is_public column on breweries table)

CREATE POLICY "View sessions for members" ON "public"."brewing_sessions"
FOR SELECT USING (
    auth.uid() IN (
        SELECT "user_id" FROM "public"."brewery_members"
        WHERE "brewery_id" = "brewing_sessions"."brewery_id"
    )
);

-- Manage: Only Members with role 'admin' or 'brewer' (simplified: any member for now, or check role)
CREATE POLICY "Manage sessions for members" ON "public"."brewing_sessions"
FOR ALL USING (
    auth.uid() IN (
        SELECT "user_id" FROM "public"."brewery_members"
        WHERE "brewery_id" = "brewing_sessions"."brewery_id"
    )
);

-- 5. RPC Function: Atomic Timeline Append
CREATE OR REPLACE FUNCTION append_timeline_entry(
  p_session_id UUID,
  p_new_entry JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_updated_timeline JSONB;
BEGIN
  UPDATE "public"."brewing_sessions"
  SET timeline = COALESCE(timeline, '[]'::jsonb) || p_new_entry
  WHERE id = p_session_id
  RETURNING timeline INTO v_updated_timeline;

  RETURN v_updated_timeline;
END;
$$;
