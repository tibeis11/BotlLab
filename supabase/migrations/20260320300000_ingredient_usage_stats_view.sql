-- View: ingredient_usage_stats
-- Shows how often each ingredient is used across all recipes.
-- Used in the Admin panel "Beliebteste Zutaten" analytics tab.

CREATE OR REPLACE VIEW ingredient_usage_stats AS
SELECT
  im.id,
  im.name,
  im.type,
  COUNT(ri.id)              AS usage_count,
  COUNT(DISTINCT ri.recipe_id) AS recipe_count
FROM ingredient_master im
LEFT JOIN recipe_ingredients ri ON ri.master_id = im.id
GROUP BY im.id, im.name, im.type
ORDER BY usage_count DESC;
