-- ============================================================
-- Migration: times_brewed — zählt echte Brau-Sessions pro Rezept
--
-- copy_count  = wie oft ein Rezept als Vorlage geklont wurde
-- times_brewed = wie oft eine Brau-Session direkt mit diesem
--               Rezept verknüpft wurde (brewing_sessions.brew_id)
--
-- Nur direkte Sessions werden gezählt (keine rekursive Remix-Kette).
-- Der Quality-Score nutzt fortan times_brewed statt copy_count
-- als "wirklich gebraut"-Signal.
-- ============================================================

-- ─── 1. Spalte hinzufügen ────────────────────────────────────
ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS times_brewed INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Backfill aus bestehenden Sessions ────────────────────
UPDATE public.brews b
SET times_brewed = (
  SELECT COUNT(*)
  FROM public.brewing_sessions s
  WHERE s.brew_id = b.id
);

-- ─── 3. Trigger-Funktion: Zähler bei Session-Anlage/Löschung ─
CREATE OR REPLACE FUNCTION public.trg_fn_times_brewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.brew_id IS NOT NULL THEN
      UPDATE public.brews
        SET times_brewed = times_brewed + 1
        WHERE id = NEW.brew_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.brew_id IS NOT NULL THEN
      UPDATE public.brews
        SET times_brewed = GREATEST(0, times_brewed - 1)
        WHERE id = OLD.brew_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- brew_id wurde geändert: alten Zähler dekrementieren, neuen inkrementieren
    IF OLD.brew_id IS DISTINCT FROM NEW.brew_id THEN
      IF OLD.brew_id IS NOT NULL THEN
        UPDATE public.brews
          SET times_brewed = GREATEST(0, times_brewed - 1)
          WHERE id = OLD.brew_id;
      END IF;
      IF NEW.brew_id IS NOT NULL THEN
        UPDATE public.brews
          SET times_brewed = times_brewed + 1
          WHERE id = NEW.brew_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ─── 4. Trigger an brewing_sessions ──────────────────────────
DROP TRIGGER IF EXISTS trg_times_brewed ON public.brewing_sessions;
CREATE TRIGGER trg_times_brewed
  AFTER INSERT OR DELETE OR UPDATE OF brew_id
  ON public.brewing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_times_brewed();

-- ─── 5. Index für Sortierung in Discover ─────────────────────
CREATE INDEX IF NOT EXISTS idx_brews_times_brewed
  ON public.brews (times_brewed DESC)
  WHERE is_public = true;

-- ─── 6. Quality-Score-Funktion v3: times_brewed statt copy_count
--
-- Signal bleibt gleich stark (max 110 Pkt), nur copy_count durch
-- times_brewed ersetzt. So wird echtes Brauen honoriert.
-- ─────────────────────────────────────────────────────────────
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
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 200 THEN score := score + 5; END IF;
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
  -- Eigenes Bild           +5
  -- Bewertungen >= 1       +5    (aktiver Aufwand → niedrige Hürde)
  -- Bewertungen >= 3       +5    (additiv)
  -- Likes >= 5             +5    (5er-Hürde verhindert Self-Like)
  -- times_brewed >= 1      +5    (echte Brau-Session verknüpft)
  -- times_brewed >= 3      +5    (additiv — mehrfach gebraut = bewährt)
  -- ============================================================
  IF brew_row.image_url IS NOT NULL
     AND brew_row.image_url <> ''
     AND brew_row.image_url NOT LIKE '%default%' THEN
    score := score + 5;
  END IF;

  SELECT COUNT(*) INTO rating_count FROM ratings WHERE brew_id = brew_id_param;
  IF rating_count >= 1 THEN score := score + 5; END IF;
  IF rating_count >= 3 THEN score := score + 5; END IF;

  IF COALESCE(brew_row.likes_count, 0) >= 5 THEN score := score + 5; END IF;

  -- times_brewed statt copy_count:
  IF COALESCE(brew_row.times_brewed, 0) >= 1 THEN score := score + 5; END IF;
  IF COALESCE(brew_row.times_brewed, 0) >= 3 THEN score := score + 5; END IF;

  -- ============================================================
  -- Normalisierung: max. 110 Punkte → 0–100
  -- ============================================================
  RETURN LEAST(100, ROUND((score::FLOAT / 110.0) * 100)::INTEGER);
END;
$$;

-- ─── 7. Backfill Quality Score mit neuem Signal ──────────────
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.brews WHERE is_public = true LOOP
    UPDATE public.brews
      SET quality_score = public.calculate_brew_quality_score(rec.id)
      WHERE id = rec.id;
  END LOOP;
  RAISE NOTICE 'times_brewed + Quality Score v3 Backfill abgeschlossen.';
END;
$$;
