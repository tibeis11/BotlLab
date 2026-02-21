-- ============================================================
-- TRENDING SCORE: pg_cron Refresh + RPC (Phase 4.4)
-- ============================================================
-- Refreshes trending_score for all public brews hourly via pg_cron.
-- Formula: likes_count / (age_in_days + 2)^1.5  (Hacker-News-style decay)
-- Also registers get_trending_brews(limit_count) RPC for clean SSR queries.
-- ============================================================

-- ---- 1. Bulk-Refresh-Funktion (direkt SQL, kein HTTP nötig) ----
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
    WHERE is_public = true;
END;
$$;

-- Allow the function to be called by authenticated users (Admin-Dashboard) and service role
GRANT EXECUTE ON FUNCTION public.refresh_trending_scores() TO service_role;

-- ---- 2. pg_cron Job: stündlich alle Trending Scores neu berechnen ----
-- Direkt SQL – kein Edge-Function-HTTP-Call nötig
-- Unschedule nur wenn der Job bereits existiert (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-trending-scores');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Job existiert noch nicht, ignorieren
END;
$$;

SELECT cron.schedule(
  'refresh-trending-scores',
  '0 * * * *', -- jede volle Stunde
  $$ SELECT public.refresh_trending_scores(); $$
);

-- ---- 3. RPC: get_trending_brews — gibt Top-N öffentliche Brews nach trending_score zurück ----
-- Wird von der Discover-Seite (SSR) aufgerufen, um die "Gerade angesagt"-Sektion
-- mit echten DB-seitigen Scores zu füllen, unabhängig vom Infinite-Scroll-Batch.
CREATE OR REPLACE FUNCTION public.get_trending_brews(limit_count int DEFAULT 10)
RETURNS TABLE (
    id                 uuid,
    name               text,
    style              text,
    image_url          text,
    created_at         timestamptz,
    user_id            uuid,
    brew_type          text,
    mash_method        text,
    fermentation_type  text,
    copy_count         int,
    trending_score     float,
    quality_score      int,
    likes_count        int,
    moderation_status  text,
    remix_parent_id    uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        b.id,
        b.name,
        b.style,
        b.image_url,
        b.created_at,
        b.user_id,
        b.brew_type,
        b.mash_method,
        b.fermentation_type,
        b.copy_count,
        b.trending_score,
        b.quality_score,
        b.likes_count,
        b.moderation_status,
        b.remix_parent_id
    FROM brews b
    WHERE b.is_public = true
    ORDER BY b.trending_score DESC NULLS LAST
    LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_brews(int) TO anon, authenticated, service_role;

-- ---- 4. Einmalige Erst-Berechnung direkt beim Deployen ----
SELECT public.refresh_trending_scores();
