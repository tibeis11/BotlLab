-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Erweiterter fermentation_type Backfill
-- Stufe 1: Hefe-JSONB (zuverlässiger)
-- Stufe 2: Style-Feld (Fallback, deutlich mehr Stile als ursprünglicher Backfill)
-- ─────────────────────────────────────────────────────────────────────────────

-- Stufe 1: Aus Hefenamen (data->'yeast') ableiten
-- Unterstützt Arrays [{name: '...'}, ...] und einfachen String
UPDATE brews
SET fermentation_type = CASE
    -- Untergärig: bekannte Lager-Hefen
    WHEN (
        data->>'yeast' ILIKE '%w-34%' OR data->>'yeast' ILIKE '%w34%' OR
        data->>'yeast' ILIKE '%34/70%' OR data->>'yeast' ILIKE '%saflager%' OR
        data->>'yeast' ILIKE '%s-23%' OR data->>'yeast' ILIKE '%wlp800%' OR
        data->>'yeast' ILIKE '%wlp830%' OR data->>'yeast' ILIKE '%wlp838%' OR
        data->>'yeast' ILIKE '%wlp840%' OR data->>'yeast' ILIKE '%wy2124%' OR
        data->>'yeast' ILIKE '%wy2206%' OR data->>'yeast' ILIKE '%wy2308%' OR
        data->>'yeast' ILIKE '%wy2278%' OR data->>'yeast' ILIKE '%diamond%' OR
        data->>'yeast' ILIKE '%krispy%' OR data->>'yeast' ILIKE '%lutra%' OR
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(data->'yeast') = 'array' THEN data->'yeast' ELSE '[]'::jsonb END
            ) y
            WHERE y->>'name' ILIKE '%w-34%' OR y->>'name' ILIKE '%34/70%'
               OR y->>'name' ILIKE '%saflager%' OR y->>'name' ILIKE '%s-23%'
               OR y->>'name' ILIKE '%lager%' OR y->>'name' ILIKE '%diamond%'
               OR y->>'name' ILIKE '%lutra%' OR y->>'name' ILIKE '%krispy%'
               OR y->>'name' ILIKE '%wlp8%' OR y->>'name' ILIKE '%wy212%'
               OR y->>'name' ILIKE '%wy220%' OR y->>'name' ILIKE '%wy230%'
               OR y->>'name' ILIKE '%wy227%' OR y->>'name' ILIKE '%wy224%'
        )
    ) THEN 'bottom'
    -- Obergärig: bekannte Ale-Hefen
    WHEN (
        data->>'yeast' ILIKE '%us-05%' OR data->>'yeast' ILIKE '%s-04%' OR
        data->>'yeast' ILIKE '%nottingham%' OR data->>'yeast' ILIKE '%windsor%' OR
        data->>'yeast' ILIKE '%wb-06%' OR data->>'yeast' ILIKE '%be-134%' OR
        data->>'yeast' ILIKE '%be-256%' OR data->>'yeast' ILIKE '%safale%' OR
        data->>'yeast' ILIKE '%wlp001%' OR data->>'yeast' ILIKE '%wlp002%' OR
        data->>'yeast' ILIKE '%wlp300%' OR data->>'yeast' ILIKE '%wlp500%' OR
        data->>'yeast' ILIKE '%wlp565%' OR data->>'yeast' ILIKE '%wy1056%' OR
        data->>'yeast' ILIKE '%wy3068%' OR data->>'yeast' ILIKE '%wy3724%' OR
        data->>'yeast' ILIKE '%kveik%' OR data->>'yeast' ILIKE '%voss%' OR
        data->>'yeast' ILIKE '%farmhouse%' OR data->>'yeast' ILIKE '%verdant%' OR
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(data->'yeast') = 'array' THEN data->'yeast' ELSE '[]'::jsonb END
            ) y
            WHERE y->>'name' ILIKE '%us-05%' OR y->>'name' ILIKE '%s-04%'
               OR y->>'name' ILIKE '%nottingham%' OR y->>'name' ILIKE '%windsor%'
               OR y->>'name' ILIKE '%wb-06%' OR y->>'name' ILIKE '%safale%'
               OR y->>'name' ILIKE '%be-134%' OR y->>'name' ILIKE '%be-256%'
               OR y->>'name' ILIKE '%wlp001%' OR y->>'name' ILIKE '%wlp002%'
               OR y->>'name' ILIKE '%wlp300%' OR y->>'name' ILIKE '%wlp500%'
               OR y->>'name' ILIKE '%wy1056%' OR y->>'name' ILIKE '%wy3068%'
               OR y->>'name' ILIKE '%kveik%' OR y->>'name' ILIKE '%voss%'
               OR y->>'name' ILIKE '%farmhouse%' OR y->>'name' ILIKE '%verdant%'
        )
    ) THEN 'top'
    -- Spontangärung
    WHEN (
        data->>'yeast' ILIKE '%brett%' OR data->>'yeast' ILIKE '%lambic%' OR
        data->>'yeast' ILIKE '%roeselare%' OR data->>'yeast' ILIKE '%wlp655%' OR
        data->>'yeast' ILIKE '%wy3278%' OR
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(data->'yeast') = 'array' THEN data->'yeast' ELSE '[]'::jsonb END
            ) y
            WHERE y->>'name' ILIKE '%brett%' OR y->>'name' ILIKE '%lambic%'
               OR y->>'name' ILIKE '%roeselare%'
        )
    ) THEN 'spontaneous'
    ELSE fermentation_type -- unveränderter Wert (inkl. NULL)
