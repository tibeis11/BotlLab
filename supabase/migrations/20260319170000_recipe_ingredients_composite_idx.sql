-- Composite index on (recipe_id, type) for recipe_ingredients.
-- Adapter queries frequently filter both columns together when building
-- the malt/hop/yeast arrays for a brew. Without this, Postgres uses the
-- single-column recipe_id index and then post-filters on type in memory.

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_type
  ON public.recipe_ingredients (recipe_id, type);
