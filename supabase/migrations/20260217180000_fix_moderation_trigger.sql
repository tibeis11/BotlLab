-- Migration: Fix moderation trigger to handle AI images and default assets
-- This migration updates handle_brew_image_change to NOT trigger 'pending' status for:
-- 1. Default labels (*/default_label/*)
-- 2. Brand assets (*/brand/*)
-- 3. AI Generated Brew Labels (*/ai-brew-*)
-- 4. AI Generated Caps (*/ai-cap-*)

CREATE OR REPLACE FUNCTION public.handle_brew_image_change()
RETURNS TRIGGER AS $$
DECLARE
  -- Default: don't flag for review unless we find a reason
  should_flag boolean := false;
  
  -- Patterns that arc considered safe (auto-approved)
  is_safe_image boolean;
  is_safe_cap boolean;
BEGIN
  -- Helper checks
  is_safe_image := (
      NEW.image_url LIKE '%/default_label/%' OR 
      NEW.image_url LIKE '%/brand/%' OR 
      NEW.image_url LIKE '%/ai-brew-%'
  );
  
  is_safe_cap := (
      NEW.cap_url LIKE '%/default_label/%' OR 
      NEW.cap_url LIKE '%/brand/%' OR 
      NEW.cap_url LIKE '%/ai-cap-%'
  );

  ---------------------------------------------------------------------------
  -- 1. UPDATE LOGIC
  ---------------------------------------------------------------------------
  IF (TG_OP = 'UPDATE') THEN
      
      -- CHECK IMAGE CHANGE
      IF (OLD.image_url IS DISTINCT FROM NEW.image_url AND NEW.image_url IS NOT NULL) THEN
          -- If the new image is NOT safe, we must review it
          IF (NOT is_safe_image) THEN
              should_flag := true;
          END IF;
      END IF;

      -- CHECK CAP CHANGE
      -- Changes to cap colors (hex strings) are ignored.
      IF (OLD.cap_url IS DISTINCT FROM NEW.cap_url AND NEW.cap_url IS NOT NULL AND NOT (NEW.cap_url LIKE '#%')) THEN
          -- If the new cap is NOT safe, we must review it
          IF (NOT is_safe_cap) THEN
              should_flag := true;
          END IF;
      END IF;

      -- SPECIAL CASE: REJECTED ITEMS
      -- If item was previously REJECTED, and we just updated it (even if we didn't change the image, but maybe description),
      -- we usually keep it rejected unless the user fixed the problematic image.
      -- However, this trigger only cares about image changes.
      -- If we changed the image to something SAFE, we should probably un-reject it.
      
      IF (OLD.moderation_status = 'rejected') THEN
          -- If we changed image to safe, or didn't change image but it WAS safe (unlikely to be rejected then),
          -- we might want to auto-approve.
          -- Let's stick to simple logic: If we are modifying a rejected item,
          -- and the resulting state has ONLY safe images, we can approve it.
          -- But the trigger fires on specific column changes.
          
          -- Simplified: If we changed the image and it is now safe, we want to clear the rejected status.
          -- If we didn't flag it above, it means it's either safe or unchanged.
          NULL; 
      END IF;

  ---------------------------------------------------------------------------
  -- 2. INSERT LOGIC
  ---------------------------------------------------------------------------
  ELSIF (TG_OP = 'INSERT') THEN
      -- On Insert, if there is content that is an actual image (not a hex color/safe), it needs review
      IF (NEW.image_url IS NOT NULL AND NOT is_safe_image) THEN
          should_flag := true;
      END IF;

      IF (NEW.cap_url IS NOT NULL AND NOT (NEW.cap_url LIKE '#%') AND NOT is_safe_cap) THEN
          should_flag := true;
      END IF;
  END IF;

  ---------------------------------------------------------------------------
  -- 3. APPLY STATUS
  ---------------------------------------------------------------------------
  
  IF (should_flag) THEN
      NEW.moderation_status := 'pending';
      NEW.moderated_at := NULL;
      NEW.moderated_by := NULL;
      NEW.moderation_rejection_reason := NULL;
  ELSE
      -- If we didn't flag it, it means the new content is either SAFE or UNCHANGED.
      -- If it is SAFE (and we are updating), we should ensure it's not stuck in 'rejected' or 'pending'.
      
      -- Check if current state (NEW) is fully safe
      -- (image is null or safe) AND (cap is null or hex or safe)
      IF (
          (NEW.image_url IS NULL OR is_safe_image) AND 
          (NEW.cap_url IS NULL OR NEW.cap_url LIKE '#%' OR is_safe_cap)
      ) THEN
          -- Auto-approve safe content if it was pending or rejected
          IF (TG_OP = 'INSERT' OR OLD.moderation_status IN ('pending', 'rejected')) THEN
              NEW.moderation_status := 'approved';
              NEW.moderated_at := NOW();
              NEW.moderated_by := NULL;
              NEW.moderation_rejection_reason := NULL;
          END IF;
      END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
