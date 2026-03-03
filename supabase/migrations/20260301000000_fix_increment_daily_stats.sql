-- =============================================================================
-- Migration: Fix increment_daily_stats (Phase 1 Bug Fixes 1.1 + 1.2)
-- Created: 2026-03-01
--
-- Fixes:
--   Bug 1.1a — Function lacks SECURITY DEFINER → RLS blocks anonymous callers,
--              analytics_daily_stats stays empty, dashboard shows 0 scans
--   Bug 1.1b — ON CONFLICT uses COALESCE expressions but table only has a simple
--              UNIQUE constraint → PostgreSQL cannot match the arbiter index,
--              conflict resolution silently fails
--   Bug 1.2  — Missing column logged_in_scans for Verified Drinker Funnel (Phase 2)
--   Bug 1.6  — increment_profile_views race condition (add atomic DB function)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Add logged_in_scans column (Bug 1.2)
-- -----------------------------------------------------------------------------
ALTER TABLE public.analytics_daily_stats
  ADD COLUMN IF NOT EXISTS logged_in_scans INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.analytics_daily_stats.logged_in_scans IS
  'Count of scans performed by authenticated (logged-in) users.
   Required for the Verified Drinker Funnel (Analytics Phase 2).
   Populated by trackBottleScan via increment_daily_stats p_is_logged_in param.';


-- -----------------------------------------------------------------------------
-- 2. Replace simple UNIQUE constraint with expression unique index (Bug 1.1b)
--
--    The current ON CONFLICT clause uses COALESCE(brew_id, uuid_nil) etc.
--    PostgreSQL requires an expression index that EXACTLY matches the ON CONFLICT
--    expressions to use as arbiter index. A plain UNIQUE constraint on the raw
--    columns does NOT match and causes the conflict resolution to fail silently.
--
--    We:
--      a) Drop all existing UNIQUE constraints on this table (there should be one)
--      b) Create the matching expression unique index
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema  = 'public'
      AND table_name    = 'analytics_daily_stats'
      AND constraint_type = 'UNIQUE'
  )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.analytics_daily_stats DROP CONSTRAINT IF EXISTS %I',
      r.constraint_name
    );
  END LOOP;
END $$;

-- Expression unique index — must match the ON CONFLICT clause in increment_daily_stats exactly
CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_stats_conflict_idx
  ON public.analytics_daily_stats (
    date,
    brewery_id,
    COALESCE(brew_id,      '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(country_code, ''),
    COALESCE(device_type,  '')
  );


-- -----------------------------------------------------------------------------
-- 3. Recreate increment_daily_stats WITH SECURITY DEFINER (Bug 1.1a + 1.2)
--
--    Changes vs. previous version:
--      + SECURITY DEFINER — function now runs with the role that created it
--        (postgres/service_role), bypassing RLS for the INSERT/UPDATE.
--        This is intentional: the aggregation table is write-only from this
--        function; callers (anonymous visitors) have no direct table access.
--      + p_is_logged_in BOOLEAN — new parameter to populate logged_in_scans
--      - Keeps p_hour and p_is_new_visitor for backwards compatibility
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_daily_stats(
  p_date          DATE,
  p_brewery_id    UUID,
  p_brew_id       UUID,
  p_country_code  TEXT,
  p_device_type   TEXT,
  p_hour          INTEGER    DEFAULT NULL,
  p_is_new_visitor BOOLEAN   DEFAULT TRUE,
  p_is_logged_in  BOOLEAN    DEFAULT FALSE   -- NEW: for Verified Drinker Funnel
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER                             -- KEY FIX: run as owner, bypass RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_daily_stats (
    date,
    brewery_id,
    brew_id,
    country_code,
    device_type,
    total_scans,
    unique_visitors,
    logged_in_scans,
    hour_distribution
  )
  VALUES (
    p_date,
    p_brewery_id,
    p_brew_id,
    p_country_code,
    p_device_type,
    1,
    CASE WHEN p_is_new_visitor   THEN 1 ELSE 0 END,
    CASE WHEN p_is_logged_in     THEN 1 ELSE 0 END,
    CASE
      WHEN p_hour IS NOT NULL THEN jsonb_build_object(p_hour::TEXT, 1)
      ELSE NULL
    END
  )
  ON CONFLICT (
    date,
    brewery_id,
    COALESCE(brew_id,      '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(country_code, ''),
    COALESCE(device_type,  '')
  )
  DO UPDATE SET
    total_scans     = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors
                      + CASE WHEN p_is_new_visitor THEN 1 ELSE 0 END,
    logged_in_scans = analytics_daily_stats.logged_in_scans
                      + CASE WHEN p_is_logged_in   THEN 1 ELSE 0 END,
    hour_distribution = CASE
      WHEN p_hour IS NOT NULL THEN
        CASE
          WHEN analytics_daily_stats.hour_distribution IS NULL THEN
            jsonb_build_object(p_hour::TEXT, 1)
          ELSE
            jsonb_set(
              analytics_daily_stats.hour_distribution,
              ARRAY[p_hour::TEXT],
              to_jsonb(
                COALESCE(
                  (analytics_daily_stats.hour_distribution ->> p_hour::TEXT)::INTEGER,
                  0
                ) + 1
              )
            )
        END
      ELSE analytics_daily_stats.hour_distribution
    END;
END;
$$;

-- Grant execute to authenticated and anon roles
-- (the function itself runs as the definer, this just allows calling it)
GRANT EXECUTE ON FUNCTION public.increment_daily_stats(
  DATE, UUID, UUID, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN
) TO authenticated, anon;


-- -----------------------------------------------------------------------------
-- 4. increment_profile_views — atomic counter (Bug 1.6 race condition fix)
--
--    replaces: UPDATE profiles SET total_profile_views = total_profile_views + 1
--    which is subject to read-modify-write race conditions under concurrent load.
--    Using a single atomic UPDATE inside a SECURITY DEFINER function with
--    SET search_path is safe and efficient.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_profile_views(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_profile_views = COALESCE(total_profile_views, 0) + 1
  WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID)
  TO authenticated, anon;


-- -----------------------------------------------------------------------------
-- Verification queries (run manually after migration to confirm fixes):
--
--   -- Should show logged_in_scans column:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'analytics_daily_stats' AND column_name = 'logged_in_scans';
--
--   -- Should show expression index (not a constraint):
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'analytics_daily_stats'
--     AND indexname = 'analytics_daily_stats_conflict_idx';
--
--   -- Should show SECURITY DEFINER on function:
--   SELECT prosecdef FROM pg_proc
--   WHERE proname = 'increment_daily_stats';  -- prosecdef = true
-- -----------------------------------------------------------------------------
