-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add dedicated abv and ibu columns to brews table
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY: ABV and IBU are currently stored only inside the data JSON field.
--      This makes backend filtering impossible without a full table scan +
--      JSON extraction. Dedicated columns allow index-backed range queries,
--      which is required for the ABV/IBU filter on /discover to be correct
--      (previously filters were client-side only, meaning they only applied
--      to the first 20 loaded brews, not the full database).
--
-- STRATEGY:
--   1. Add nullable NUMERIC(5,2) / INTEGER columns
--   2. Backfill from existing JSON data
--   3. Create a BEFORE INSERT/UPDATE trigger so the columns stay in sync
--      automatically whenever the data JSON is written
--
-- PERFORMANCE: Creates a partial index on abv and ibu for non-null values.
--   This keeps index size small (most rows will have values once backfilled).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS abv NUMERIC(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ibu INTEGER       DEFAULT NULL;

-- 2. Backfill from existing data JSON ─────────────────────────────────────────
-- Uses CASE … WHEN pattern to safely ignore non-numeric JSON values.
-- The regex ^\d+(\.\d+)?$ accepts "5.2", "5", but rejects "" or null.

UPDATE public.brews
SET
  abv = CASE
          WHEN (data->>'abv') ~ '^\d+(\.\d+)?$'
          THEN ROUND((data->>'abv')::NUMERIC, 2)
          ELSE NULL
        END,
  ibu = CASE
          WHEN (data->>'ibu') ~ '^\d+$'
          THEN (data->>'ibu')::INTEGER
          ELSE NULL
        END
WHERE data IS NOT NULL
  AND (abv IS NULL OR ibu IS NULL);

-- 3. Trigger to keep columns in sync on INSERT/UPDATE ─────────────────────────

CREATE OR REPLACE FUNCTION public.sync_brew_abv_ibu()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Sync abv from data JSON
  IF NEW.data IS NOT NULL THEN
    NEW.abv := CASE
                 WHEN (NEW.data->>'abv') ~ '^\d+(\.\d+)?$'
                 THEN ROUND((NEW.data->>'abv')::NUMERIC, 2)
                 ELSE NULL
               END;
    NEW.ibu := CASE
                 WHEN (NEW.data->>'ibu') ~ '^\d+$'
                 THEN (NEW.data->>'ibu')::INTEGER
                 ELSE NULL
               END;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (idempotent re-run)
DROP TRIGGER IF EXISTS trg_sync_brew_abv_ibu ON public.brews;

CREATE TRIGGER trg_sync_brew_abv_ibu
  BEFORE INSERT OR UPDATE OF data
  ON public.brews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_brew_abv_ibu();

-- 4. Partial indexes for fast range queries ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_brews_abv
  ON public.brews (abv)
  WHERE abv IS NOT NULL AND is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_brews_ibu
  ON public.brews (ibu)
  WHERE ibu IS NOT NULL AND is_public = TRUE;
