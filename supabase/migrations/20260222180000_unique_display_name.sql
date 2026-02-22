-- Migration: Enforce unique display_name on profiles (case-insensitive)
-- Prerequisite for @mention system — usernames must be unambiguous.
--
-- Step 1: Deduplicate existing rows with identical lower(display_name)
--         by appending an incrementing suffix (_2, _3, …).
--         Preserves the oldest account's name unchanged.
-- Step 2: Create a case-insensitive partial unique index.

-- ── Step 1: Deduplicate ────────────────────────────────────────────────────────
DO $$
DECLARE
    rec RECORD;
    suffix INT;
    new_name TEXT;
BEGIN
    FOR rec IN
        SELECT id, display_name,
               ROW_NUMBER() OVER (
                   PARTITION BY lower(display_name)
                   ORDER BY joined_at ASC NULLS LAST, id ASC
               ) AS rn
        FROM public.profiles
        WHERE display_name IS NOT NULL
    LOOP
        IF rec.rn > 1 THEN
            suffix := rec.rn;
            LOOP
                new_name := rec.display_name || '_' || suffix;
                EXIT WHEN NOT EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE lower(display_name) = lower(new_name)
                      AND id <> rec.id
                );
                suffix := suffix + 1;
            END LOOP;
            UPDATE public.profiles SET display_name = new_name WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- ── Step 2: Case-insensitive unique index (only for non-NULL values) ───────────
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_ci_unique
    ON public.profiles (lower(display_name))
    WHERE display_name IS NOT NULL;
