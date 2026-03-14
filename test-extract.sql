DO $$ 
DECLARE
  brew_row RECORD;
  malt_item JSONB;
  hop_item JSONB;
  yeast_item JSONB;
BEGIN
  FOR brew_row IN SELECT id, data FROM brews WHERE data IS NOT NULL LOOP
    
    -- Extract Malts
    IF jsonb_typeof(brew_row.data->'malts') = 'array' THEN
      FOR malt_item IN SELECT * FROM jsonb_array_elements(brew_row.data->'malts') LOOP
        INSERT INTO recipe_ingredients (recipe_id, master_id, raw_name, type, amount, unit, override_color_ebc)
        VALUES (
          brew_row.id,
          '00000000-0000-4000-a000-000000000001',
          malt_item->>'name',
          'malt',
          (NULLIF(malt_item->>'amount', ''))::NUMERIC,
          COALESCE(malt_item->>'unit', 'kg'),
          (NULLIF(malt_item->>'color', ''))::NUMERIC
        );
      END LOOP;
    END IF;

    -- Extract Hops
    IF jsonb_typeof(brew_row.data->'hops') = 'array' THEN
      FOR hop_item IN SELECT * FROM jsonb_array_elements(brew_row.data->'hops') LOOP
        INSERT INTO recipe_ingredients (recipe_id, master_id, raw_name, type, amount, unit, time_minutes, usage, override_alpha)
        VALUES (
          brew_row.id,
          '00000000-0000-4000-a000-000000000002',
          hop_item->>'name',
          'hop',
          (NULLIF(hop_item->>'amount', ''))::NUMERIC,
          COALESCE(hop_item->>'unit', 'g'),
          (NULLIF(hop_item->>'time', ''))::INTEGER,
          hop_item->>'usage',
          (NULLIF(hop_item->>'alpha', ''))::NUMERIC
        );
      END LOOP;
    END IF;

    -- Extract Yeast
    IF jsonb_typeof(brew_row.data->'yeast') = 'array' THEN
      FOR yeast_item IN SELECT * FROM jsonb_array_elements(brew_row.data->'yeast') LOOP
        INSERT INTO recipe_ingredients (recipe_id, master_id, raw_name, type, amount, unit, override_attenuation)
        VALUES (
          brew_row.id,
          '00000000-0000-4000-a000-000000000003',
          yeast_item->>'name',
          'yeast',
          (NULLIF(yeast_item->>'amount', ''))::NUMERIC,
          COALESCE(yeast_item->>'unit', 'pkg'),
          (NULLIF(yeast_item->>'attenuation', ''))::NUMERIC
        );
      END LOOP;
    END IF;

  END LOOP;
END 
$$;

UPDATE brews
SET data = data - 'malts' - 'hops' - 'yeast'
WHERE data ? 'malts' OR data ? 'hops' OR data ? 'yeast';
