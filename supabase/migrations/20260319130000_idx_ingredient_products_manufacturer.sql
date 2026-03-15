-- Performance-Index auf ingredient_products.manufacturer
-- Beschleunigt Suchen/Filter nach Hersteller (z.B. im Admin Merge-Modal)

CREATE INDEX IF NOT EXISTS idx_ingredient_products_manufacturer
  ON public.ingredient_products (LOWER(manufacturer))
  WHERE manufacturer IS NOT NULL;
