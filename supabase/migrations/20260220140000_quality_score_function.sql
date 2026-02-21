-- ============================================================
-- Migration: Quality Score Function & Triggers
-- Phase 2.5 – Interner Rezept-Qualitätsscore
-- Timestamp: 20260220140000
-- ============================================================
--
-- Scoring-Algorithmus (max. 110 Punkte, normalisiert auf 0–100):
--   A) Kennzahlen vollständig    (max 30p)
--   B) Rezept-Dokumentation      (max 30p)
--   C) Zutaten-Vollständigkeit   (max 20p)
--   D) Community-Signale         (max 30p)
-- ============================================================

-- ============================================================
-- FUNCTION: calculate_brew_quality_score(brew_id_param UUID)
-- Returns INTEGER 0–100
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_brew_quality_score(brew_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  brew_row          brews%ROWTYPE;
  d                 JSONB;
  score             INTEGER := 0;
  rating_count      INTEGER := 0;
  hop_count         INTEGER := 0;
  malt_count        INTEGER := 0;
  yeast_count       INTEGER := 0;
  documented_hops   INTEGER := 0;
  documented_malts  INTEGER := 0;
BEGIN
  SELECT * INTO brew_row FROM brews WHERE id = brew_id_param;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  d := COALESCE(brew_row.data, '{}'::JSONB);

  -- ============================================================
  -- A) Vollständigkeit der Kennzahlen (max 30 Punkte)
  -- ============================================================
  -- ABV
  IF d->>'abv' IS NOT NULL AND d->>'abv' <> '' THEN score := score + 5; END IF;
  -- IBU
  IF d->>'ibu' IS NOT NULL AND d->>'ibu' <> '' THEN score := score + 5; END IF;
  -- EBC / Farbe
  IF d->>'ebc' IS NOT NULL AND d->>'ebc' <> '' THEN score := score + 5; END IF;
  -- OG (Stammwürze)
  IF d->>'original_gravity' IS NOT NULL AND d->>'original_gravity' <> '' THEN score := score + 5; END IF;
  -- FG (Restextrakt / Ziel)
  IF (d->>'final_gravity' IS NOT NULL AND d->>'final_gravity' <> '')
     OR (d->>'target_fg' IS NOT NULL AND d->>'target_fg' <> '') THEN
    score := score + 5;
  END IF;
  -- Ausschlagvolumen
  IF (d->>'batch_size' IS NOT NULL AND d->>'batch_size' <> '')
     OR (d->>'volume' IS NOT NULL AND d->>'volume' <> '') THEN
    score := score + 5;
  END IF;

  -- ============================================================
  -- B) Rezept-Dokumentation (max 30 Punkte)
  -- ============================================================
  -- Beschreibung > 50 Zeichen
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 50 THEN score := score + 5; END IF;
  -- Beschreibung > 200 Zeichen (additiv)
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 200 THEN score := score + 5; END IF;
  -- Braustil angegeben
  IF brew_row.style IS NOT NULL AND brew_row.style <> '' AND brew_row.style <> 'Unbekannt' THEN
    score := score + 5;
  END IF;
  -- Braunotizen vorhanden
  IF (d->>'brew_notes' IS NOT NULL AND d->>'brew_notes' <> '')
     OR (d->>'notes' IS NOT NULL AND d->>'notes' <> '') THEN
    score := score + 5;
  END IF;
  -- Mind. 2 Hopfengaben mit Menge + Zeitpunkt
  SELECT COUNT(*) INTO documented_hops
    FROM jsonb_array_elements(COALESCE(d->'hops', '[]'::JSONB)) h
    WHERE h->>'amount' IS NOT NULL AND h->>'amount' <> ''
      AND h->>'time' IS NOT NULL   AND h->>'time' <> '';
  IF documented_hops >= 2 THEN score := score + 5; END IF;
  -- Hefe mit Name angegeben
  SELECT COUNT(*) INTO yeast_count
    FROM jsonb_array_elements(COALESCE(d->'yeast', '[]'::JSONB)) y
    WHERE y->>'name' IS NOT NULL AND y->>'name' <> '';
  IF yeast_count > 0 THEN score := score + 5; END IF;

  -- ============================================================
  -- C) Zutaten-Vollständigkeit (max 20 Punkte)
  -- ============================================================
  -- Mind. 2 Malze mit Mengenangabe
  SELECT COUNT(*) INTO documented_malts
    FROM jsonb_array_elements(COALESCE(d->'malts', '[]'::JSONB)) m
    WHERE m->>'amount' IS NOT NULL AND m->>'amount' <> '';
  IF documented_malts >= 2 THEN score := score + 5; END IF;
  -- Mind. 1 Hopfen mit Mengenangabe
  SELECT COUNT(*) INTO documented_hops
    FROM jsonb_array_elements(COALESCE(d->'hops', '[]'::JSONB)) h
    WHERE h->>'amount' IS NOT NULL AND h->>'amount' <> '';
  IF documented_hops >= 1 THEN score := score + 5; END IF;
  -- Hefe angegeben (reuses yeast_count from above)
  IF yeast_count > 0 THEN score := score + 5; END IF;
  -- Wasseraufbereitung / Profil angegeben
  IF (d->>'water_profile' IS NOT NULL AND d->>'water_profile' <> '')
     OR (d->>'water_treatment' IS NOT NULL AND d->>'water_treatment' <> '') THEN
    score := score + 5;
  END IF;

  -- ============================================================
  -- D) Community-Signale (max 30 Punkte)
  -- ============================================================
  -- Eigenes Bild hochgeladen (nicht leer, nicht default Label)
  IF brew_row.image_url IS NOT NULL
     AND brew_row.image_url <> ''
     AND brew_row.image_url NOT LIKE '%default%'
     AND brew_row.image_url NOT LIKE '%default-label%' THEN
    score := score + 5;
  END IF;
  -- Bewertungen erhalten
  SELECT COUNT(*) INTO rating_count FROM ratings WHERE brew_id = brew_id_param;
  IF rating_count >= 1 THEN score := score + 5; END IF;
  IF rating_count >= 3 THEN score := score + 5; END IF;  -- additiv
  -- Mind. 1 Like von einem anderen User
  IF COALESCE(brew_row.likes_count, 0) >= 1 THEN score := score + 5; END IF;
  -- Von anderem User gebraut/kopiert (copy_count >= 1)
  IF COALESCE(brew_row.copy_count, 0) >= 1 THEN score := score + 5; END IF;
  -- Von 3+ anderen Usern gebraut/kopiert (additiv)
  IF COALESCE(brew_row.copy_count, 0) >= 3 THEN score := score + 5; END IF;

  -- ============================================================
  -- Normalisierung: max. 110 Punkte → 0–100
  -- ============================================================
  RETURN LEAST(100, ROUND((score::FLOAT / 110.0) * 100)::INTEGER);
