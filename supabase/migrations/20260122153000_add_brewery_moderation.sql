-- Migration: Add Moderation for Breweries
-- Status: Pending
-- Date: 2026-01-22

-- 1. Add columns to breweries table
ALTER TABLE "public"."breweries"
ADD COLUMN "moderation_status" text DEFAULT 'pending'
CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

ADD COLUMN "moderation_rejection_reason" text,
ADD COLUMN "moderated_at" timestamptz,
ADD COLUMN "moderated_by" uuid;

-- 2. Backfill existing logos (TRUST MIGRATION)
UPDATE "public"."breweries"
SET moderation_status = 'approved', moderated_at = NOW()
WHERE logo_url IS NOT NULL;

-- 3. Create Trigger Function for Breweries (Anti-Bypass)
CREATE OR REPLACE FUNCTION public.handle_brewery_logo_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If logo_url changes, reset status to pending
  IF (OLD.logo_url IS DISTINCT FROM NEW.logo_url) THEN
    NEW.moderation_status := 'pending';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.moderation_rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
CREATE TRIGGER on_brewery_logo_change
BEFORE UPDATE ON public.breweries
FOR EACH ROW
EXECUTE FUNCTION public.handle_brewery_logo_change();
