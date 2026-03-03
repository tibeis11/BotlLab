-- ============================================================
-- ANALYTICS USP Phase 11.0 — Brewer Flavor Intent: flavor_profile auf brews
--
-- Brauer hinterlegen ein Geschmacksprofil (Zielprofil) für ihren Brew.
-- Dieses Profil ist die Basis für "Beat the Brewer" (Phase 11.1).
--
-- Struktur: { sweetness: 0.6, bitterness: 0.8, body: 0.5,
--             roast: 0.1, fruitiness: 0.7,
--             source: 'manual' | 'data_suggestion' | 'botlguide' }
--
-- Werte: 0.0 bis 1.0 (normalisiert). Source zeigt, woher der Wert kam.
-- ============================================================

ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS flavor_profile JSONB;

COMMENT ON COLUMN public.brews.flavor_profile IS
  'Brauer-definiertes Geschmacksprofil (Zielprofil) für Beat the Brewer.
   Struktur: { sweetness, bitterness, body, roast, fruitiness } je 0.0–1.0,
   plus source: manual | data_suggestion | botlguide.
   NULL = Brauer hat noch kein Profil hinterlegt → Beat the Brewer ist deaktiviert.';

-- Index für schnellen Check ob Flavor-Profil existiert (für /b/[id] Page)
CREATE INDEX IF NOT EXISTS idx_brews_has_flavor_profile
  ON public.brews ((flavor_profile IS NOT NULL))
  WHERE flavor_profile IS NOT NULL;
