-- ============================================================================
-- Fix-Migration: Ingredients Engine v2 — Kritische Bugs + Stabilisierung
-- ============================================================================
-- 
-- Bug A: calculate_brew_quality_score() liest aus gelöschtem JSONB (d->'malts' etc.)
--        → Sektionen B+C liefern 0 Punkte für alle migrierten Rezepte
--
-- Bug B: get_user_brew_context() RPC gibt NULL für malts/hops/yeast zurück
--        weil b.data->'malts' nach Migration leer ist
--
-- Fix C: ingredients_migrated Tracking-Column in brews + Backfill
-- ============================================================================


-- ============================================================================
-- FIX A: calculate_brew_quality_score — liest jetzt aus recipe_ingredients
-- ============================================================================

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
  --    → Liest jetzt aus recipe_ingredients statt JSONB
  -- ============================================================
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 50  THEN score := score + 5; END IF;
  IF brew_row.description IS NOT NULL AND LENGTH(brew_row.description) > 200 THEN score := score + 5; END IF;
  IF brew_row.style IS NOT NULL AND brew_row.style <> '' AND brew_row.style <> 'Unbekannt' THEN score := score + 5; END IF;
  IF (d->>'brew_notes' IS NOT NULL AND d->>'brew_notes' <> '')
  OR (d->>'notes'      IS NOT NULL AND d->>'notes'      <> '') THEN score := score + 5; END IF;

  -- Hops mit Amount+Time dokumentiert (aus recipe_ingredients)
  SELECT COUNT(*) INTO documented_hops
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = brew_id_param
      AND ri.type = 'hop'
      AND ri.amount IS NOT NULL
      AND ri.time_minutes IS NOT NULL;
  IF documented_hops >= 2 THEN score := score + 5; END IF;

  -- Yeast vorhanden (aus recipe_ingredients)
  SELECT COUNT(*) INTO yeast_count
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = brew_id_param
      AND ri.type = 'yeast'
      AND ri.raw_name IS NOT NULL AND ri.raw_name <> '';
  IF yeast_count > 0 THEN score := score + 5; END IF;

  -- ============================================================
  -- C) Zutaten-Vollständigkeit (max 20 Punkte)
  --    → Liest jetzt aus recipe_ingredients statt JSONB
  -- ============================================================
  
  -- Malts mit Amount dokumentiert
  SELECT COUNT(*) INTO documented_malts
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = brew_id_param
      AND ri.type = 'malt'
      AND ri.amount IS NOT NULL;
  IF documented_malts >= 2 THEN score := score + 5; END IF;

  -- Hops mit Amount dokumentiert
  SELECT COUNT(*) INTO documented_hops
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = brew_id_param
      AND ri.type = 'hop'
      AND ri.amount IS NOT NULL;
  IF documented_hops >= 1 THEN score := score + 5; END IF;

  IF yeast_count > 0 THEN score := score + 5; END IF;

  IF (d->>'water_profile'   IS NOT NULL AND d->>'water_profile'   <> '')
  OR (d->>'water_treatment' IS NOT NULL AND d->>'water_treatment' <> '') THEN score := score + 5; END IF;

  -- ============================================================
  -- D) Community-Signale (max 30 Punkte)
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

-- Backfill: Quality Scores mit korrekter Berechnung aktualisieren
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.brews WHERE is_public = true LOOP
    UPDATE public.brews
      SET quality_score = public.calculate_brew_quality_score(rec.id)
      WHERE id = rec.id;
  END LOOP;
  RAISE NOTICE 'Quality Score Backfill nach Ingredients-Fix abgeschlossen.';
END $$;


