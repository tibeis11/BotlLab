-- ============================================================
-- Live Trending Score Trigger – Fix & Upgrade
-- ============================================================
-- Fixes two issues in the original trg_update_trending_on_like:
--   1. DELETE (unlike) did not lower trending_score
--   2. Did not respect trending_score_override (would overwrite pins)
-- ============================================================

-- 1. Replace the trigger function to handle INSERT + DELETE
--    and skip pinned brews (trending_score_override IS NOT NULL)
CREATE OR REPLACE FUNCTION update_brew_trending_score()
RETURNS TRIGGER AS $$
DECLARE
  target_brew_id UUID;
BEGIN
  -- Works for both INSERT (NEW) and DELETE (OLD)
  target_brew_id := COALESCE(NEW.brew_id, OLD.brew_id);

  UPDATE brews
  SET trending_score = CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0
          THEN COALESCE(likes_count, 0)::float / POWER(
              EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2,
              1.5
          )
      ELSE 0
  END
  WHERE id = target_brew_id
    AND trending_score_override IS NULL;  -- skip admin-pinned brews

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the old INSERT-only trigger and recreate for INSERT OR DELETE
DROP TRIGGER IF EXISTS trg_update_trending_on_like ON likes;

CREATE TRIGGER trg_update_trending_on_like
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_brew_trending_score();
