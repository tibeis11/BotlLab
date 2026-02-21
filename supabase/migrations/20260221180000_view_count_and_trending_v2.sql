-- ============================================================
-- Migration: view_count + Trending Score v2
--
-- 1. view_count  — denormalisierter Zähler pro Rezept.
--                 Jede brew_views-Zeile (dwell >= 3s) zählt als 1 Aufruf.
--                 Trigger: AFTER INSERT ON brew_views
--
-- 2. Trending Score v2 — neue Formel:
--      (likes_count + 3 × times_brewed) / (age_days + 2) ^ 1.5
--    Begründung: Eine echte Brau-Session ist ein wesentlich stärkeres
--    Engagement-Signal als ein Like → Multiplikator 3.
--    views werden NICHT in trending einbezogen: zu passiv, zu leicht
--    zu manipulieren, kein Aufwand-Signal.
-- ============================================================

-- ─── 1. Spalte ───────────────────────────────────────────────
ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Backfill aus bestehenden brew_views ──────────────────
-- brew_views hat RLS (user sieht nur eigene Zeilen); das Backend
-- (SECURITY DEFINER) sieht alle Zeilen.
UPDATE public.brews b
SET view_count = (
  SELECT COUNT(*)
  FROM public.brew_views v
  WHERE v.brew_id = b.id
);

-- ─── 3. Trigger-Funktion: view_count bei neuem View inkrementieren ─
CREATE OR REPLACE FUNCTION public.trg_fn_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- brew_views werden nie gelöscht (pure append-log), daher nur INSERT
  UPDATE public.brews
    SET view_count = view_count + 1
    WHERE id = NEW.brew_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_view_count ON public.brew_views;
CREATE TRIGGER trg_view_count
  AFTER INSERT ON public.brew_views
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_view_count();

-- ─── 4. Index (für Admin-Sortierung / Analytics) ─────────────
CREATE INDEX IF NOT EXISTS idx_brews_view_count
  ON public.brews (view_count DESC)
  WHERE is_public = true;

-- ─── 5. Trending Score v2: Bulk-Refresh ──────────────────────
-- Aufgerufen vom stündlichen pg_cron-Job.
-- Formel: (likes_count + 3 × times_brewed) / (age_days + 2)^1.5
CREATE OR REPLACE FUNCTION public.refresh_trending_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brews
  SET trending_score = CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0 THEN
      (COALESCE(likes_count, 0) + 3.0 * COALESCE(times_brewed, 0))::float
      / POWER(
          EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2,
          1.5
        )
    ELSE 0
  END
  WHERE is_public = true
    AND trending_score_override IS NULL;  -- Admin-Pins nicht überschreiben
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_trending_scores() TO service_role;

-- ─── 6. Trending Score v2: Live-Trigger (bei Like-Events) ────
-- Aktualisiert trending_score sofort wenn jemand liked / unliked.
-- Bezieht auch times_brewed ein (lese aktuellen Wert aus DB).
CREATE OR REPLACE FUNCTION public.update_brew_trending_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_brew_id UUID;
BEGIN
  target_brew_id := COALESCE(NEW.brew_id, OLD.brew_id);

  UPDATE brews
  SET trending_score =
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) > 0 THEN
        (COALESCE(likes_count, 0) + 3.0 * COALESCE(times_brewed, 0))::float
        / POWER(
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0 + 2,
            1.5
          )
      ELSE 0
    END
  WHERE id = target_brew_id
    AND trending_score_override IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─── 7. get_trending_brews RPC: view_count + times_brewed ergänzen ─
-- DROP + CREATE nötig, weil sich der Return-Type geändert hat
DROP FUNCTION IF EXISTS public.get_trending_brews(int);
CREATE OR REPLACE FUNCTION public.get_trending_brews(limit_count int DEFAULT 10)
RETURNS TABLE (
  id                uuid,
  name              text,
  style             text,
  image_url         text,
  created_at        timestamptz,
  user_id           uuid,
  brew_type         text,
  mash_method       text,
  fermentation_type text,
  copy_count        int,
  times_brewed      int,
  view_count        int,
  trending_score    float,
  quality_score     int,
  likes_count       int,
  moderation_status text,
  remix_parent_id   uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.name, b.style, b.image_url, b.created_at, b.user_id,
    b.brew_type, b.mash_method, b.fermentation_type,
    b.copy_count, b.times_brewed, b.view_count,
    b.trending_score, b.quality_score, b.likes_count,
    b.moderation_status, b.remix_parent_id
  FROM brews b
  WHERE b.is_public = true
  ORDER BY b.trending_score DESC NULLS LAST
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_brews(int) TO anon, authenticated, service_role;

-- ─── 8. Einmalige Erst-Berechnung mit neuer Formel ───────────
SELECT public.refresh_trending_scores();
