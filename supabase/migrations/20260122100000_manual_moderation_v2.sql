-- Migration: Add Manual Moderation System (Status & Security Triggers)
-- Description: Adds moderation_status to brews, tracks reviewer actions, and auto-resets status on image update.

-- 1. Add Moderation Columns to 'brews' table
ALTER TABLE "public"."brews" 
ADD COLUMN IF NOT EXISTS "moderation_status" text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "moderation_rejection_reason" text,
ADD COLUMN IF NOT EXISTS "moderated_at" timestamptz,
ADD COLUMN IF NOT EXISTS "moderated_by" uuid;

-- 2. Add Constraint to ensure valid status values
ALTER TABLE "public"."brews" 
DROP CONSTRAINT IF EXISTS "check_moderation_status";

ALTER TABLE "public"."brews"
ADD CONSTRAINT "check_moderation_status" 
CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- 3. Add Foreign Key for reviewer (optional, but good for data integrity)
-- Note: References auth.users. 
-- In some Supabase setups, referencing auth schema from public can be tricky with backup/restore, 
-- but it is standard for tracking user IDs.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'brews_moderated_by_fkey'
    ) THEN
        ALTER TABLE "public"."brews"
        ADD CONSTRAINT "brews_moderated_by_fkey"
        FOREIGN KEY (moderated_by) REFERENCES auth.users(id);
    END IF;
END $$;

-- 4. Backfill existing data
-- Assume all current images are safe to prevent breaking the live app.
UPDATE "public"."brews" 
SET moderation_status = 'approved', 
    moderated_at = NOW() 
WHERE image_url IS NOT NULL 
  AND moderation_status = 'pending';

-- 5. Create Trigger Function to handle image updates
-- This prevents the "Bait and Switch" attack where a user gets approval and then swaps the URL.
CREATE OR REPLACE FUNCTION public.handle_brew_image_change()
RETURNS TRIGGER 
SECURITY DEFINER -- Run as owner to ensure it always has permission to update these fields
AS $$
BEGIN
  -- If image_url changes, force status back to pending
  IF (OLD.image_url IS DISTINCT FROM NEW.image_url) THEN
    NEW.moderation_status := 'pending';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.moderation_rejection_reason := NULL; -- Clear old rejection reason if they try again
  END IF;
  
  -- Same protection for caps (bottle caps) if they are moderated
  -- Assuming cap_url is also a moderated field
  IF (OLD.cap_url IS DISTINCT FROM NEW.cap_url) THEN
    NEW.moderation_status := 'pending';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.moderation_rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach Trigger to 'brews' table
DROP TRIGGER IF EXISTS on_brew_image_change ON public.brews;

CREATE TRIGGER on_brew_image_change
BEFORE UPDATE ON public.brews
FOR EACH ROW
EXECUTE FUNCTION public.handle_brew_image_change();

-- 7. Add Policy/Grant info (Optional, ensures Admin Actions can read/write)
-- Usually Service Role is used for Admin Actions so RLS isn't the blocker, 
-- but we ensure the public can effectively query these columns if needed (e.g., owner checking status).

-- (No change needed to RLS policies yet as users can read their own brews)
