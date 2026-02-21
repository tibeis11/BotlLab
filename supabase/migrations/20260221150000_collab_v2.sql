-- ────────────────────────────────────────────────────────────────────────────
-- Stufe C v2: Kollaboratives Filtering — Skalierungs-Erweiterungen
--
-- Änderungen gegenüber v1 (20260221140000):
--   1. user_recommendations Cache-Tabelle (TTL 2h)
--      → Client liest Cache, fällt bei Miss auf Live-RPC zurück
--      → verhindert teure CTE-Query bei jedem Seitenaufruf ab ~500 Nutzern
--
--   2. get_collaborative_recommendations v2
--      → Ratings ≥4★ als zusätzliches Ähnlichkeitssignal (neben Likes)
--      → Stil-Diversity-Cap: max. 3 Brews pro Stil-Kategorie
--
-- Upgrade-Pfad bei >500 aktiven Nutzern:
--   → pg_cron Job 'refresh-collab-cache' aktivieren (auskommentiert unten)
-- ────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Cache-Tabelle
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_recommendations (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brew_id      uuid        NOT NULL REFERENCES brews(id)      ON DELETE CASCADE,
  score        float       NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brew_id)
);

-- RLS: Nutzer sieht + schreibt nur seine eigenen Einträge
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_recommendations: select own"
  ON user_recommendations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_recommendations: delete own"
  ON user_recommendations FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "user_recommendations: insert own"
  ON user_recommendations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Indizes für Cache-Read (user_id filtern, neueste zuerst, nach Score sortieren)
CREATE INDEX IF NOT EXISTS idx_user_recs_user_computed
  ON user_recommendations (user_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_recs_user_score
  ON user_recommendations (user_id, score DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RPC v2 — Ratings + Diversity-Cap
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
  p_user_id uuid,
  p_limit   int DEFAULT 20
)
RETURNS TABLE (brew_id uuid, collab_score float) AS $$
BEGIN
  RETURN QUERY
  WITH

  -- 1. Alle positiven Interaktionen des anfragenden Nutzers
  --    Likes UND Ratings ≥4★ zählen als "ich mag diesen Stil"
  my_interactions AS (
    SELECT l.brew_id FROM likes l WHERE l.user_id = p_user_id
    UNION
    SELECT r.brew_id FROM ratings r WHERE r.user_id = p_user_id AND r.rating >= 4
  ),

  -- 2. Ähnliche Nutzer: alle die ≥2 derselben Brews positiv bewertet haben
  --    Basis: Likes + Ratings ≥4★ anderer Nutzer
  similar_users AS (
    SELECT  combined.user_id,
            COUNT(*)::float AS overlap
    FROM (
      SELECT l.user_id, l.brew_id FROM likes l
      UNION ALL
      SELECT r.user_id, r.brew_id FROM ratings r WHERE r.rating >= 4
    ) combined
    WHERE combined.brew_id IN (SELECT brew_id FROM my_interactions)
      AND combined.user_id <> p_user_id
    GROUP BY combined.user_id
    HAVING  COUNT(*) >= 2
    ORDER BY overlap DESC
    LIMIT   50                        -- Top-50 ähnlichste Nutzer reichen
  ),

  -- 3. Kandidaten: Brews die ähnliche Nutzer gemocht, aber ich noch nicht
  candidate_brews AS (
    SELECT  l.brew_id,
            SUM(su.overlap) AS collab_score
    FROM    likes l
    JOIN    similar_users su ON su.user_id = l.user_id
    WHERE   l.brew_id NOT IN (SELECT brew_id FROM my_interactions)
    GROUP BY l.brew_id
  ),

  -- 4. Stil-Diversity-Cap: öffentliche, moderierte Brews; max. 3 pro Stil
  ranked AS (
    SELECT  cb.brew_id,
            cb.collab_score,
            ROW_NUMBER() OVER (
              PARTITION BY b.style
              ORDER BY     cb.collab_score DESC
            ) AS style_rank
    FROM    candidate_brews cb
    JOIN    brews b ON b.id = cb.brew_id
    WHERE   b.is_public = true
      AND   (b.moderation_status IS NULL OR b.moderation_status = 'approved')
  )

  SELECT  r.brew_id,
          r.collab_score
  FROM    ranked r
  WHERE   r.style_rank <= 3           -- max. 3 Brews pro Stil-Kategorie
  ORDER BY r.collab_score DESC
  LIMIT   p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


COMMENT ON FUNCTION get_collaborative_recommendations(uuid, int) IS
  'Stufe C v2 Kollaboratives Filtering. '
  'Signal: Likes + Ratings>=4 (eigene und fremde). '
  'Diversity-Cap: max. 3 Brews pro Stil-Kategorie. '
  'Cache-Tabelle: user_recommendations (TTL 2h, Client schreibt nach Live-Call). '
  'Upgrade-Pfad ab 500 Nutzern: pg_cron-Job (auskommentiert unten) aktivieren.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Indizes auf likes + ratings für die neuen JOINs
-- ═══════════════════════════════════════════════════════════════════════════

-- (idx_likes_brew_id / idx_likes_user_id bereits in v1)
CREATE INDEX IF NOT EXISTS idx_ratings_user_rating
  ON ratings (user_id, rating)
  WHERE rating >= 4;                  -- Partial index — nur relevante Zeilen


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. UPGRADE-PFAD: pg_cron Cache-Refresh (ab ~500 aktive Nutzer aktivieren)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Wenn der Traffic gross genug ist, ersetzt dieser Job den client-seitigen
-- Cache-Write. Alle aktiven Nutzer (Aktivität in letzten 7 Tagen) bekommen
-- stündlich frische Empfehlungen vorberechnet.
--
-- Aktivieren durch Einkommentieren + `supabase db push`:
--
-- CREATE OR REPLACE FUNCTION refresh_collab_cache_for_active_users()
-- RETURNS void AS $$
-- DECLARE
--   rec RECORD;
-- BEGIN
--   FOR rec IN
--     SELECT DISTINCT user_id
--     FROM   likes
--     WHERE  created_at > now() - interval '7 days'
--     UNION
--     SELECT DISTINCT user_id
--     FROM   ratings
--     WHERE  created_at > now() - interval '7 days'
--   LOOP
--     DELETE FROM user_recommendations WHERE user_id = rec.user_id;
--     INSERT INTO user_recommendations (user_id, brew_id, score)
--       SELECT rec.user_id, brew_id, collab_score
--       FROM   get_collaborative_recommendations(rec.user_id, 20);
--   END LOOP;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- SELECT cron.schedule(
--   'refresh-collab-cache',
--   '0 * * * *',  -- jede Stunde
--   $$SELECT refresh_collab_cache_for_active_users()$$
-- );
