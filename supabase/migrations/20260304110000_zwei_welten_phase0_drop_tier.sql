-- ============================================================
-- ZWEI WELTEN Phase 0.3 — profiles.tier droppen, tasting_iq einführen
--
-- Das alte Gamification-Reputation-System (lehrling → legende) war
-- brauer-zentrisch und passt semantisch nicht in die Zwei-Welten-Architektur.
-- Ein Trinker ist kein „Lehrling". Das System wird vollständig ersetzt.
--
-- NEU für Consumer: profiles.tasting_iq (numerischer Score, kein Cap)
-- NEU für Brauerei-Größe: breweries.brewery_size (Migration von breweries.tier)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Gamification-Reputation-Tier von profiles entfernen
-- ------------------------------------------------------------

-- Bestehenden CHECK-Constraint entfernen
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;

-- Feld droppen (lehrling / geselle / meister / legende)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tier;

-- ------------------------------------------------------------
-- 2. Consumer Tasting IQ Score
-- ------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tasting_iq INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.tasting_iq IS
  'Kontinuierlicher Consumer-Kompetenz-Score.
   Wächst mit jedem Beat-the-Brewer-Match, Rating und Vibe-Check.
   Basis für Leaderboards (Analytics Phase 11). Kein Level-Cap.
   Detailhistorie in tasting_score_events.
   Unabhängig von user_achievements (One-Shot-Badges bleiben dort).';

-- Performance-Index für Leaderboard-Queries
CREATE INDEX IF NOT EXISTS idx_profiles_tasting_iq
  ON public.profiles(tasting_iq DESC);

-- ------------------------------------------------------------
-- 3. Audit-Tabelle für Tasting-Score-Events
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tasting_score_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL
    CHECK (event_type IN ('beat_the_brewer', 'rating_given', 'vibe_check', 'bonus', 'correction')),
  brew_id      UUID REFERENCES public.brews(id) ON DELETE SET NULL,
  points_delta INTEGER NOT NULL,     -- positiv = Gewinn, negativ = Korrektur
  match_score  NUMERIC(5,2),         -- NULL wenn kein Match-Score applicable
  metadata     JSONB,                -- z.B. { "slider_values": {...}, "style": "IPA" }
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasting_score_events_user_id
  ON public.tasting_score_events(user_id, created_at DESC);

COMMENT ON TABLE public.tasting_score_events IS
  'Audit-Log aller Tasting-IQ-Änderungen. Single Source of Truth für Reberechnungen.
   Ermöglicht History-View in /my-cellar/taste-dna und zukünftige Anomalie-Korrekturen.
   Punkte-Richtwerte:
     beat_the_brewer: ROUND(match_score * 10) => 0–100 Pkt
     rating_given:    5 Pkt (max 1x pro Brew)
     vibe_check:      3 Pkt (max 1x pro Brew)
     Kommentar ≥20Z:  5 Pkt Zusatz-Bonus';

-- RLS
ALTER TABLE public.tasting_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasting score events"
  ON public.tasting_score_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Server-side insert only for tasting score events"
  ON public.tasting_score_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. Brauerei-Größe als eigenständige Spalte auf breweries
--    (breweries.tier bleibt vorerst bestehen — kein Breaking Change)
-- ------------------------------------------------------------

ALTER TABLE public.breweries
  ADD COLUMN IF NOT EXISTS brewery_size TEXT DEFAULT 'garage';

ALTER TABLE public.breweries
  ADD CONSTRAINT breweries_brewery_size_check
  CHECK (brewery_size IN ('garage', 'micro', 'craft', 'industrial'));

-- Bestehende Werte aus breweries.tier übernehmen
UPDATE public.breweries
  SET brewery_size = tier
  WHERE tier IN ('garage', 'micro', 'craft', 'industrial')
    AND brewery_size = 'garage'; -- nur wenn noch nicht migriert

COMMENT ON COLUMN public.breweries.brewery_size IS
  'Brauerei-Größen-Tier: garage < micro < craft < industrial.
   Migriert von breweries.tier. breweries.tier bleibt vorerst für Rückwärtskompatibilität.';
