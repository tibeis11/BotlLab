-- ============================================================
-- Migration: Quality Score v2 – proportionale Like-Schwelle
-- Änderung: likes_count >= 1  →  likes_count >= 5
-- Begründung: Brauer liken ihr eigenes Rezept sofort selbst.
--   5 Likes signalisieren echtes Interesse der Community.
--   Bewertungen bleiben bei >= 1 / >= 3 da sie aktiv sind.
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
  yeast_count       INTEGER := 0;
  documented_hops   INTEGER := 0;
  documented_malts  INTEGER := 0;
BEGIN
  SELECT * INTO brew_row FROM brews WHERE id = brew_id_param;
  IF NOT FOUND THEN RETURN 0; END IF;

  d := COALESCE(brew_row.data, '{}'::JSONB);

  -- ============================================================
  -- A) Vollständigkeit der Kennzahlen (max 30 Punkte)
  -- ============================================================
  IF d->>'abv' IS NOT NULL AND d->>'abv' <> ''               THEN score := score + 5; END IF;
  IF d->>'ibu' IS NOT NULL AND d->>'ibu' <> ''               THEN score := score + 5; END IF;
  IF d->>'ebc' IS NOT NULL AND d->>'ebc' <> ''               THEN score := score + 5; END IF;
  IF d->>'original_gravity' IS NOT NULL AND d->>'original_gravity' <> '' THEN score := score + 5; END IF;
  IF (d->>'final_gravity'  IS NOT NULL AND d->>'final_gravity'  <> '')
  OR (d->>'target_fg'      IS NOT NULL AND d->>'target_fg'      <> '') THEN score := score + 5; END IF;
  IF (d->>'batch_size' IS NOT NULL AND d->>'batch_size' <> '')
  OR (d->>'volume'     IS NOT NULL AND d->>'volume'     <> '') THEN score := score + 5; END IF;

  -- ============================================================
  -- B) Rezept-Dokumentation (max 30 Punkte)
  -- ============================================================
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 50  THEN score := score + 5; END IF;
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 200 THEN score := score + 5; END IF; -- additiv
  IF brew_row.style IS NOT NULL AND brew_row.style <> '' AND brew_row.style <> 'Unbekannt' THEN score := score + 5; END IF;
  IF (d->>'brew_notes' IS NOT NULL AND d->>'brew_notes' <> '')
  OR (d->>'notes'      IS NOT NULL AND d->>'notes'      <> '') THEN score := score + 5; END IF;

  SELECT COUNT(*) INTO documented_hops
    FROM jsonb_array_elements(COALESCE(d->'hops', '[]'::JSONB)) h
    WHERE h->>'amount' IS NOT NULL AND h->>'amount' <> ''
      AND h->>'time'   IS NOT NULL AND h->>'time'   <> '';
  IF documented_hops >= 2 THEN score := score + 5; END IF;

  SELECT COUNT(*) INTO yeast_count
    FROM jsonb_array_elements(COALESCE(d->'yeast', '[]'::JSONB)) y
    WHERE y->>'name' IS NOT NULL AND y->>'name' <> '';
  IF yeast_count > 0 THEN score := score + 5; END IF;

  -- ============================================================
  -- C) Zutaten-Vollständigkeit (max 20 Punkte)
  -- ============================================================
  SELECT COUNT(*) INTO documented_malts
    FROM jsonb_array_elements(COALESCE(d->'malts', '[]'::JSONB)) m
    WHERE m->>'amount' IS NOT NULL AND m->>'amount' <> '';
  IF documented_malts >= 2 THEN score := score + 5; END IF;

  SELECT COUNT(*) INTO documented_hops
    FROM jsonb_array_elements(COALESCE(d->'hops', '[]'::JSONB)) h
    WHERE h->>'amount' IS NOT NULL AND h->>'amount' <> '';
  IF documented_hops >= 1 THEN score := score + 5; END IF;

  IF yeast_count > 0 THEN score := score + 5; END IF;

  IF (d->>'water_profile'   IS NOT NULL AND d->>'water_profile'   <> '')
  OR (d->>'water_treatment' IS NOT NULL AND d->>'water_treatment' <> '') THEN score := score + 5; END IF;

  -- ============================================================
  -- D) Community-Signale (max 30 Punkte)
  --
  -- Likes-Hürde: >= 5 (nicht >= 1), da Brauer ihr eigenes
  --   Rezept sofort selbst liken können. 5 Likes = echtes
  --   Community-Interesse.
  -- Bewertungen: >= 1 / >= 3 — aktiver Aufwand, daher niedrigere
  --   Schwelle gerechtfertigt.
  -- ============================================================
  -- Eigenes Bild
  IF brew_row.image_url IS NOT NULL
     AND brew_row.image_url <> ''
     AND brew_row.image_url NOT LIKE '%default%' THEN
    score := score + 5;
  END IF;
  -- Bewertungen erhalten
  SELECT COUNT(*) INTO rating_count FROM ratings WHERE brew_id = brew_id_param;
  IF rating_count >= 1 THEN score := score + 5; END IF;
  IF rating_count >= 3 THEN score := score + 5; END IF; -- additiv
  -- Likes: Schwelle 5 (verhindert triviales Self-Like)
  IF COALESCE(brew_row.likes_count, 0) >= 5  THEN score := score + 5; END IF;
  -- Kopien
  IF COALESCE(brew_row.copy_count, 0) >= 1 THEN score := score + 5; END IF;
  IF COALESCE(brew_row.copy_count, 0) >= 3 THEN score := score + 5; END IF; -- additiv

  -- ============================================================
  -- Normalisierung: max. 110 Punkte → 0–100
  -- ============================================================
  RETURN LEAST(100, ROUND((score::FLOAT / 110.0) * 100)::INTEGER);
END;
$$;

-- Backfill: alle öffentlichen Rezepte neu berechnen
DO $$
DECLARE rec RECORD; BEGIN
  FOR rec IN SELECT id FROM public.brews WHERE is_public = true LOOP
    UPDATE public.brews
      SET quality_score = public.calculate_brew_quality_score(rec.id)
      WHERE id = rec.id;
  END LOOP;
  RAISE NOTICE 'Quality Score v2 Backfill abgeschlossen.';
END;
$$;
