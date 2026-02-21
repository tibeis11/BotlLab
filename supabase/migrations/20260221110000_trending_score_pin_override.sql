-- ============================================================================
-- Trending Score Pin Override
-- Adds trending_score_override column so manually pinned scores survive the
-- hourly pg_cron refresh. The cron only recalculates rows where the override
-- is NULL; pinned rows are skipped entirely.
-- ============================================================================

-- 1. New column: NULL = auto-calculated, non-NULL = admin-pinned
ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS trending_score_override FLOAT8 DEFAULT NULL;

-- 2. Update refresh function: skip pinned rows
CREATE OR REPLACE FUNCTION public.refresh_trending_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE brews
    SET trending_score = CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0
            THEN (COALESCE(likes_count, 0))::float
                 / POWER(
                     EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2,
                     1.5
                   )
        ELSE 0
    END
    WHERE is_public = true
      AND trending_score_override IS NULL;  -- <-- skip pinned brews
END;
$$;

-- 3. Admin: set a pinned override (writes both columns)
CREATE OR REPLACE FUNCTION public.admin_set_trending_score(
  brew_id UUID,
  new_score FLOAT8
)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  UPDATE public.brews
  SET
    trending_score          = new_score,
    trending_score_override = new_score   -- persist pin
  WHERE id = brew_id;
$$;

-- 4. Admin: clear pin → brew returns to auto-calculation
CREATE OR REPLACE FUNCTION public.admin_clear_trending_override(brew_id UUID)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  UPDATE public.brews
  SET trending_score_override = NULL
  WHERE id = brew_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_trending_override(UUID) TO service_role;
