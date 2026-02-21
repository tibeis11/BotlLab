-- ────────────────────────────────────────────────────────────────────────────
-- Stufe C: Kollaboratives Filtering — RPC-Funktion
--
-- get_collaborative_recommendations(p_user_id, p_limit)
--
-- Findet Nutzer mit ähnlichem Geschmack (≥2 gemeinsame Likes) und gibt
-- Brews zurück, die diese Nutzer gemocht haben, die der anfragende Nutzer
-- aber noch nicht interagiert hat.
--
-- Fallback: liefert leeres Ergebnis wenn zu wenige Nutzer-Überschneidungen
-- vorhanden sind — DiscoverClient reagiert auf length < 3.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
  p_user_id uuid,
  p_limit   int DEFAULT 20
)
RETURNS TABLE (brew_id uuid, collab_score float) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 1. Alle Brews die der anfragende Nutzer bereits geliked hat
  my_likes AS (
    SELECT l.brew_id
    FROM   likes l
    WHERE  l.user_id = p_user_id
  ),

  -- 2. Andere Nutzer die mindestens 2 Brews gemeinsam geliked haben
  --    → "ähnliche Nutzer"; sortiert nach Überlappungsgrad
  similar_users AS (
    SELECT  l.user_id,
            COUNT(*)::float AS overlap
    FROM    likes l
    WHERE   l.brew_id IN (SELECT brew_id FROM my_likes)
      AND   l.user_id <> p_user_id
    GROUP BY l.user_id
    HAVING  COUNT(*) >= 2          -- Mindest-Überlappung: 2 gemeinsame Likes
    ORDER BY overlap DESC
    LIMIT   50                     -- Top-50 ähnlichste Nutzer reichen
  ),

  -- 3. Brews die diese ähnlichen Nutzer gemocht haben, die der User noch nicht kennt
  --    collab_score = Summe der Überlappungsgewichte der Nutzer die dieses Brew geliked haben
  candidate_brews AS (
    SELECT  l.brew_id,
            SUM(su.overlap) AS collab_score
    FROM    likes l
    JOIN    similar_users su ON su.user_id = l.user_id
    WHERE   l.brew_id NOT IN (SELECT brew_id FROM my_likes)
    GROUP BY l.brew_id
  )

  -- 4. Nur öffentliche, moderierte Brews zurückgeben
  SELECT  cb.brew_id,
          cb.collab_score
  FROM    candidate_brews cb
  JOIN    brews b ON b.id = cb.brew_id
  WHERE   b.is_public = true
    AND   (b.moderation_status IS NULL OR b.moderation_status = 'approved')
  ORDER BY cb.collab_score DESC
  LIMIT   p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Index auf likes(brew_id) für die WITH-Klauseln oben — falls noch nicht vorhanden
CREATE INDEX IF NOT EXISTS idx_likes_brew_id   ON likes (brew_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id   ON likes (user_id);

-- Kommentar für zukünftige Entwickler
COMMENT ON FUNCTION get_collaborative_recommendations(uuid, int) IS
  'Stufe C Kollaboratives Filtering: findet Brews von ähnlichen Nutzern. '
  'Benötigt mindestens 2 gemeinsame Likes (similar_users HAVING COUNT >= 2). '
  'Gibt leere Tabelle zurück wenn zu wenig Daten vorhanden — DiscoverClient prüft length >= 3.';
