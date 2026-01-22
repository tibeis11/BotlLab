-- Migration: Allow Rejected Status for Empty Brews
-- Description: Updates the trigger to allow 'rejected' status even if image/cap are NULL.

CREATE OR REPLACE FUNCTION public.handle_brew_image_change()
RETURNS TRIGGER AS $$
DECLARE
  needs_review boolean := false;
BEGIN
  -- 1. Determine if changes require review
  IF (TG_OP = 'UPDATE') THEN
      -- If Image changed value AND is not null (i.e., new content added or swapped)
      IF (OLD.image_url IS DISTINCT FROM NEW.image_url AND NEW.image_url IS NOT NULL) THEN
         needs_review := true;
      END IF;
      
      -- If Cap changed value AND is not null
      IF (OLD.cap_url IS DISTINCT FROM NEW.cap_url AND NEW.cap_url IS NOT NULL) THEN
         needs_review := true;
      END IF;
      
      -- If item was previously REJECTED, any change to images should reset to pending for re-evaluation
      IF (OLD.moderation_status = 'rejected' AND (OLD.image_url IS DISTINCT FROM NEW.image_url OR OLD.cap_url IS DISTINCT FROM NEW.cap_url)) THEN
         needs_review := true;
      END IF;
  ELSIF (TG_OP = 'INSERT') THEN
      -- On Insert, if there is content, it needs review
      IF (NEW.image_url IS NOT NULL OR NEW.cap_url IS NOT NULL) THEN
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
  
  -- 3. AUTO-APPROVE Override: If no content exists (Default Image), it is automatically approved.
  -- EXCEPTION: If the status is explicitly 'rejected', we allow it (so admins can reject & clear images).
  IF (NEW.image_url IS NULL AND NEW.cap_url IS NULL) THEN
      IF (NEW.moderation_status IS DISTINCT FROM 'rejected') THEN
        NEW.moderation_status := 'approved';
        NEW.moderated_at := NOW();
        -- Start fresh
        NEW.moderated_by := NULL; 
        NEW.moderation_rejection_reason := NULL;
      END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