END;
$$;

-- ============================================================
-- TRIGGER FUNCTION: refresh quality score on brew update
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_refresh_quality_score_on_brew()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brews
    SET quality_score = public.calculate_brew_quality_score(NEW.id)
    WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGER: AFTER UPDATE ON brews (skip if only scores changed)
-- ============================================================
DROP TRIGGER IF EXISTS trg_quality_score_on_brew_update ON public.brews;
CREATE TRIGGER trg_quality_score_on_brew_update
  AFTER UPDATE ON public.brews
  FOR EACH ROW
  WHEN (
    -- Only recalculate when relevant content columns change
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.style IS DISTINCT FROM NEW.style OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.image_url IS DISTINCT FROM NEW.image_url OR
    OLD.data IS DISTINCT FROM NEW.data OR
    OLD.likes_count IS DISTINCT FROM NEW.likes_count OR
    OLD.copy_count IS DISTINCT FROM NEW.copy_count
  )
  EXECUTE FUNCTION public.trg_fn_refresh_quality_score_on_brew();

-- ============================================================
-- TRIGGER FUNCTION: refresh quality score when rating inserted
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_refresh_quality_score_on_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brews
    SET quality_score = public.calculate_brew_quality_score(NEW.brew_id)
    WHERE id = NEW.brew_id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGER: AFTER INSERT ON ratings
-- ============================================================
DROP TRIGGER IF EXISTS trg_quality_score_on_rating ON public.ratings;
CREATE TRIGGER trg_quality_score_on_rating
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_refresh_quality_score_on_rating();

-- ============================================================
-- TRIGGER FUNCTION: refresh quality score when like inserted/deleted
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_refresh_quality_score_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_brew_id UUID;
BEGIN
  target_brew_id := COALESCE(NEW.brew_id, OLD.brew_id);
  IF target_brew_id IS NOT NULL THEN
    UPDATE brews
      SET quality_score = public.calculate_brew_quality_score(target_brew_id)
      WHERE id = target_brew_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- TRIGGER: AFTER INSERT OR DELETE ON likes
-- ============================================================
DROP TRIGGER IF EXISTS trg_quality_score_on_like ON public.likes;
CREATE TRIGGER trg_quality_score_on_like
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_refresh_quality_score_on_like();

-- ============================================================
-- INITIAL BACKFILL: calculate quality_score for all public brews
-- ============================================================
DO $$
DECLARE
  brew RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR brew IN SELECT id FROM public.brews WHERE is_public = true LOOP
    UPDATE public.brews
      SET quality_score = public.calculate_brew_quality_score(brew.id)
      WHERE id = brew.id;
    updated_count := updated_count + 1;
  END LOOP;
  RAISE NOTICE 'Quality Score Backfill abgeschlossen: % öffentliche Rezepte aktualisiert', updated_count;
END;
$$;
