-- ────────────────────────────────────────────────────────────────────────────
-- Stufe C v2.1: Diversity-Cap als konfigurierbarer Parameter
--
-- Änderungen gegenüber v2 (20260221150000):
--   • get_collaborative_recommendations erhält p_diversity_cap int DEFAULT 3
--     → Admin kann über platform_settings steuern, wie viele Brews
--       pro Stil-Kategorie in die Empfehlungen einfließen dürfen
--   • Empfohlene Formel (im Admin-UI berechnet):
--       max(2, round(total_public_brews / 30))
--       z. B. 90 Brews → 3 | 150 → 5 | 300 → 10 | 600 → 20
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
  p_user_id      uuid,
  p_limit        int DEFAULT 20,
  p_diversity_cap int DEFAULT 3   -- max. Brews pro Stil; via platform_settings konfigurierbar
)
RETURNS TABLE (brew_id uuid, collab_score float) AS $$
BEGIN
  RETURN QUERY
  WITH

  -- 1. Alle positiven Interaktionen des anfragenden Nutzers
  my_interactions AS (
    SELECT l.brew_id FROM likes l WHERE l.user_id = p_user_id
    UNION
    SELECT r.brew_id FROM ratings r WHERE r.user_id = p_user_id AND r.rating >= 4
  ),

  -- 2. Ähnliche Nutzer (Likes + Ratings ≥4★, ≥2 gemeinsame Interaktionen)
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
    LIMIT   50
  ),

  -- 3. Kandidaten: Brews ähnlicher Nutzer die ich noch nicht kenne
  candidate_brews AS (
    SELECT  l.brew_id,
            SUM(su.overlap) AS collab_score
    FROM    likes l
    JOIN    similar_users su ON su.user_id = l.user_id
    WHERE   l.brew_id NOT IN (SELECT brew_id FROM my_interactions)
    GROUP BY l.brew_id
  ),

  -- 4. Stil-Diversity-Cap: dynamisch via p_diversity_cap
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
  WHERE   r.style_rank <= p_diversity_cap
  ORDER BY r.collab_score DESC
  LIMIT   p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_collaborative_recommendations(uuid, int, int) IS
  'Stufe C v2.1: p_diversity_cap konfigurierbar (Default 3). '
  'Empfohlene Formel: max(2, round(total_public_brews / 30)). '
  'Signal: Likes + Ratings>=4. Diversity-Cap via platform_settings.collab_diversity_cap.';
