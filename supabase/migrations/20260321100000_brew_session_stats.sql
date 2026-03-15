-- Brew session stats aggregation
-- Adds stats_mode, manual_stats, session_stats columns to brews
-- + measured_ibu / measured_color to brewing_sessions (future-proof)
-- + Postgres function + trigger to auto-aggregate session results

-- ─────────────────────────────────────────────
-- 1. brews table: new columns
-- ─────────────────────────────────────────────

ALTER TABLE brews
  ADD COLUMN IF NOT EXISTS stats_mode text NOT NULL DEFAULT 'live'
    CHECK (stats_mode IN ('live', 'manual')),
  ADD COLUMN IF NOT EXISTS manual_stats jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS session_stats jsonb DEFAULT NULL;

-- manual_stats shape:  { ibu, color, abv, og, fg }
-- session_stats shape: { og_sg, fg_sg, abv, efficiency,
--                        abv_min, abv_max, og_sg_min, og_sg_max,
--                        session_count, last_updated }

-- ─────────────────────────────────────────────
-- 2. brewing_sessions table: future-proof columns
-- ─────────────────────────────────────────────

ALTER TABLE brewing_sessions
  ADD COLUMN IF NOT EXISTS measured_ibu numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS measured_color numeric DEFAULT NULL;

-- ─────────────────────────────────────────────
-- 3. Aggregation function
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_update_recipe_session_stats(p_brew_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'og_sg',         ROUND(AVG(measured_og)::numeric, 4),
    'fg_sg',         ROUND(AVG(measured_fg)::numeric, 4),
    'abv',           ROUND(AVG(measured_abv)::numeric, 2),
    'efficiency',    ROUND(AVG(measured_efficiency)::numeric, 1),
    'abv_min',       ROUND(MIN(measured_abv)::numeric, 2),
    'abv_max',       ROUND(MAX(measured_abv)::numeric, 2),
    'og_sg_min',     ROUND(MIN(measured_og)::numeric, 4),
    'og_sg_max',     ROUND(MAX(measured_og)::numeric, 4),
    'session_count', COUNT(*),
    'last_updated',  NOW()
  )
  INTO v_stats
  FROM (
    -- Only last 10 archived sessions with a measured OG
    SELECT measured_og, measured_fg, measured_abv, measured_efficiency
    FROM brewing_sessions
    WHERE brew_id     = p_brew_id
      AND status      = 'ARCHIVED'   -- set in CompletedTab handleArchive, same call as measured_abv
      AND measured_og IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 10
  ) sub;

  -- Only write if at least one qualifying session was found
  IF (v_stats ->> 'session_count')::int > 0 THEN
    UPDATE brews
    SET session_stats = v_stats
    WHERE id = p_brew_id;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- 4. Trigger function
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_update_recipe_session_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_brew_id uuid;
BEGIN
  -- For DELETE use OLD.brew_id, otherwise NEW.brew_id
  v_brew_id := COALESCE(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.brew_id ELSE NEW.brew_id END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL        ELSE OLD.brew_id END
  );

  IF v_brew_id IS NOT NULL THEN
    PERFORM fn_update_recipe_session_stats(v_brew_id);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ─────────────────────────────────────────────
-- 5. Trigger on brewing_sessions
-- ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sessions_stats_sync ON brewing_sessions;

CREATE TRIGGER trg_sessions_stats_sync
AFTER INSERT OR UPDATE OR DELETE ON brewing_sessions
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_recipe_session_stats();
