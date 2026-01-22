-- Migration: Ignore Common Default Assets in Moderation
-- Description: Updates trigger to skip moderation if image_url matches known default paths.

CREATE OR REPLACE FUNCTION public.handle_brew_image_change()
RETURNS TRIGGER AS $$
DECLARE
  needs_review boolean := false;
  is_default_image boolean := false;
  is_default_cap boolean := false;
BEGIN
  -- Helper: Check if new values are strictly "default assets"
  -- You can add more paths here if needed (e.g. '/brand/...')
  IF (NEW.image_url LIKE '/default_label/%' OR NEW.image_url LIKE '/brand/%') THEN
    is_default_image := true;
  END IF;

  IF (NEW.cap_url LIKE '/default_label/%' OR NEW.cap_url LIKE '/brand/%') THEN
    is_default_cap := true;
  END IF;


  -- 1. Determine if changes require review
  IF (TG_OP = 'UPDATE') THEN
      -- If Image changed value AND is not null AND NOT A DEFAULT IMAGE
      IF (OLD.image_url IS DISTINCT FROM NEW.image_url AND NEW.image_url IS NOT NULL AND NOT is_default_image) THEN
         needs_review := true;
      END IF;
      
      -- If Cap changed value AND is not null AND NOT A DEFAULT CAP
      IF (OLD.cap_url IS DISTINCT FROM NEW.cap_url AND NEW.cap_url IS NOT NULL AND NOT is_default_cap) THEN
         needs_review := true;
      END IF;
      
      -- If item was previously REJECTED, any change to images should reset to pending for re-evaluation
      -- (Even removing an image might make it valid)
      IF (OLD.moderation_status = 'rejected') THEN
         -- If we switch TO a default image, we don't need review, we can just approve.
         -- But if we switch to a REAL image, we need review.
         IF (
             (OLD.image_url IS DISTINCT FROM NEW.image_url AND NOT is_default_image) OR 
             (OLD.cap_url IS DISTINCT FROM NEW.cap_url AND NOT is_default_cap)
         ) THEN
             needs_review := true;
         END IF;
      END IF;
  ELSIF (TG_OP = 'INSERT') THEN
      -- On Insert, if there is content, it needs review (UNLESS DEFAULT)
      IF ((NEW.image_url IS NOT NULL AND NOT is_default_image) OR (NEW.cap_url IS NOT NULL AND NOT is_default_cap)) THEN
          needs_review := true;
      END IF;
  END IF;

  -- 2. Apply "Pending" status if needed
  IF (needs_review) THEN
      NEW.moderation_status := 'pending';
      NEW.moderated_at := NULL;
      NEW.moderated_by := NULL;
      NEW.moderation_rejection_reason := NULL;
  END IF;
  
  -- 3. AUTO-APPROVE Override: 
  -- If (No content OR Default Content) exists, it is automatically approved.
  -- EXCEPTION: If the status is explicitly 'rejected', we allow it (so admins can reject & clear images).
  
  -- Logic: If it is NOT pending review (needs_review=false) AND it has no "Real" content
  IF (NOT needs_review) THEN
      -- Check if effective content is empty or default
      IF (
          (NEW.image_url IS NULL OR NEW.image_url LIKE '/default_label/%' OR NEW.image_url LIKE '/brand/%') AND
          (NEW.cap_url IS NULL OR NEW.cap_url LIKE '/default_label/%' OR NEW.cap_url LIKE '/brand/%')
      ) THEN
          IF (NEW.moderation_status IS DISTINCT FROM 'rejected') THEN
            NEW.moderation_status := 'approved';
            NEW.moderated_at := NOW();
            NEW.moderated_by := NULL;
            NEW.moderation_rejection_reason := NULL;
          END IF;
      END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger is already attached, just replacing function is enough.

-- Cleanup: Approve all existing brews with default images that are pending
UPDATE public.brews
SET moderation_status = 'approved', moderated_at = NOW()
WHERE 
  moderation_status = 'pending' AND
  (image_url LIKE '/default_label/%' OR image_url IS NULL) AND
  (cap_url LIKE '/default_label/%' OR cap_url IS NULL);
