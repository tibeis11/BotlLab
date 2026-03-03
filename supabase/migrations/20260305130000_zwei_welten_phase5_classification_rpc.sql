-- ZWEI WELTEN Phase 5: Classification & Backfill RPCs
-- Erstellt sichere Admin-Funktionen (SECURITY DEFINER) zum Triggern aus dem Admin-Dashboard

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1: User-Klassifikations-Preview
-- Zeigt wie viele User nach der Migration welchen Modus hätten
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_preview_user_classification()
RETURNS TABLE(
  total_users         bigint,
  already_brewer      bigint,
  would_become_brewer bigint,
  stay_drinker        bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_users,
    COUNT(*) FILTER (WHERE p.app_mode = 'brewer')::bigint AS already_brewer,
    COUNT(*) FILTER (
      WHERE p.app_mode = 'drinker'
        AND EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id)
    )::bigint AS would_become_brewer,
    COUNT(*) FILTER (
      WHERE p.app_mode = 'drinker'
        AND NOT EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id)
    )::bigint AS stay_drinker
  FROM profiles p;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1: User-Klassifikation ausführen
-- Konservativ: Wer Brewery-Mitglied ist, wird IMMER Brauer.
-- Niemals wird ein Brauer zu einem Drinker degradiert.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_run_user_classification()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_updated integer := 0;
  step_rows     integer;
BEGIN
  -- Schritt 1: User mit Brewery-Mitgliedschaft UND Brau-Content → brewer
  UPDATE profiles p
  SET app_mode = 'brewer'
  WHERE p.app_mode = 'drinker'
    AND EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id)
    AND (
      EXISTS (SELECT 1 FROM brews b WHERE b.user_id = p.id)
      OR EXISTS (SELECT 1 FROM bottles bt WHERE bt.user_id = p.id)
    );
  GET DIAGNOSTICS step_rows = ROW_COUNT;
  total_updated := total_updated + step_rows;

  -- Schritt 2: User MIT Brewery-Mitgliedschaft (auch ohne Content) → brewer
  -- (Hat sich aktiv für Brauer-Flow entschieden)
  UPDATE profiles p
  SET app_mode = 'brewer'
  WHERE p.app_mode = 'drinker'
    AND EXISTS (SELECT 1 FROM brewery_members bm WHERE bm.user_id = p.id);
  GET DIAGNOSTICS step_rows = ROW_COUNT;
  total_updated := total_updated + step_rows;

  RETURN total_updated;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.2: Leere Brauereien abfragen
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_empty_breweries()
RETURNS TABLE(
  id           uuid,
  name         text,
  created_at   timestamptz,
  brew_count   bigint,
  bottle_count bigint,
  member_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name::text,
    b.created_at,
    (SELECT COUNT(*) FROM brews     WHERE brewery_id = b.id)::bigint AS brew_count,
    (SELECT COUNT(*) FROM bottles   WHERE brewery_id = b.id)::bigint AS bottle_count,
    array_agg(p.display_name)::text[] AS member_names
  FROM breweries b
  JOIN brewery_members bm ON bm.brewery_id = b.id
  JOIN profiles p ON p.id = bm.user_id
  GROUP BY b.id, b.name, b.created_at
  HAVING
    (SELECT COUNT(*) FROM brews   WHERE brewery_id = b.id) = 0
    AND (SELECT COUNT(*) FROM bottles WHERE brewery_id = b.id) = 0
  ORDER BY b.created_at DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3: Ratings-Backfill-Preview
-- Zeigt wie viele Ratings einen eindeutigen user_id-Match haben
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_preview_ratings_backfill()
RETURNS TABLE(
  total_unlinked bigint,
  would_link     bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE r.user_id IS NULL)::bigint AS total_unlinked,
    COUNT(*) FILTER (
      WHERE r.user_id IS NULL
        AND (
          SELECT COUNT(*) FROM profiles p2
          WHERE LOWER(p2.display_name) = LOWER(r.author_name)
        ) = 1
    )::bigint AS would_link
  FROM ratings r;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3: Ratings-Backfill ausführen
-- Konservativ: Nur bei EINDEUTIGEM display_name-Match
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_run_ratings_backfill()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE ratings r
  SET user_id = p.id
  FROM profiles p
  WHERE r.user_id IS NULL
    AND LOWER(r.author_name) = LOWER(p.display_name)
    AND (
      SELECT COUNT(*) FROM profiles p2
      WHERE LOWER(p2.display_name) = LOWER(r.author_name)
    ) = 1;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- Berechtigungen: Nur via Admin-Service-Role aufrufbar (kein public execute)
REVOKE EXECUTE ON FUNCTION admin_preview_user_classification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_run_user_classification()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_empty_breweries()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_preview_ratings_backfill()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_run_ratings_backfill()        FROM PUBLIC;
