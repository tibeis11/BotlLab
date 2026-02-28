-- Migration: Brewery DELETE SET NULL for brews and bottles
-- When a brewery (team) is deleted, its brews and bottles should NOT be
-- hard-deleted (cascade) and should NOT block deletion (restrict).
-- Instead brewery_id is set to NULL so content survives as solo content.
-- Also ensures the account-deletion flow can dissolve owner-only breweries
-- without FK violations.

-- ── brews.brewery_id ──────────────────────────────────────────────────────────
-- Currently: plain FK (no ON DELETE → RESTRICT by default)
ALTER TABLE public.brews
    DROP CONSTRAINT IF EXISTS brews_brewery_id_fkey;

ALTER TABLE public.brews
    ADD CONSTRAINT brews_brewery_id_fkey
    FOREIGN KEY (brewery_id)
    REFERENCES public.breweries(id)
    ON DELETE SET NULL;

-- ── bottles.brewery_id ────────────────────────────────────────────────────────
-- Currently: plain FK (no ON DELETE → RESTRICT by default)
ALTER TABLE public.bottles
    DROP CONSTRAINT IF EXISTS bottles_brewery_id_fkey;

ALTER TABLE public.bottles
    ADD CONSTRAINT bottles_brewery_id_fkey
    FOREIGN KEY (brewery_id)
    REFERENCES public.breweries(id)
    ON DELETE SET NULL;
