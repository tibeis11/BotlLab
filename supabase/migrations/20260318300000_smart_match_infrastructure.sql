-- Migration: Smart Match Infrastructure Requirements
-- This adds pg_trgm (if not exists) and logic for aliases fuzzy matching

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Phase 1 Additions: missing aliases flat and trigger for TSVECTOR / ILIKE queries

ALTER TABLE public.ingredient_master
ADD COLUMN IF NOT EXISTS aliases_flat text;

CREATE OR REPLACE FUNCTION update_aliases_flat()
RETURNS trigger AS $$
BEGIN
  -- array_to_string is strictly parsed as stable, not immutable. We must use a trigger to store it cleanly.
  NEW.aliases_flat := array_to_string(NEW.aliases, ' ', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_aliases_flat ON public.ingredient_master;
CREATE TRIGGER trg_update_aliases_flat
BEFORE INSERT OR UPDATE OF aliases ON public.ingredient_master
FOR EACH ROW EXECUTE FUNCTION update_aliases_flat();

-- Backfill existing rows (from our seed)
UPDATE public.ingredient_master set aliases_flat = array_to_string(aliases, ' ', '');

CREATE INDEX IF NOT EXISTS idx_ingredient_master_aliases_trgm 
ON public.ingredient_master USING gin (aliases_flat gin_trgm_ops);

-- Missing Admin Write Policy for Ingredient Master (To allow merges / inserts via UI)
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'ingredient_master' 
      AND policyname = 'admins can write ingredient_master'
  ) THEN
      CREATE POLICY "admins can write ingredient_master"
      ON public.ingredient_master
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM admin_users WHERE profile_id = auth.uid() AND is_active = true));
  END IF;
END $$;

-- Missing Admin Write Policy for Ingredient Products
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'ingredient_products' 
      AND policyname = 'admins can write ingredient_products'
  ) THEN
      CREATE POLICY "admins can write ingredient_products"
      ON public.ingredient_products
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM admin_users WHERE profile_id = auth.uid() AND is_active = true));
  END IF;
END $$;

-- Search RPC Function to abstract the 3-step logic to the DB for performance
CREATE OR REPLACE FUNCTION match_ingredient(
    search_term text,
    search_type text
)
RETURNS TABLE (
    master_id uuid,
    name text,
    type text,
    match_score real,
    match_level int -- 1=Exact, 2=Alias-Substring, 3=Fuzzy
) AS $$
BEGIN
    -- Level 1: Exact match (name or alias matches search term exactly, case-insensitive)
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        1.0::real as match_score,
        1 as match_level
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND (
        im.name ILIKE search_term 
        OR search_term ILIKE ANY(im.aliases)
    );

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 2: Alias is contained in search term or vice versa (e.g. "Cascade Hops" contains alias "Cascade")
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        0.8::real as match_score,
        2 as match_level
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND EXISTS (
        SELECT 1 FROM unnest(im.aliases) alias 
        WHERE length(alias) >= 3  -- Prevent tiny alias matches
        AND (search_term ILIKE '%' || alias || '%' OR alias ILIKE '%' || search_term || '%')
    );

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 3: Fuzzy Match (pg_trgm)
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        similarity(im.aliases_flat, search_term) as match_score,
        3 as match_level
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND similarity(im.aliases_flat, search_term) > 0.25
    ORDER BY match_score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
