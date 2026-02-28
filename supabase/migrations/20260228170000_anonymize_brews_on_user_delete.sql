-- Migration: Brew & Bottle Anonymization on Account Deletion
-- When a user deletes their account, their brews and bottles should NOT be
-- cascade-deleted. Instead, user_id is set to NULL so the content is preserved
-- but anonymized ("Gelöschter Nutzer" shown in UI), protecting other users who
-- have based their own sessions/bottles on these recipes.
--
-- Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse –
-- Datenintegrität für andere Community-Mitglieder).

-- ── brews ─────────────────────────────────────────────────────────────────────

-- brews.user_id currently has no FK constraint (plain uuid column).
-- Add FK with ON DELETE SET NULL so DB itself handles deletions too.
ALTER TABLE public.brews
    DROP CONSTRAINT IF EXISTS brews_user_id_fkey;

ALTER TABLE public.brews
    ADD CONSTRAINT brews_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── bottles ───────────────────────────────────────────────────────────────────

-- bottles.user_id has FK bottles_user_id_fkey without ON DELETE clause.
-- Drop and re-add with ON DELETE SET NULL.
ALTER TABLE public.bottles
    DROP CONSTRAINT IF EXISTS bottles_user_id_fkey;

ALTER TABLE public.bottles
    ADD CONSTRAINT bottles_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
