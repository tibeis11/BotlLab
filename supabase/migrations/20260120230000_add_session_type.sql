-- Quick Session Feature: Add session_type column
-- Allows differentiation between full sessions (with timeline) and quick sessions (direct to conditioning)

-- Add session_type column with constraint
ALTER TABLE "public"."brewing_sessions" 
  ADD COLUMN "session_type" TEXT DEFAULT 'full' CHECK (session_type IN ('full', 'quick'));

-- Backfill existing sessions as 'full'
UPDATE "public"."brewing_sessions" 
  SET "session_type" = 'full' 
  WHERE "session_type" IS NULL;

-- Make non-nullable after backfill
ALTER TABLE "public"."brewing_sessions" 
  ALTER COLUMN "session_type" SET NOT NULL;

-- Create index for filtering by type
CREATE INDEX "idx_sessions_type" ON "public"."brewing_sessions"("session_type");

-- Create index for common query pattern (brewery + type)
CREATE INDEX "idx_sessions_brewery_type" ON "public"."brewing_sessions"("brewery_id", "session_type");

-- Add column comment for documentation
COMMENT ON COLUMN "public"."brewing_sessions"."session_type" IS 
  'Session creation mode: full (complete LogBook with all phases) or quick (skip to conditioning, minimal data)';
