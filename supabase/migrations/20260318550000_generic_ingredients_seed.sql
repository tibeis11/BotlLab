-- Migration: Seed properly structure Masters vs Products for all ingredients.
-- Created dynamically from 20260318200000_ingredient_seed.sql

-- First, ensure generic columns exist for aggregates
ALTER TABLE public.ingredient_master
ADD COLUMN IF NOT EXISTS color_ebc NUMERIC(7,2),
ADD COLUMN IF NOT EXISTS potential_pts NUMERIC(6,3),
ADD COLUMN IF NOT EXISTS alpha_pct NUMERIC(5,2);

-- Fallback-IDs (00000000-...) bleiben erhalten — sie werden von recipe_ingredients referenziert
DELETE FROM public.ingredient_products
  WHERE master_id NOT IN ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000004');
DELETE FROM public.ingredient_master
  WHERE id NOT IN ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000004');

DO $$ 
DECLARE
  master_id uuid;
BEGIN

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Pilsner Malt', 'malt', ARRAY['Pilsner Malt'], 'Standard Pilsner Malt', 3.50, 1.037, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Pilsner Malt', 'Weyermann', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Pilsner Malt', 'BestMalz', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Pilsner Malt', 'Briess', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Pilsner Malt', 'Simpsons', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Pilsner Malt', 'Crisp', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Pilsner Malt', 'Dingemans', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Pilsner Malt', 'Castle Malting', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Pilsner Malt', 'Bairds', 3.5, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Pilsner Malt', 'Viking Malt', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt'], 'Standard Pale Ale Malt', 6.00, 1.038, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Pale Ale Malt', 'Weyermann', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Pale Ale Malt', 'BestMalz', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Pale Ale Malt', 'Briess', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Pale Ale Malt', 'Simpsons', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Pale Ale Malt', 'Crisp', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Pale Ale Malt', 'Dingemans', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Pale Ale Malt', 'Castle Malting', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Pale Ale Malt', 'Bairds', 6, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Pale Ale Malt', 'Viking Malt', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Munich Malt', 'malt', ARRAY['Munich Malt','Munich Malt I','Munich Malt II','Caramunich I','Caramunich II','Caramunich III'], 'Standard Munich Malt', 80.00, 1.035, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Munich Malt I', 'Weyermann', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Munich Malt I', 'BestMalz', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Munich Malt I', 'Briess', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Munich Malt I', 'Simpsons', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Munich Malt I', 'Crisp', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Munich Malt I', 'Dingemans', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Munich Malt I', 'Castle Malting', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Munich Malt I', 'Bairds', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Munich Malt I', 'Viking Malt', 15, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Munich Malt II', 'Weyermann', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Munich Malt II', 'BestMalz', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Munich Malt II', 'Briess', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Munich Malt II', 'Simpsons', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Munich Malt II', 'Crisp', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Munich Malt II', 'Dingemans', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Munich Malt II', 'Castle Malting', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Munich Malt II', 'Bairds', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Munich Malt II', 'Viking Malt', 25, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caramunich I', 'Weyermann', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caramunich I', 'BestMalz', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caramunich I', 'Briess', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caramunich I', 'Simpsons', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caramunich I', 'Crisp', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caramunich I', 'Dingemans', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caramunich I', 'Castle Malting', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caramunich I', 'Bairds', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caramunich I', 'Viking Malt', 90, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caramunich II', 'Weyermann', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caramunich II', 'BestMalz', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caramunich II', 'Briess', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caramunich II', 'Simpsons', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caramunich II', 'Crisp', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caramunich II', 'Dingemans', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caramunich II', 'Castle Malting', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caramunich II', 'Bairds', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caramunich II', 'Viking Malt', 120, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caramunich III', 'Weyermann', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caramunich III', 'BestMalz', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caramunich III', 'Briess', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caramunich III', 'Simpsons', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caramunich III', 'Crisp', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caramunich III', 'Dingemans', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caramunich III', 'Castle Malting', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caramunich III', 'Bairds', 150, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caramunich III', 'Viking Malt', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Vienna Malt', 'malt', ARRAY['Vienna Malt'], 'Standard Vienna Malt', 8.00, 1.037, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Vienna Malt', 'Weyermann', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Vienna Malt', 'BestMalz', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Vienna Malt', 'Briess', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Vienna Malt', 'Simpsons', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Vienna Malt', 'Crisp', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Vienna Malt', 'Dingemans', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Vienna Malt', 'Castle Malting', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Vienna Malt', 'Bairds', 8, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Vienna Malt', 'Viking Malt', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Wheat Malt', 'malt', ARRAY['Wheat Malt','Flaked Wheat','Torrefied Wheat'], 'Standard Wheat Malt', 3.83, 1.036, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Wheat Malt', 'Weyermann', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Wheat Malt', 'BestMalz', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Wheat Malt', 'Briess', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Wheat Malt', 'Simpsons', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Wheat Malt', 'Crisp', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Wheat Malt', 'Dingemans', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Wheat Malt', 'Castle Malting', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Wheat Malt', 'Bairds', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Wheat Malt', 'Viking Malt', 4.5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Flaked Wheat', 'Weyermann', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Flaked Wheat', 'BestMalz', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Flaked Wheat', 'Briess', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Flaked Wheat', 'Simpsons', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Flaked Wheat', 'Crisp', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Flaked Wheat', 'Dingemans', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Flaked Wheat', 'Castle Malting', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Flaked Wheat', 'Bairds', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Flaked Wheat', 'Viking Malt', 3, 1.035, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Torrefied Wheat', 'Weyermann', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Torrefied Wheat', 'BestMalz', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Torrefied Wheat', 'Briess', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Torrefied Wheat', 'Simpsons', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Torrefied Wheat', 'Crisp', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Torrefied Wheat', 'Dingemans', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Torrefied Wheat', 'Castle Malting', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Torrefied Wheat', 'Bairds', 4, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Torrefied Wheat', 'Viking Malt', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Carahell', 'malt', ARRAY['Carahell'], 'Standard Carahell', 25.00, 1.034, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carahell', 'Weyermann', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carahell', 'BestMalz', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carahell', 'Briess', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carahell', 'Simpsons', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carahell', 'Crisp', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carahell', 'Dingemans', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carahell', 'Castle Malting', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carahell', 'Bairds', 25, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carahell', 'Viking Malt', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Caraaroma', 'malt', ARRAY['Caraaroma'], 'Standard Caraaroma', 400.00, 1.033, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caraaroma', 'Weyermann', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caraaroma', 'BestMalz', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caraaroma', 'Briess', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caraaroma', 'Simpsons', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caraaroma', 'Crisp', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caraaroma', 'Dingemans', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caraaroma', 'Castle Malting', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caraaroma', 'Bairds', 400, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caraaroma', 'Viking Malt', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Carafa Special I', 'malt', ARRAY['Carafa Special I'], 'Standard Carafa Special I', 900.00, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carafa Special I', 'Weyermann', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carafa Special I', 'BestMalz', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carafa Special I', 'Briess', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carafa Special I', 'Simpsons', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carafa Special I', 'Crisp', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carafa Special I', 'Dingemans', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carafa Special I', 'Castle Malting', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carafa Special I', 'Bairds', 900, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carafa Special I', 'Viking Malt', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Carafa Special II', 'malt', ARRAY['Carafa Special II'], 'Standard Carafa Special II', 1150.00, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carafa Special II', 'Weyermann', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carafa Special II', 'BestMalz', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carafa Special II', 'Briess', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carafa Special II', 'Simpsons', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carafa Special II', 'Crisp', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carafa Special II', 'Dingemans', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carafa Special II', 'Castle Malting', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carafa Special II', 'Bairds', 1150, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carafa Special II', 'Viking Malt', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Carafa Special III', 'malt', ARRAY['Carafa Special III'], 'Standard Carafa Special III', 1400.00, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carafa Special III', 'Weyermann', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carafa Special III', 'BestMalz', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carafa Special III', 'Briess', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carafa Special III', 'Simpsons', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carafa Special III', 'Crisp', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carafa Special III', 'Dingemans', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carafa Special III', 'Castle Malting', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carafa Special III', 'Bairds', 1400, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carafa Special III', 'Viking Malt', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Chocolate Malt', 'malt', ARRAY['Chocolate Malt'], 'Standard Chocolate Malt', 800.00, 1.034, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Chocolate Malt', 'Weyermann', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Chocolate Malt', 'BestMalz', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Chocolate Malt', 'Briess', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Chocolate Malt', 'Simpsons', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Chocolate Malt', 'Crisp', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Chocolate Malt', 'Dingemans', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Chocolate Malt', 'Castle Malting', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Chocolate Malt', 'Bairds', 800, 1.034, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Chocolate Malt', 'Viking Malt', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Black Malt', 'malt', ARRAY['Black Malt'], 'Standard Black Malt', 1300.00, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Black Malt', 'Weyermann', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Black Malt', 'BestMalz', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Black Malt', 'Briess', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Black Malt', 'Simpsons', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Black Malt', 'Crisp', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Black Malt', 'Dingemans', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Black Malt', 'Castle Malting', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Black Malt', 'Bairds', 1300, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Black Malt', 'Viking Malt', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Roasted Barley', 'malt', ARRAY['Roasted Barley'], 'Standard Roasted Barley', 1000.00, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Roasted Barley', 'Weyermann', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Roasted Barley', 'BestMalz', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Roasted Barley', 'Briess', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Roasted Barley', 'Simpsons', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Roasted Barley', 'Crisp', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Roasted Barley', 'Dingemans', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Roasted Barley', 'Castle Malting', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Roasted Barley', 'Bairds', 1000, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Roasted Barley', 'Viking Malt', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt'], 'Standard Melanoidin Malt', 70.00, 1.037, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Melanoidin Malt', 'Weyermann', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Melanoidin Malt', 'BestMalz', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Melanoidin Malt', 'Briess', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Melanoidin Malt', 'Simpsons', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Melanoidin Malt', 'Crisp', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Melanoidin Malt', 'Dingemans', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Melanoidin Malt', 'Castle Malting', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Melanoidin Malt', 'Bairds', 70, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Melanoidin Malt', 'Viking Malt', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Acidulated Malt', 'malt', ARRAY['Acidulated Malt'], 'Standard Acidulated Malt', 4.00, 1.030, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Acidulated Malt', 'Weyermann', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Acidulated Malt', 'BestMalz', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Acidulated Malt', 'Briess', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Acidulated Malt', 'Simpsons', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Acidulated Malt', 'Crisp', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Acidulated Malt', 'Dingemans', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Acidulated Malt', 'Castle Malting', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Acidulated Malt', 'Bairds', 4, 1.03, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Acidulated Malt', 'Viking Malt', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Rye Malt', 'malt', ARRAY['Rye Malt'], 'Standard Rye Malt', 5.00, 1.036, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Rye Malt', 'Weyermann', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Rye Malt', 'BestMalz', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Rye Malt', 'Briess', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Rye Malt', 'Simpsons', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Rye Malt', 'Crisp', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Rye Malt', 'Dingemans', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Rye Malt', 'Castle Malting', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Rye Malt', 'Bairds', 5, 1.036, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Rye Malt', 'Viking Malt', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Flaked Oats', 'malt', ARRAY['Flaked Oats'], 'Standard Flaked Oats', 2.50, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Flaked Oats', 'Weyermann', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Flaked Oats', 'BestMalz', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Flaked Oats', 'Briess', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Flaked Oats', 'Simpsons', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Flaked Oats', 'Crisp', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Flaked Oats', 'Dingemans', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Flaked Oats', 'Castle Malting', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Flaked Oats', 'Bairds', 2.5, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Flaked Oats', 'Viking Malt', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Flaked Barley', 'malt', ARRAY['Flaked Barley'], 'Standard Flaked Barley', 3.00, 1.032, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Flaked Barley', 'Weyermann', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Flaked Barley', 'BestMalz', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Flaked Barley', 'Briess', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Flaked Barley', 'Simpsons', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Flaked Barley', 'Crisp', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Flaked Barley', 'Dingemans', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Flaked Barley', 'Castle Malting', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Flaked Barley', 'Bairds', 3, 1.032, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Flaked Barley', 'Viking Malt', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'CaraRed', 'malt', ARRAY['CaraRed'], 'Standard CaraRed', 50.00, 1.033, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann CaraRed', 'Weyermann', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz CaraRed', 'BestMalz', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess CaraRed', 'Briess', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons CaraRed', 'Simpsons', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp CaraRed', 'Crisp', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans CaraRed', 'Dingemans', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting CaraRed', 'Castle Malting', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds CaraRed', 'Bairds', 50, 1.033, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt CaraRed', 'Viking Malt', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Spelt Malt', 'malt', ARRAY['Spelt Malt'], 'Standard Spelt Malt', 5.00, 1.038, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Spelt Malt', 'Weyermann', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Spelt Malt', 'BestMalz', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Spelt Malt', 'Briess', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Spelt Malt', 'Simpsons', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Spelt Malt', 'Crisp', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Spelt Malt', 'Dingemans', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Spelt Malt', 'Castle Malting', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Spelt Malt', 'Bairds', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Spelt Malt', 'Viking Malt', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Smoked Malt', 'malt', ARRAY['Smoked Malt'], 'Standard Smoked Malt', 6.00, 1.037, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Smoked Malt', 'Weyermann', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Smoked Malt', 'BestMalz', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Smoked Malt', 'Briess', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Smoked Malt', 'Simpsons', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Smoked Malt', 'Crisp', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Smoked Malt', 'Dingemans', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Smoked Malt', 'Castle Malting', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Smoked Malt', 'Bairds', 6, 1.037, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Smoked Malt', 'Viking Malt', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Peated Malt', 'malt', ARRAY['Peated Malt'], 'Standard Peated Malt', 5.00, 1.038, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Peated Malt', 'Weyermann', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Peated Malt', 'BestMalz', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Peated Malt', 'Briess', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Peated Malt', 'Simpsons', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Peated Malt', 'Crisp', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Peated Malt', 'Dingemans', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Peated Malt', 'Castle Malting', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Peated Malt', 'Bairds', 5, 1.038, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Peated Malt', 'Viking Malt', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Citra', 'hop', ARRAY['Citra','Citra Pellets'], 'Standard Citra', NULL, NULL, 12.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Citra', 'Yakima Chief', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Citra', 'BarthHaas', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Citra', 'Hopsteiner', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Citra', 'Charles Faram', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Citra', 'Crosby Hops', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Mosaic', 'hop', ARRAY['Mosaic','Mosaic Pellets'], 'Standard Mosaic', NULL, NULL, 11.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Mosaic', 'Yakima Chief', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Mosaic', 'BarthHaas', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Mosaic', 'Hopsteiner', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Mosaic', 'Charles Faram', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Mosaic', 'Crosby Hops', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Simcoe', 'hop', ARRAY['Simcoe','Simcoe Pellets'], 'Standard Simcoe', NULL, NULL, 13.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Simcoe', 'Yakima Chief', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Simcoe', 'BarthHaas', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Simcoe', 'Hopsteiner', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Simcoe', 'Charles Faram', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Simcoe', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Amarillo', 'hop', ARRAY['Amarillo','Amarillo Pellets'], 'Standard Amarillo', NULL, NULL, 9.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Amarillo', 'Yakima Chief', 9, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Amarillo', 'BarthHaas', 9, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Amarillo', 'Hopsteiner', 9, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Amarillo', 'Charles Faram', 9, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Amarillo', 'Crosby Hops', 9, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Cascade', 'hop', ARRAY['Cascade','Cascade Pellets'], 'Standard Cascade', NULL, NULL, 5.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Cascade', 'Yakima Chief', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Cascade', 'BarthHaas', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Cascade', 'Hopsteiner', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Cascade', 'Charles Faram', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Cascade', 'Crosby Hops', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Centennial', 'hop', ARRAY['Centennial','Centennial Pellets'], 'Standard Centennial', NULL, NULL, 10.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Centennial', 'Yakima Chief', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Centennial', 'BarthHaas', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Centennial', 'Hopsteiner', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Centennial', 'Charles Faram', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Centennial', 'Crosby Hops', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Columbus', 'hop', ARRAY['Columbus','Columbus Pellets'], 'Standard Columbus', NULL, NULL, 15.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Columbus', 'Yakima Chief', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Columbus', 'BarthHaas', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Columbus', 'Hopsteiner', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Columbus', 'Charles Faram', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Columbus', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Chinook', 'hop', ARRAY['Chinook','Chinook Pellets'], 'Standard Chinook', NULL, NULL, 13.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Chinook', 'Yakima Chief', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Chinook', 'BarthHaas', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Chinook', 'Hopsteiner', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Chinook', 'Charles Faram', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Chinook', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Magnum', 'hop', ARRAY['Magnum','Magnum Pellets'], 'Standard Magnum', NULL, NULL, 14.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Magnum', 'Yakima Chief', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Magnum', 'BarthHaas', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Magnum', 'Hopsteiner', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Magnum', 'Charles Faram', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Magnum', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Perle', 'hop', ARRAY['Perle','Perle Pellets'], 'Standard Perle', NULL, NULL, 7.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Perle', 'Yakima Chief', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Perle', 'BarthHaas', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Perle', 'Hopsteiner', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Perle', 'Charles Faram', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Perle', 'Crosby Hops', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Tradition', 'hop', ARRAY['Tradition','Tradition Pellets'], 'Standard Tradition', NULL, NULL, 6.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Tradition', 'Yakima Chief', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Tradition', 'BarthHaas', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Tradition', 'Hopsteiner', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Tradition', 'Charles Faram', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Tradition', 'Crosby Hops', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Saaz', 'hop', ARRAY['Saaz','Saaz Pellets'], 'Standard Saaz', NULL, NULL, 3.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Saaz', 'Yakima Chief', 3.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Saaz', 'BarthHaas', 3.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Saaz', 'Hopsteiner', 3.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Saaz', 'Charles Faram', 3.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Saaz', 'Crosby Hops', 3.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Hallertauer Mittelfrüh', 'hop', ARRAY['Hallertauer Mittelfrüh','Hallertauer Mittelfrüh Pellets'], 'Standard Hallertauer Mittelfrüh', NULL, NULL, 4.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Hallertauer Mittelfrüh', 'Yakima Chief', 4, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Hallertauer Mittelfrüh', 'BarthHaas', 4, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Hallertauer Mittelfrüh', 'Hopsteiner', 4, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Hallertauer Mittelfrüh', 'Charles Faram', 4, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Hallertauer Mittelfrüh', 'Crosby Hops', 4, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Tettnanger', 'hop', ARRAY['Tettnanger','Tettnanger Pellets'], 'Standard Tettnanger', NULL, NULL, 4.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Tettnanger', 'Yakima Chief', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Tettnanger', 'BarthHaas', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Tettnanger', 'Hopsteiner', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Tettnanger', 'Charles Faram', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Tettnanger', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Spalter Select', 'hop', ARRAY['Spalter Select','Spalter Select Pellets'], 'Standard Spalter Select', NULL, NULL, 5.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Spalter Select', 'Yakima Chief', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Spalter Select', 'BarthHaas', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Spalter Select', 'Hopsteiner', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Spalter Select', 'Charles Faram', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Spalter Select', 'Crosby Hops', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Hersbrucker', 'hop', ARRAY['Hersbrucker','Hersbrucker Pellets'], 'Standard Hersbrucker', NULL, NULL, 3.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Hersbrucker', 'Yakima Chief', 3, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Hersbrucker', 'BarthHaas', 3, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Hersbrucker', 'Hopsteiner', 3, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Hersbrucker', 'Charles Faram', 3, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Hersbrucker', 'Crosby Hops', 3, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Northern Brewer', 'hop', ARRAY['Northern Brewer','Northern Brewer Pellets'], 'Standard Northern Brewer', NULL, NULL, 8.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Northern Brewer', 'Yakima Chief', 8.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Northern Brewer', 'BarthHaas', 8.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Northern Brewer', 'Hopsteiner', 8.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Northern Brewer', 'Charles Faram', 8.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Northern Brewer', 'Crosby Hops', 8.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Fuggles', 'hop', ARRAY['Fuggles','Fuggles Pellets'], 'Standard Fuggles', NULL, NULL, 4.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Fuggles', 'Yakima Chief', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Fuggles', 'BarthHaas', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Fuggles', 'Hopsteiner', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Fuggles', 'Charles Faram', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Fuggles', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'East Kent Goldings', 'hop', ARRAY['East Kent Goldings','East Kent Goldings Pellets'], 'Standard East Kent Goldings', NULL, NULL, 5.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief East Kent Goldings', 'Yakima Chief', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas East Kent Goldings', 'BarthHaas', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner East Kent Goldings', 'Hopsteiner', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram East Kent Goldings', 'Charles Faram', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops East Kent Goldings', 'Crosby Hops', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Galaxy', 'hop', ARRAY['Galaxy','Galaxy Pellets'], 'Standard Galaxy', NULL, NULL, 14.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Galaxy', 'Yakima Chief', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Galaxy', 'BarthHaas', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Galaxy', 'Hopsteiner', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Galaxy', 'Charles Faram', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Galaxy', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin','Nelson Sauvin Pellets'], 'Standard Nelson Sauvin', NULL, NULL, 12.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Nelson Sauvin', 'Yakima Chief', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Nelson Sauvin', 'BarthHaas', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Nelson Sauvin', 'Hopsteiner', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Nelson Sauvin', 'Charles Faram', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Nelson Sauvin', 'Crosby Hops', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Motueka', 'hop', ARRAY['Motueka','Motueka Pellets'], 'Standard Motueka', NULL, NULL, 7.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Motueka', 'Yakima Chief', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Motueka', 'BarthHaas', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Motueka', 'Hopsteiner', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Motueka', 'Charles Faram', 7, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Motueka', 'Crosby Hops', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Vic Secret', 'hop', ARRAY['Vic Secret','Vic Secret Pellets'], 'Standard Vic Secret', NULL, NULL, 15.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Vic Secret', 'Yakima Chief', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Vic Secret', 'BarthHaas', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Vic Secret', 'Hopsteiner', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Vic Secret', 'Charles Faram', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Vic Secret', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Sabro', 'hop', ARRAY['Sabro','Sabro Pellets'], 'Standard Sabro', NULL, NULL, 14.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Sabro', 'Yakima Chief', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Sabro', 'BarthHaas', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Sabro', 'Hopsteiner', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Sabro', 'Charles Faram', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Sabro', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'El Dorado', 'hop', ARRAY['El Dorado','El Dorado Pellets'], 'Standard El Dorado', NULL, NULL, 15.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief El Dorado', 'Yakima Chief', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas El Dorado', 'BarthHaas', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner El Dorado', 'Hopsteiner', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram El Dorado', 'Charles Faram', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops El Dorado', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Idaho 7', 'hop', ARRAY['Idaho 7','Idaho 7 Pellets'], 'Standard Idaho 7', NULL, NULL, 13.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Idaho 7', 'Yakima Chief', 13.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Idaho 7', 'BarthHaas', 13.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Idaho 7', 'Hopsteiner', 13.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Idaho 7', 'Charles Faram', 13.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Idaho 7', 'Crosby Hops', 13.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Strata', 'hop', ARRAY['Strata','Strata Pellets'], 'Standard Strata', NULL, NULL, 14.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Strata', 'Yakima Chief', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Strata', 'BarthHaas', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Strata', 'Hopsteiner', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Strata', 'Charles Faram', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Strata', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Nectaron', 'hop', ARRAY['Nectaron','Nectaron Pellets'], 'Standard Nectaron', NULL, NULL, 11.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Nectaron', 'Yakima Chief', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Nectaron', 'BarthHaas', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Nectaron', 'Hopsteiner', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Nectaron', 'Charles Faram', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Nectaron', 'Crosby Hops', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Loral', 'hop', ARRAY['Loral','Loral Pellets'], 'Standard Loral', NULL, NULL, 11.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Loral', 'Yakima Chief', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Loral', 'BarthHaas', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Loral', 'Hopsteiner', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Loral', 'Charles Faram', 11.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Loral', 'Crosby Hops', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Equinox', 'hop', ARRAY['Equinox','Equinox Pellets'], 'Standard Equinox', NULL, NULL, 14.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Equinox', 'Yakima Chief', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Equinox', 'BarthHaas', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Equinox', 'Hopsteiner', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Equinox', 'Charles Faram', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Equinox', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Sorachi Ace', 'hop', ARRAY['Sorachi Ace','Sorachi Ace Pellets'], 'Standard Sorachi Ace', NULL, NULL, 13.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Sorachi Ace', 'Yakima Chief', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Sorachi Ace', 'BarthHaas', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Sorachi Ace', 'Hopsteiner', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Sorachi Ace', 'Charles Faram', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Sorachi Ace', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Athanum', 'hop', ARRAY['Athanum','Athanum Pellets'], 'Standard Athanum', NULL, NULL, 4.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Athanum', 'Yakima Chief', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Athanum', 'BarthHaas', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Athanum', 'Hopsteiner', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Athanum', 'Charles Faram', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Athanum', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Bravo', 'hop', ARRAY['Bravo','Bravo Pellets'], 'Standard Bravo', NULL, NULL, 15.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Bravo', 'Yakima Chief', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Bravo', 'BarthHaas', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Bravo', 'Hopsteiner', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Bravo', 'Charles Faram', 15, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Bravo', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Bramling Cross', 'hop', ARRAY['Bramling Cross','Bramling Cross Pellets'], 'Standard Bramling Cross', NULL, NULL, 6.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Bramling Cross', 'Yakima Chief', 6.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Bramling Cross', 'BarthHaas', 6.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Bramling Cross', 'Hopsteiner', 6.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Bramling Cross', 'Charles Faram', 6.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Bramling Cross', 'Crosby Hops', 6.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Calypso', 'hop', ARRAY['Calypso','Calypso Pellets'], 'Standard Calypso', NULL, NULL, 14.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Calypso', 'Yakima Chief', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Calypso', 'BarthHaas', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Calypso', 'Hopsteiner', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Calypso', 'Charles Faram', 14, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Calypso', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Crystal', 'hop', ARRAY['Crystal','Crystal Pellets'], 'Standard Crystal', NULL, NULL, 4.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Crystal', 'Yakima Chief', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Crystal', 'BarthHaas', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Crystal', 'Hopsteiner', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Crystal', 'Charles Faram', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Crystal', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Galena', 'hop', ARRAY['Galena','Galena Pellets'], 'Standard Galena', NULL, NULL, 13.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Galena', 'Yakima Chief', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Galena', 'BarthHaas', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Galena', 'Hopsteiner', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Galena', 'Charles Faram', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Galena', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Glacier', 'hop', ARRAY['Glacier','Glacier Pellets'], 'Standard Glacier', NULL, NULL, 5.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Glacier', 'Yakima Chief', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Glacier', 'BarthHaas', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Glacier', 'Hopsteiner', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Glacier', 'Charles Faram', 5.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Glacier', 'Crosby Hops', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Liberty', 'hop', ARRAY['Liberty','Liberty Pellets'], 'Standard Liberty', NULL, NULL, 4.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Liberty', 'Yakima Chief', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Liberty', 'BarthHaas', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Liberty', 'Hopsteiner', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Liberty', 'Charles Faram', 4.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Liberty', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Mount Hood', 'hop', ARRAY['Mount Hood','Mount Hood Pellets'], 'Standard Mount Hood', NULL, NULL, 6.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Mount Hood', 'Yakima Chief', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Mount Hood', 'BarthHaas', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Mount Hood', 'Hopsteiner', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Mount Hood', 'Charles Faram', 6, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Mount Hood', 'Crosby Hops', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Nugget', 'hop', ARRAY['Nugget','Nugget Pellets'], 'Standard Nugget', NULL, NULL, 13.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Nugget', 'Yakima Chief', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Nugget', 'BarthHaas', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Nugget', 'Hopsteiner', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Nugget', 'Charles Faram', 13, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Nugget', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Palisade', 'hop', ARRAY['Palisade','Palisade Pellets'], 'Standard Palisade', NULL, NULL, 7.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Palisade', 'Yakima Chief', 7.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Palisade', 'BarthHaas', 7.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Palisade', 'Hopsteiner', 7.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Palisade', 'Charles Faram', 7.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Palisade', 'Crosby Hops', 7.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Willamette', 'hop', ARRAY['Willamette','Willamette Pellets'], 'Standard Willamette', NULL, NULL, 5.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Willamette', 'Yakima Chief', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Willamette', 'BarthHaas', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Willamette', 'Hopsteiner', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Willamette', 'Charles Faram', 5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Willamette', 'Crosby Hops', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Warrior', 'hop', ARRAY['Warrior','Warrior Pellets'], 'Standard Warrior', NULL, NULL, 16.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Warrior', 'Yakima Chief', 16, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Warrior', 'BarthHaas', 16, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Warrior', 'Hopsteiner', 16, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Warrior', 'Charles Faram', 16, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Warrior', 'Crosby Hops', 16, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'HBC 586', 'hop', ARRAY['HBC 586','HBC 586 Pellets'], 'Standard HBC 586', NULL, NULL, 12.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief HBC 586', 'Yakima Chief', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas HBC 586', 'BarthHaas', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner HBC 586', 'Hopsteiner', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram HBC 586', 'Charles Faram', 12, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops HBC 586', 'Crosby Hops', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'HBC 1019', 'hop', ARRAY['HBC 1019','HBC 1019 Pellets'], 'Standard HBC 1019', NULL, NULL, 10.50);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief HBC 1019', 'Yakima Chief', 10.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas HBC 1019', 'BarthHaas', 10.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner HBC 1019', 'Hopsteiner', 10.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram HBC 1019', 'Charles Faram', 10.5, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops HBC 1019', 'Crosby Hops', 10.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Krush', 'hop', ARRAY['Krush','Krush Pellets'], 'Standard Krush', NULL, NULL, 11.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Krush', 'Yakima Chief', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Krush', 'BarthHaas', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Krush', 'Hopsteiner', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Krush', 'Charles Faram', 11, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Krush', 'Crosby Hops', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Superdelic', 'hop', ARRAY['Superdelic','Superdelic Pellets'], 'Standard Superdelic', NULL, NULL, 10.00);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Superdelic', 'Yakima Chief', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Superdelic', 'BarthHaas', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Superdelic', 'Hopsteiner', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Superdelic', 'Charles Faram', 10, true);
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Superdelic', 'Crosby Hops', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'US-05', 'yeast', ARRAY['US-05','US-05 Ale Yeast'], 'Standard US-05', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis US-05', 'Fermentis', 81, 18, 28, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'S-04', 'yeast', ARRAY['S-04','S-04 Ale Yeast'], 'Standard S-04', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis S-04', 'Fermentis', 75, 15, 20, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'W-34/70 Lager Yeast', 'yeast', ARRAY['W-34/70 Lager Yeast','W-34/70','W-34/70 Ale Yeast'], 'Standard W-34/70 Lager Yeast', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis W-34/70', 'Fermentis', 83, 9, 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Nottingham Ale Yeast', 'yeast', ARRAY['Nottingham Ale Yeast','Nottingham'], 'Standard Nottingham Ale Yeast', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Nottingham', 'Lallemand', 80, 14, 21, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Verdant IPA', 'yeast', ARRAY['Verdant IPA','Verdant IPA Ale Yeast'], 'Standard Verdant IPA', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Verdant IPA', 'Lallemand', 78, 18, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'BRY-97', 'yeast', ARRAY['BRY-97','BRY-97 Ale Yeast'], 'Standard BRY-97', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand BRY-97', 'Lallemand', 82, 15, 22, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'WLP001 California Ale', 'yeast', ARRAY['WLP001 California Ale','WLP001 California Ale Ale Yeast'], 'Standard WLP001 California Ale', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP001 California Ale', 'White Labs', 80, 20, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'WLP002 English Ale', 'yeast', ARRAY['WLP002 English Ale','WLP002 English Ale Ale Yeast'], 'Standard WLP002 English Ale', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP002 English Ale', 'White Labs', 70, 18, 20, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'WLP029 German Ale/Kolsch', 'yeast', ARRAY['WLP029 German Ale/Kolsch','WLP029 German Ale/Kolsch Ale Yeast'], 'Standard WLP029 German Ale/Kolsch', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP029 German Ale/Kolsch', 'White Labs', 78, 18, 21, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'WLP830 German Lager', 'yeast', ARRAY['WLP830 German Lager','WLP830 German Lager Ale Yeast'], 'Standard WLP830 German Lager', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP830 German Lager', 'White Labs', 79, 10, 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, '1056 American Ale', 'yeast', ARRAY['1056 American Ale','1056 American Ale Ale Yeast'], 'Standard 1056 American Ale', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Wyeast 1056 American Ale', 'Wyeast', 75, 15, 22, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, '1318 London Ale III', 'yeast', ARRAY['1318 London Ale III','1318 London Ale III Ale Yeast'], 'Standard 1318 London Ale III', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Wyeast 1318 London Ale III', 'Wyeast', 75, 18, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, '2124 Bohemian Lager', 'yeast', ARRAY['2124 Bohemian Lager','2124 Bohemian Lager Ale Yeast'], 'Standard 2124 Bohemian Lager', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Wyeast 2124 Bohemian Lager', 'Wyeast', 73, 9, 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Voss Kveik', 'yeast', ARRAY['Voss Kveik','Voss Kveik Ale Yeast'], 'Standard Voss Kveik', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Voss Kveik', 'Lallemand', 80, 35, 40, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Philly Sour', 'yeast', ARRAY['Philly Sour','Philly Sour Ale Yeast'], 'Standard Philly Sour', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Philly Sour', 'Lallemand', 80, 22, 25, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'Belle Saison', 'yeast', ARRAY['Belle Saison','Belle Saison Ale Yeast'], 'Standard Belle Saison', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Belle Saison', 'Lallemand', 90, 20, 35, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'SafAle BE-256', 'yeast', ARRAY['SafAle BE-256','SafAle BE-256 Ale Yeast'], 'Standard SafAle BE-256', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis SafAle BE-256', 'Fermentis', 85, 15, 25, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'SafAle K-97', 'yeast', ARRAY['SafAle K-97','SafAle K-97 Ale Yeast'], 'Standard SafAle K-97', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis SafAle K-97', 'Fermentis', 81, 15, 20, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'M44 US West Coast', 'yeast', ARRAY['M44 US West Coast','M44 US West Coast Ale Yeast'], 'Standard M44 US West Coast', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Mangrove Jack''s M44 US West Coast', 'Mangrove Jack''s', 81, 18, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description, color_ebc, potential_pts, alpha_pct) 
  VALUES (master_id, 'M36 Liberty Bell', 'yeast', ARRAY['M36 Liberty Bell','M36 Liberty Bell Ale Yeast'], 'Standard M36 Liberty Bell', NULL, NULL, NULL);
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Mangrove Jack''s M36 Liberty Bell', 'Mangrove Jack''s', 74, 18, 23, true);

END $$;
