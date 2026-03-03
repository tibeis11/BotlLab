-- ============================================================================
-- Phase 11.6 — flavor_profiles Tabelle
--
-- Speichert quantitative Slider-Werte aus Beat the Brewer.
-- Getrennt von ratings.flavor_tags (kategorische Tags) und
-- brews.flavor_profile (Brauer-definiertes Soll-Profil).
--
-- Drei Datenpfade:
--   1. brews.flavor_profile        → Brauer-Soll (kein Nutzer-Input)
--   2. ratings.flavor_tags         → Kategorische Tags (Off-Flavor-Alarm)
--   3. flavor_profiles.*           → Quantitative Slider-Werte (Beat the Brewer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.flavor_profiles (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  brew_id       UUID         NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Optional FK auf die Bewertung — NULL wenn Beat the Brewer ohne Rating gespielt
  rating_id     UUID         REFERENCES public.ratings(id) ON DELETE SET NULL,

  -- Slider-Achsen (0.0 – 1.0)
  sweetness     NUMERIC(4,3) CHECK (sweetness  >= 0 AND sweetness  <= 1),
  bitterness    NUMERIC(4,3) CHECK (bitterness >= 0 AND bitterness <= 1),
  body          NUMERIC(4,3) CHECK (body       >= 0 AND body       <= 1),
  roast         NUMERIC(4,3) CHECK (roast      >= 0 AND roast      <= 1),
  fruitiness    NUMERIC(4,3) CHECK (fruitiness >= 0 AND fruitiness <= 1),

  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_flavor_profiles_brew_id   ON public.flavor_profiles(brew_id);
CREATE INDEX IF NOT EXISTS idx_flavor_profiles_user_id   ON public.flavor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_flavor_profiles_rating_id ON public.flavor_profiles(rating_id)
  WHERE rating_id IS NOT NULL;

-- Unique: pro User + Brew maximal ein Profil (kann geupdated werden)
CREATE UNIQUE INDEX IF NOT EXISTS uq_flavor_profiles_user_brew
  ON public.flavor_profiles(user_id, brew_id);

-- ─── Row Level Security ───
ALTER TABLE public.flavor_profiles ENABLE ROW LEVEL SECURITY;

-- Jeder kann aggregierte Profile lesen (für Radar-Durchschnitt)
CREATE POLICY "flavor_profiles_select_all"
  ON public.flavor_profiles FOR SELECT
  USING (true);

-- Nur eigene Profile einfügen
CREATE POLICY "flavor_profiles_insert_own"
  ON public.flavor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Eigene Profile updaten (Upsert)
CREATE POLICY "flavor_profiles_update_own"
  ON public.flavor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Eigene Profile löschen
CREATE POLICY "flavor_profiles_delete_own"
  ON public.flavor_profiles FOR DELETE
  USING (auth.uid() = user_id);
