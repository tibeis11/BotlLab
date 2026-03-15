-- Migration: Add UNIQUE constraints to ingredient tables
-- Required for ON CONFLICT (name) in expansion migrations.
-- Safely deduplicates before adding constraints.

DO $$
DECLARE
  r RECORD;
  keeper_id UUID;
BEGIN
  -- Deduplicate ingredient_master by name (keep lowest UUID = first inserted)
  FOR r IN
    SELECT name FROM ingredient_master GROUP BY name HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id FROM ingredient_master WHERE name = r.name ORDER BY id LIMIT 1;
    UPDATE recipe_ingredients
      SET master_id = keeper_id
      WHERE master_id IN (SELECT id FROM ingredient_master WHERE name = r.name AND id != keeper_id);
    UPDATE ingredient_products
      SET master_id = keeper_id
      WHERE master_id IN (SELECT id FROM ingredient_master WHERE name = r.name AND id != keeper_id);
    DELETE FROM ingredient_master WHERE name = r.name AND id != keeper_id;
  END LOOP;

  -- Deduplicate ingredient_products by (master_id, name)
  DELETE FROM ingredient_products
  WHERE id NOT IN (
    SELECT MIN(id::text)::uuid FROM ingredient_products GROUP BY master_id, name
  );
END $$;

ALTER TABLE ingredient_master ADD CONSTRAINT ingredient_master_name_unique UNIQUE (name);
ALTER TABLE ingredient_products ADD CONSTRAINT ingredient_products_master_name_unique UNIQUE (master_id, name);