END
WHERE fermentation_type IS NULL
  AND brew_type = 'beer';

-- Stufe 2: Style-Feld (erweiterter Backfill für noch verbleibende NULLs)
UPDATE brews
SET fermentation_type = CASE
    -- Untergärig
    WHEN style ILIKE '%lager%' OR style ILIKE '%märzen%' OR style ILIKE '%maerzen%'
      OR style ILIKE '%pils%' OR style ILIKE '%bock%' OR style ILIKE '%helles%'
      OR style ILIKE '%dunkel%' OR style ILIKE '%schwarz%' OR style ILIKE '%rauchbier%'
      OR style ILIKE '%zwickel%' OR style ILIKE '%kellerbier%'
      OR style ILIKE '%steam beer%' OR style ILIKE '%california common%'
        THEN 'bottom'
    -- Obergärig
    WHEN style ILIKE '%ipa%' OR style ILIKE '%ale%' OR style ILIKE '%stout%'
      OR style ILIKE '%porter%' OR style ILIKE '%weizen%' OR style ILIKE '%weisse%'
      OR style ILIKE '%wit%' OR style ILIKE '%saison%' OR style ILIKE '%farmhouse%'
      OR style ILIKE '%kölsch%' OR style ILIKE '%kolsch%' OR style ILIKE '%koelsch%'
      OR style ILIKE '%dubbel%' OR style ILIKE '%tripel%' OR style ILIKE '%quad%'
      OR style ILIKE '%bitter%' OR style ILIKE '%barleywine%' OR style ILIKE '%old ale%'
      OR style ILIKE '%scotch%' OR style ILIKE '%cream ale%' OR style ILIKE '%brown ale%'
      OR style ILIKE '%amber%' OR style ILIKE '%red ale%' OR style ILIKE '%rye%'
      OR style ILIKE '%pale ale%' OR style ILIKE '%hefeweizen%'
      OR style ILIKE '%dunkelweizen%' OR style ILIKE '%berliner%' OR style ILIKE '%gose%'
      OR style ILIKE '%sour%' OR style ILIKE '%neipa%' OR style ILIKE '%dipa%'
        THEN 'top'
    -- Spontangärung
    WHEN style ILIKE '%lambic%' OR style ILIKE '%gueuze%' OR style ILIKE '%geuze%'
      OR style ILIKE '%kriek%' OR style ILIKE '%faro%' OR style ILIKE '%flanders%'
      OR style ILIKE '%spontan%' OR style ILIKE '%wild ale%'
        THEN 'spontaneous'
    ELSE NULL
END
WHERE fermentation_type IS NULL
  AND brew_type = 'beer';
