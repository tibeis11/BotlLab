-- ============================================================
-- Migration: brew page view RPC
--
-- Vorher: view_count wurde durch einen Trigger auf brew_views
--   inkrementiert (Discover-Dwell-Time ≥ 3s) — falsches Signal.
--
-- Jetzt:  view_count zählt Seiten-Aufrufe von /brew/[id].
--   - Trigger von brew_views → view_count wird entfernt.
--   - Neue SECURITY DEFINER RPC record_brew_page_view():
--       * Inkrementiert view_count für jeden (auch anonymen) Besucher.
--       * Schreibt zusätzlich einen brew_views-Eintrag source='direct'
--         wenn ein user_id übergeben wird (= Personalisierungssignal).
-- ============================================================

-- ─── 1. Trigger von brew_views entfernen ─────────────────────
DROP TRIGGER IF EXISTS trg_view_count ON public.brew_views;
DROP FUNCTION IF EXISTS public.trg_fn_view_count();

-- ─── 2. RPC: record_brew_page_view ───────────────────────────
-- Aufruf: SELECT record_brew_page_view('<brew_id>', '<user_id>');
--         SELECT record_brew_page_view('<brew_id>');   -- anonym
CREATE OR REPLACE FUNCTION public.record_brew_page_view(
  p_brew_id  uuid,
  p_user_id  uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seitenaufruf zählen (auch für anonyme Besucher)
  UPDATE public.brews
    SET view_count = view_count + 1
    WHERE id = p_brew_id AND is_public = true;

  -- Personalisierungssignal nur für eingeloggte Nutzer
  -- Dedup erfolgt clientseitig (sessionStorage) — kein UNIQUE-Constraint nötig
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.brew_views (user_id, brew_id, dwell_seconds, source)
    VALUES (p_user_id, p_brew_id, NULL, 'direct');
  END IF;
END;
$$;

-- Anonyme Aufrufe erlaubt (Seitenaufruf ≠ datenschutzrelevant)
GRANT EXECUTE ON FUNCTION public.record_brew_page_view(uuid, uuid)
  TO anon, authenticated, service_role;