-- ============================================================================
-- FIX B: get_user_brew_context — liest malts/hops/yeast aus recipe_ingredients
--        + inspirationSignal hops-Extraktion auch aus recipe_ingredients
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_brew_context(
  p_user_id    uuid,
  p_session_id uuid DEFAULT NULL,
  p_brewery_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    -- ── Experience tier ────────────────────────────────────────────────────
    'experienceTier', (
      SELECT p.tier
      FROM public.profiles p
      WHERE p.id = p_user_id
      LIMIT 1
    ),

    -- ── Last 5 brews with recipe DNA + community reception ────────────────
    'recentBrews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          b.id,
          'name',        b.name,
          'style',       b.style,
          'brewType',    b.brew_type,
          'og',          (b.data ->> 'og'),
          'fg',          (b.data ->> 'fg'),
          'abv',         b.abv,
          'ibu',         b.ibu,
          'batchSizeL',  (b.data ->> 'batch_size_liters'),
          'createdAt',   b.created_at,
          -- Zutaten jetzt aus recipe_ingredients statt b.data->
          'malts',       (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name',   ri.raw_name,
              'amount', ri.amount,
              'unit',   ri.unit,
              'color',  ri.override_color_ebc
            ) ORDER BY ri.sort_order), '[]'::jsonb)
            FROM public.recipe_ingredients ri
            WHERE ri.recipe_id = b.id AND ri.type = 'malt'
          ),
          'hops',        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name',   ri.raw_name,
              'amount', ri.amount,
              'unit',   ri.unit,
              'time',   ri.time_minutes,
              'usage',  ri.usage,
              'alpha',  ri.override_alpha
            ) ORDER BY ri.sort_order), '[]'::jsonb)
            FROM public.recipe_ingredients ri
            WHERE ri.recipe_id = b.id AND ri.type = 'hop'
          ),
          'yeast',       (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'name',        ri.raw_name,
              'amount',      ri.amount,
              'unit',        ri.unit,
              'attenuation', ri.override_attenuation
            ) ORDER BY ri.sort_order), '[]'::jsonb)
            FROM public.recipe_ingredients ri
            WHERE ri.recipe_id = b.id AND ri.type = 'yeast'
          ),
          'avgRating',   (
            SELECT ROUND((SUM(r.rating * COALESCE(r.plausibility_score, 1.0)) / NULLIF(SUM(COALESCE(r.plausibility_score, 1.0)), 0))::numeric, 1)
            FROM public.ratings r
            WHERE r.brew_id = b.id
              AND r.moderation_status = 'auto_approved'
              AND r.is_shadowbanned = false
          ),
          'ratingCount', (
            SELECT COUNT(*)
            FROM public.ratings r
            WHERE r.brew_id = b.id
              AND r.moderation_status = 'auto_approved'
              AND r.is_shadowbanned = false
          )
        )
        ORDER BY b.created_at DESC
      )
      FROM (
        SELECT b2.*
        FROM public.brews b2
        WHERE b2.user_id = p_user_id
        ORDER BY b2.created_at DESC
        LIMIT 5
      ) b
    ),

    -- ── Best-rated brew ────────────────────────────────────────────────────
    'topRatedBrew', (
      SELECT jsonb_build_object(
        'name',        b.name,
        'style',       b.style,
        'og',          (b.data ->> 'og'),
        'ibu',         b.ibu,
        'avgRating',   ROUND((SUM(r.rating * COALESCE(r.plausibility_score, 1.0)) / NULLIF(SUM(COALESCE(r.plausibility_score, 1.0)), 0))::numeric, 1),
        'ratingCount', COUNT(r.id)
      )
      FROM public.brews b
      JOIN public.ratings r ON r.brew_id = b.id
      WHERE b.user_id = p_user_id
        AND r.moderation_status = 'auto_approved'
        AND r.is_shadowbanned = false
      GROUP BY b.id, b.name, b.style, b.data, b.ibu
      HAVING COUNT(r.id) >= 2
      ORDER BY (SUM(r.rating * COALESCE(r.plausibility_score, 1.0)) / NULLIF(SUM(COALESCE(r.plausibility_score, 1.0)), 0)) DESC, COUNT(r.id) DESC
      LIMIT 1
    ),

    -- ── Inspiration signal (hops jetzt aus recipe_ingredients) ─────────────
    'inspirationSignal', (
      WITH liked_foreign AS (
        SELECT b.id AS brew_id, b.style
        FROM public.likes l
        JOIN public.brews b ON b.id = l.brew_id
        WHERE l.user_id = p_user_id
          AND b.user_id != p_user_id
          AND b.is_public = true
      ),
      top_styles AS (
        SELECT style, COUNT(*) AS cnt
        FROM liked_foreign
        WHERE style IS NOT NULL AND style <> ''
        GROUP BY style
        ORDER BY cnt DESC
        LIMIT 3
      ),
      top_hops AS (
        SELECT ri.raw_name AS hop_name, COUNT(*) AS cnt
        FROM liked_foreign lf
        JOIN public.recipe_ingredients ri ON ri.recipe_id = lf.brew_id AND ri.type = 'hop'
        WHERE ri.raw_name IS NOT NULL AND ri.raw_name <> ''
        GROUP BY ri.raw_name
        ORDER BY cnt DESC
        LIMIT 3
      )
      SELECT CASE
        WHEN (SELECT COUNT(*) FROM liked_foreign) = 0 THEN NULL
        ELSE jsonb_build_object(
          'likedCount',  (SELECT COUNT(*) FROM liked_foreign),
          'topStyles',   (SELECT jsonb_agg(style ORDER BY cnt DESC) FROM top_styles),
          'topHops',     (SELECT jsonb_agg(hop_name ORDER BY cnt DESC) FROM top_hops)
        )
      END
    ),

    -- ── Active session: fermentation measurements ─────────────────────────
    'sessionMeasurements', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_agg(
          jsonb_build_object(
            'measuredAt',  m.measured_at,
            'gravity',     m.gravity,
            'temperature', m.temperature,
            'ph',          m.ph,
            'notes',       m.notes
          )
          ORDER BY m.measured_at ASC
        )
        FROM public.brew_measurements m
        WHERE m.session_id = p_session_id
      )
      ELSE NULL
    END,

    -- ── Active session: process context ───────────────────────────────────
    'sessionContext', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'phase',               bs.phase,
          'status',              bs.status,
          'notes',               bs.notes,
          'currentGravity',      bs.current_gravity,
          'apparentAttenuation', bs.apparent_attenuation,
          'processNotes', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'date',  n.evt_date,
                'title', n.evt_title,
                'note',  n.evt_note
              )
            )
            FROM (
              SELECT
                evt ->> 'date'  AS evt_date,
                evt ->> 'title' AS evt_title,
                evt ->> 'note'  AS evt_note
              FROM jsonb_array_elements(COALESCE(bs.timeline, '[]'::jsonb)) AS evt
              WHERE evt ->> 'type' = 'NOTE'
                AND (evt ->> 'title') IS NOT NULL
              ORDER BY (evt ->> 'date') DESC NULLS LAST
              LIMIT 10
            ) n
          )
        )
        FROM public.brewing_sessions bs
        WHERE bs.id = p_session_id
        LIMIT 1
      )
      ELSE NULL
    END,

    -- ── Equipment profile + brewery location + brand description ──────────
    'equipmentProfile', CASE
      WHEN p_brewery_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'name',            ep.name,
          'brewMethod',      ep.brew_method,
          'batchVolumeL',    ep.batch_volume_l,
          'boilOffRateL',    ep.boil_off_rate,
          'trubLossL',       ep.trub_loss,
          'grainAbsorption', ep.grain_absorption,
          'mashThickness',   ep.mash_thickness,
          'location',        br.location,
          'breweryName',     br.name,
          'description',     br.description
        )
        FROM public.breweries br
        LEFT JOIN public.equipment_profiles ep
               ON ep.brewery_id = br.id AND ep.is_default = true
        WHERE br.id = p_brewery_id
        LIMIT 1
      )
      ELSE NULL
    END,

    -- ── Community Flavor DNA ────────────────────────────────────────────────
    'flavorDna', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN jsonb_build_object(
          'count',      COUNT(*),
          'sweetness',  ROUND(AVG(fp.sweetness)::numeric, 3),
          'bitterness', ROUND(AVG(fp.bitterness)::numeric, 3),
          'body',       ROUND(AVG(fp.body)::numeric, 3),
          'roast',      ROUND(AVG(fp.roast)::numeric, 3),
          'fruitiness', ROUND(AVG(fp.fruitiness)::numeric, 3)
        )
        ELSE NULL
      END
      FROM public.flavor_profiles fp
      WHERE fp.brew_id IN (
        SELECT br2.id FROM public.brews br2 WHERE br2.user_id = p_user_id
      )
    ),

    -- ── Feedback profile ───────────────────────────────────────────────────
    'feedbackProfile', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE jsonb_object_agg(
          capability,
          jsonb_build_object(
            'up',    up_count,
            'down',  down_count,
            'total', up_count + down_count
          )
        )
      END
      FROM (
        SELECT
          capability,
          COUNT(*) FILTER (WHERE feedback = 'up')   AS up_count,
          COUNT(*) FILTER (WHERE feedback = 'down')  AS down_count
        FROM public.botlguide_feedback
        WHERE user_id = p_user_id
          AND capability IS NOT NULL
        GROUP BY capability
        HAVING COUNT(*) >= 1
      ) fb
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_brew_context TO authenticated, service_role;


-- ============================================================================
-- FIX C: ingredients_migrated Tracking-Column
-- ============================================================================

ALTER TABLE public.brews ADD COLUMN IF NOT EXISTS ingredients_migrated BOOLEAN DEFAULT false;

-- Alle Brews die bereits recipe_ingredients haben, als migriert markieren
UPDATE public.brews b
SET ingredients_migrated = true
WHERE EXISTS (
  SELECT 1 FROM public.recipe_ingredients ri WHERE ri.recipe_id = b.id
);

-- Brews ohne Zutaten-JSONB und ohne recipe_ingredients sind auch "migriert"
-- (sie hatten nie Zutaten)
UPDATE public.brews b
SET ingredients_migrated = true
WHERE ingredients_migrated = false
  AND NOT (b.data ? 'malts' OR b.data ? 'hops' OR b.data ? 'yeast')
  AND NOT EXISTS (SELECT 1 FROM public.recipe_ingredients ri WHERE ri.recipe_id = b.id);
