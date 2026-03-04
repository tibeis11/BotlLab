-- ============================================================
-- ZWEI WELTEN Phase 0.4 — Automatischer Mode-Upgrade bei Brewery-Beitritt
--
-- Wenn ein User einer Brauerei beitritt (auf einem der 3 Wege:
--   1. create_own_squad RPC
--   2. /team/join/[code]
--   3. Admin-Invite via team-actions.ts)
-- wird sein app_mode automatisch auf 'brewer' gesetzt.
--
-- Vorteil: Single Source of Truth — kein App-Code-Pfad kann es vergessen.
-- Upgrade ist irreversibel: ein Brauer kann nicht zurück zu drinker.
-- ============================================================

CREATE OR REPLACE FUNCTION public.upgrade_to_brewer_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nur upgraden wenn User noch Drinker ist (Idempotenz)
  UPDATE public.profiles
  SET
    app_mode         = 'brewer',
    active_brewery_id = NEW.brewery_id
  WHERE id = NEW.user_id
    AND app_mode = 'drinker';

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.upgrade_to_brewer_on_join IS
  'Upgradet einen drinker automatisch auf brewer wenn er einer Brauerei beitritt.
   Fängt alle drei Join-Wege ab (create, join-code, admin-invite).
   Setzt active_brewery_id auf die neue Brauerei.
   Idempotent: Wird nur ausgeführt wenn app_mode noch drinker ist.';

-- Trigger auf brewery_members (fängt alle JOIN-Wege ab)
DROP TRIGGER IF EXISTS on_brewery_member_created ON public.brewery_members;

CREATE TRIGGER on_brewery_member_created
  AFTER INSERT ON public.brewery_members
  FOR EACH ROW
  EXECUTE FUNCTION public.upgrade_to_brewer_on_join();

-- ============================================================
-- Altdaten-Klassifikation: Bestehende User korrekt einordnen
--
-- Konservative Heuristik (Risiko R1 aus Risiko-Matrix):
--   - User MIT brewery_members-Eintrag → brewer
--   - User OHNE brewery_members-Eintrag → drinker (bleibt Default)
-- Nie automatisch einen User degradieren der schon Brauer-Daten hat.
-- ============================================================

UPDATE public.profiles p
SET app_mode = 'brewer'
WHERE EXISTS (
  SELECT 1
  FROM public.brewery_members bm
  WHERE bm.user_id = p.id
)
AND p.app_mode = 'drinker';

-- Sanity-Check-Query (in psql ausführbar nach Migration):
-- SELECT app_mode, COUNT(*) FROM profiles GROUP BY app_mode;
