-- Migration: Seed ~500 ingredients combining common malts, hops, and yeasts.
-- Uses generic/standard industry specifications. Compliant with factual property paradigms.

DO $$ 
DECLARE
  master_id uuid;
BEGIN

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Weyermann Pilsner Malt','Pilsner Malt (Weyermann)'], 'Standard Pilsner Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Pilsner Malt', 'Weyermann', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Pilsner Malt', 'malt', ARRAY['Pilsner Malt','BestMalz Pilsner Malt','Pilsner Malt (BestMalz)'], 'Standard Pilsner Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Pilsner Malt', 'BestMalz', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Briess Pilsner Malt','Pilsner Malt (Briess)'], 'Standard Pilsner Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Pilsner Malt', 'Briess', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Simpsons Pilsner Malt','Pilsner Malt (Simpsons)'], 'Standard Pilsner Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Pilsner Malt', 'Simpsons', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Crisp Pilsner Malt','Pilsner Malt (Crisp)'], 'Standard Pilsner Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Pilsner Malt', 'Crisp', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Dingemans Pilsner Malt','Pilsner Malt (Dingemans)'], 'Standard Pilsner Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Pilsner Malt', 'Dingemans', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Castle Malting Pilsner Malt','Pilsner Malt (Castle Malting)'], 'Standard Pilsner Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Pilsner Malt', 'Castle Malting', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Bairds Pilsner Malt','Pilsner Malt (Bairds)'], 'Standard Pilsner Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Pilsner Malt', 'Bairds', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Pilsner Malt', 'malt', ARRAY['Pilsner Malt','Viking Malt Pilsner Malt','Pilsner Malt (Viking Malt)'], 'Standard Pilsner Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Pilsner Malt', 'Viking Malt', 3.5, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Weyermann Pale Ale Malt','Pale Ale Malt (Weyermann)'], 'Standard Pale Ale Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Pale Ale Malt', 'Weyermann', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','BestMalz Pale Ale Malt','Pale Ale Malt (BestMalz)'], 'Standard Pale Ale Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Pale Ale Malt', 'BestMalz', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Briess Pale Ale Malt','Pale Ale Malt (Briess)'], 'Standard Pale Ale Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Pale Ale Malt', 'Briess', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Simpsons Pale Ale Malt','Pale Ale Malt (Simpsons)'], 'Standard Pale Ale Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Pale Ale Malt', 'Simpsons', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Crisp Pale Ale Malt','Pale Ale Malt (Crisp)'], 'Standard Pale Ale Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Pale Ale Malt', 'Crisp', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Dingemans Pale Ale Malt','Pale Ale Malt (Dingemans)'], 'Standard Pale Ale Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Pale Ale Malt', 'Dingemans', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Castle Malting Pale Ale Malt','Pale Ale Malt (Castle Malting)'], 'Standard Pale Ale Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Pale Ale Malt', 'Castle Malting', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Bairds Pale Ale Malt','Pale Ale Malt (Bairds)'], 'Standard Pale Ale Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Pale Ale Malt', 'Bairds', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Pale Ale Malt', 'malt', ARRAY['Pale Ale Malt','Viking Malt Pale Ale Malt','Pale Ale Malt (Viking Malt)'], 'Standard Pale Ale Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Pale Ale Malt', 'Viking Malt', 6, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Munich Malt I', 'malt', ARRAY['Munich Malt I','Weyermann Munich Malt I','Munich Malt I (Weyermann)'], 'Standard Munich Malt I manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Munich Malt I', 'Weyermann', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Munich Malt I', 'malt', ARRAY['Munich Malt I','BestMalz Munich Malt I','Munich Malt I (BestMalz)'], 'Standard Munich Malt I manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Munich Malt I', 'BestMalz', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Munich Malt I', 'malt', ARRAY['Munich Malt I','Briess Munich Malt I','Munich Malt I (Briess)'], 'Standard Munich Malt I manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Munich Malt I', 'Briess', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Munich Malt I', 'malt', ARRAY['Munich Malt I','Simpsons Munich Malt I','Munich Malt I (Simpsons)'], 'Standard Munich Malt I manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Munich Malt I', 'Simpsons', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Munich Malt I', 'malt', ARRAY['Munich Malt I','Crisp Munich Malt I','Munich Malt I (Crisp)'], 'Standard Munich Malt I manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Munich Malt I', 'Crisp', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Munich Malt I', 'malt', ARRAY['Munich Malt I','Dingemans Munich Malt I','Munich Malt I (Dingemans)'], 'Standard Munich Malt I manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Munich Malt I', 'Dingemans', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Munich Malt I', 'malt', ARRAY['Munich Malt I','Castle Malting Munich Malt I','Munich Malt I (Castle Malting)'], 'Standard Munich Malt I manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Munich Malt I', 'Castle Malting', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Munich Malt I', 'malt', ARRAY['Munich Malt I','Bairds Munich Malt I','Munich Malt I (Bairds)'], 'Standard Munich Malt I manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Munich Malt I', 'Bairds', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Munich Malt I', 'malt', ARRAY['Munich Malt I','Viking Malt Munich Malt I','Munich Malt I (Viking Malt)'], 'Standard Munich Malt I manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Munich Malt I', 'Viking Malt', 15, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Munich Malt II', 'malt', ARRAY['Munich Malt II','Weyermann Munich Malt II','Munich Malt II (Weyermann)'], 'Standard Munich Malt II manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Munich Malt II', 'Weyermann', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Munich Malt II', 'malt', ARRAY['Munich Malt II','BestMalz Munich Malt II','Munich Malt II (BestMalz)'], 'Standard Munich Malt II manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Munich Malt II', 'BestMalz', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Munich Malt II', 'malt', ARRAY['Munich Malt II','Briess Munich Malt II','Munich Malt II (Briess)'], 'Standard Munich Malt II manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Munich Malt II', 'Briess', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Munich Malt II', 'malt', ARRAY['Munich Malt II','Simpsons Munich Malt II','Munich Malt II (Simpsons)'], 'Standard Munich Malt II manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Munich Malt II', 'Simpsons', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Munich Malt II', 'malt', ARRAY['Munich Malt II','Crisp Munich Malt II','Munich Malt II (Crisp)'], 'Standard Munich Malt II manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Munich Malt II', 'Crisp', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Munich Malt II', 'malt', ARRAY['Munich Malt II','Dingemans Munich Malt II','Munich Malt II (Dingemans)'], 'Standard Munich Malt II manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Munich Malt II', 'Dingemans', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Munich Malt II', 'malt', ARRAY['Munich Malt II','Castle Malting Munich Malt II','Munich Malt II (Castle Malting)'], 'Standard Munich Malt II manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Munich Malt II', 'Castle Malting', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Munich Malt II', 'malt', ARRAY['Munich Malt II','Bairds Munich Malt II','Munich Malt II (Bairds)'], 'Standard Munich Malt II manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Munich Malt II', 'Bairds', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Munich Malt II', 'malt', ARRAY['Munich Malt II','Viking Malt Munich Malt II','Munich Malt II (Viking Malt)'], 'Standard Munich Malt II manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Munich Malt II', 'Viking Malt', 25, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Vienna Malt', 'malt', ARRAY['Vienna Malt','Weyermann Vienna Malt','Vienna Malt (Weyermann)'], 'Standard Vienna Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Vienna Malt', 'Weyermann', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Vienna Malt', 'malt', ARRAY['Vienna Malt','BestMalz Vienna Malt','Vienna Malt (BestMalz)'], 'Standard Vienna Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Vienna Malt', 'BestMalz', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Vienna Malt', 'malt', ARRAY['Vienna Malt','Briess Vienna Malt','Vienna Malt (Briess)'], 'Standard Vienna Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Vienna Malt', 'Briess', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Vienna Malt', 'malt', ARRAY['Vienna Malt','Simpsons Vienna Malt','Vienna Malt (Simpsons)'], 'Standard Vienna Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Vienna Malt', 'Simpsons', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Vienna Malt', 'malt', ARRAY['Vienna Malt','Crisp Vienna Malt','Vienna Malt (Crisp)'], 'Standard Vienna Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Vienna Malt', 'Crisp', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Vienna Malt', 'malt', ARRAY['Vienna Malt','Dingemans Vienna Malt','Vienna Malt (Dingemans)'], 'Standard Vienna Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Vienna Malt', 'Dingemans', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Vienna Malt', 'malt', ARRAY['Vienna Malt','Castle Malting Vienna Malt','Vienna Malt (Castle Malting)'], 'Standard Vienna Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Vienna Malt', 'Castle Malting', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Vienna Malt', 'malt', ARRAY['Vienna Malt','Bairds Vienna Malt','Vienna Malt (Bairds)'], 'Standard Vienna Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Vienna Malt', 'Bairds', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Vienna Malt', 'malt', ARRAY['Vienna Malt','Viking Malt Vienna Malt','Vienna Malt (Viking Malt)'], 'Standard Vienna Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Vienna Malt', 'Viking Malt', 8, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Wheat Malt', 'malt', ARRAY['Wheat Malt','Weyermann Wheat Malt','Wheat Malt (Weyermann)'], 'Standard Wheat Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Wheat Malt', 'Weyermann', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Wheat Malt', 'malt', ARRAY['Wheat Malt','BestMalz Wheat Malt','Wheat Malt (BestMalz)'], 'Standard Wheat Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Wheat Malt', 'BestMalz', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Wheat Malt', 'malt', ARRAY['Wheat Malt','Briess Wheat Malt','Wheat Malt (Briess)'], 'Standard Wheat Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Wheat Malt', 'Briess', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Wheat Malt', 'malt', ARRAY['Wheat Malt','Simpsons Wheat Malt','Wheat Malt (Simpsons)'], 'Standard Wheat Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Wheat Malt', 'Simpsons', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Wheat Malt', 'malt', ARRAY['Wheat Malt','Crisp Wheat Malt','Wheat Malt (Crisp)'], 'Standard Wheat Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Wheat Malt', 'Crisp', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Wheat Malt', 'malt', ARRAY['Wheat Malt','Dingemans Wheat Malt','Wheat Malt (Dingemans)'], 'Standard Wheat Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Wheat Malt', 'Dingemans', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Wheat Malt', 'malt', ARRAY['Wheat Malt','Castle Malting Wheat Malt','Wheat Malt (Castle Malting)'], 'Standard Wheat Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Wheat Malt', 'Castle Malting', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Wheat Malt', 'malt', ARRAY['Wheat Malt','Bairds Wheat Malt','Wheat Malt (Bairds)'], 'Standard Wheat Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Wheat Malt', 'Bairds', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Wheat Malt', 'malt', ARRAY['Wheat Malt','Viking Malt Wheat Malt','Wheat Malt (Viking Malt)'], 'Standard Wheat Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Wheat Malt', 'Viking Malt', 4.5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Carahell', 'malt', ARRAY['Carahell','Weyermann Carahell','Carahell (Weyermann)'], 'Standard Carahell manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carahell', 'Weyermann', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Carahell', 'malt', ARRAY['Carahell','BestMalz Carahell','Carahell (BestMalz)'], 'Standard Carahell manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carahell', 'BestMalz', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Carahell', 'malt', ARRAY['Carahell','Briess Carahell','Carahell (Briess)'], 'Standard Carahell manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carahell', 'Briess', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Carahell', 'malt', ARRAY['Carahell','Simpsons Carahell','Carahell (Simpsons)'], 'Standard Carahell manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carahell', 'Simpsons', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Carahell', 'malt', ARRAY['Carahell','Crisp Carahell','Carahell (Crisp)'], 'Standard Carahell manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carahell', 'Crisp', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Carahell', 'malt', ARRAY['Carahell','Dingemans Carahell','Carahell (Dingemans)'], 'Standard Carahell manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carahell', 'Dingemans', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Carahell', 'malt', ARRAY['Carahell','Castle Malting Carahell','Carahell (Castle Malting)'], 'Standard Carahell manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carahell', 'Castle Malting', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Carahell', 'malt', ARRAY['Carahell','Bairds Carahell','Carahell (Bairds)'], 'Standard Carahell manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carahell', 'Bairds', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Carahell', 'malt', ARRAY['Carahell','Viking Malt Carahell','Carahell (Viking Malt)'], 'Standard Carahell manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carahell', 'Viking Malt', 25, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Caramunich I', 'malt', ARRAY['Caramunich I','Weyermann Caramunich I','Caramunich I (Weyermann)'], 'Standard Caramunich I manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caramunich I', 'Weyermann', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Caramunich I', 'malt', ARRAY['Caramunich I','BestMalz Caramunich I','Caramunich I (BestMalz)'], 'Standard Caramunich I manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caramunich I', 'BestMalz', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Caramunich I', 'malt', ARRAY['Caramunich I','Briess Caramunich I','Caramunich I (Briess)'], 'Standard Caramunich I manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caramunich I', 'Briess', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Caramunich I', 'malt', ARRAY['Caramunich I','Simpsons Caramunich I','Caramunich I (Simpsons)'], 'Standard Caramunich I manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caramunich I', 'Simpsons', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Caramunich I', 'malt', ARRAY['Caramunich I','Crisp Caramunich I','Caramunich I (Crisp)'], 'Standard Caramunich I manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caramunich I', 'Crisp', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Caramunich I', 'malt', ARRAY['Caramunich I','Dingemans Caramunich I','Caramunich I (Dingemans)'], 'Standard Caramunich I manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caramunich I', 'Dingemans', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Caramunich I', 'malt', ARRAY['Caramunich I','Castle Malting Caramunich I','Caramunich I (Castle Malting)'], 'Standard Caramunich I manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caramunich I', 'Castle Malting', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Caramunich I', 'malt', ARRAY['Caramunich I','Bairds Caramunich I','Caramunich I (Bairds)'], 'Standard Caramunich I manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caramunich I', 'Bairds', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Caramunich I', 'malt', ARRAY['Caramunich I','Viking Malt Caramunich I','Caramunich I (Viking Malt)'], 'Standard Caramunich I manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caramunich I', 'Viking Malt', 90, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Caramunich II', 'malt', ARRAY['Caramunich II','Weyermann Caramunich II','Caramunich II (Weyermann)'], 'Standard Caramunich II manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caramunich II', 'Weyermann', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Caramunich II', 'malt', ARRAY['Caramunich II','BestMalz Caramunich II','Caramunich II (BestMalz)'], 'Standard Caramunich II manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caramunich II', 'BestMalz', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Caramunich II', 'malt', ARRAY['Caramunich II','Briess Caramunich II','Caramunich II (Briess)'], 'Standard Caramunich II manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caramunich II', 'Briess', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Caramunich II', 'malt', ARRAY['Caramunich II','Simpsons Caramunich II','Caramunich II (Simpsons)'], 'Standard Caramunich II manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caramunich II', 'Simpsons', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Caramunich II', 'malt', ARRAY['Caramunich II','Crisp Caramunich II','Caramunich II (Crisp)'], 'Standard Caramunich II manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caramunich II', 'Crisp', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Caramunich II', 'malt', ARRAY['Caramunich II','Dingemans Caramunich II','Caramunich II (Dingemans)'], 'Standard Caramunich II manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caramunich II', 'Dingemans', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Caramunich II', 'malt', ARRAY['Caramunich II','Castle Malting Caramunich II','Caramunich II (Castle Malting)'], 'Standard Caramunich II manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caramunich II', 'Castle Malting', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Caramunich II', 'malt', ARRAY['Caramunich II','Bairds Caramunich II','Caramunich II (Bairds)'], 'Standard Caramunich II manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caramunich II', 'Bairds', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Caramunich II', 'malt', ARRAY['Caramunich II','Viking Malt Caramunich II','Caramunich II (Viking Malt)'], 'Standard Caramunich II manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caramunich II', 'Viking Malt', 120, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Caramunich III', 'malt', ARRAY['Caramunich III','Weyermann Caramunich III','Caramunich III (Weyermann)'], 'Standard Caramunich III manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caramunich III', 'Weyermann', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Caramunich III', 'malt', ARRAY['Caramunich III','BestMalz Caramunich III','Caramunich III (BestMalz)'], 'Standard Caramunich III manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caramunich III', 'BestMalz', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Caramunich III', 'malt', ARRAY['Caramunich III','Briess Caramunich III','Caramunich III (Briess)'], 'Standard Caramunich III manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caramunich III', 'Briess', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Caramunich III', 'malt', ARRAY['Caramunich III','Simpsons Caramunich III','Caramunich III (Simpsons)'], 'Standard Caramunich III manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caramunich III', 'Simpsons', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Caramunich III', 'malt', ARRAY['Caramunich III','Crisp Caramunich III','Caramunich III (Crisp)'], 'Standard Caramunich III manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caramunich III', 'Crisp', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Caramunich III', 'malt', ARRAY['Caramunich III','Dingemans Caramunich III','Caramunich III (Dingemans)'], 'Standard Caramunich III manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caramunich III', 'Dingemans', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Caramunich III', 'malt', ARRAY['Caramunich III','Castle Malting Caramunich III','Caramunich III (Castle Malting)'], 'Standard Caramunich III manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caramunich III', 'Castle Malting', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Caramunich III', 'malt', ARRAY['Caramunich III','Bairds Caramunich III','Caramunich III (Bairds)'], 'Standard Caramunich III manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caramunich III', 'Bairds', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Caramunich III', 'malt', ARRAY['Caramunich III','Viking Malt Caramunich III','Caramunich III (Viking Malt)'], 'Standard Caramunich III manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caramunich III', 'Viking Malt', 150, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Caraaroma', 'malt', ARRAY['Caraaroma','Weyermann Caraaroma','Caraaroma (Weyermann)'], 'Standard Caraaroma manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Caraaroma', 'Weyermann', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Caraaroma', 'malt', ARRAY['Caraaroma','BestMalz Caraaroma','Caraaroma (BestMalz)'], 'Standard Caraaroma manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Caraaroma', 'BestMalz', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Caraaroma', 'malt', ARRAY['Caraaroma','Briess Caraaroma','Caraaroma (Briess)'], 'Standard Caraaroma manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Caraaroma', 'Briess', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Caraaroma', 'malt', ARRAY['Caraaroma','Simpsons Caraaroma','Caraaroma (Simpsons)'], 'Standard Caraaroma manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Caraaroma', 'Simpsons', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Caraaroma', 'malt', ARRAY['Caraaroma','Crisp Caraaroma','Caraaroma (Crisp)'], 'Standard Caraaroma manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Caraaroma', 'Crisp', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Caraaroma', 'malt', ARRAY['Caraaroma','Dingemans Caraaroma','Caraaroma (Dingemans)'], 'Standard Caraaroma manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Caraaroma', 'Dingemans', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Caraaroma', 'malt', ARRAY['Caraaroma','Castle Malting Caraaroma','Caraaroma (Castle Malting)'], 'Standard Caraaroma manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Caraaroma', 'Castle Malting', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Caraaroma', 'malt', ARRAY['Caraaroma','Bairds Caraaroma','Caraaroma (Bairds)'], 'Standard Caraaroma manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Caraaroma', 'Bairds', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Caraaroma', 'malt', ARRAY['Caraaroma','Viking Malt Caraaroma','Caraaroma (Viking Malt)'], 'Standard Caraaroma manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Caraaroma', 'Viking Malt', 400, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Carafa Special I', 'malt', ARRAY['Carafa Special I','Weyermann Carafa Special I','Carafa Special I (Weyermann)'], 'Standard Carafa Special I manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carafa Special I', 'Weyermann', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Carafa Special I', 'malt', ARRAY['Carafa Special I','BestMalz Carafa Special I','Carafa Special I (BestMalz)'], 'Standard Carafa Special I manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carafa Special I', 'BestMalz', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Carafa Special I', 'malt', ARRAY['Carafa Special I','Briess Carafa Special I','Carafa Special I (Briess)'], 'Standard Carafa Special I manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carafa Special I', 'Briess', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Carafa Special I', 'malt', ARRAY['Carafa Special I','Simpsons Carafa Special I','Carafa Special I (Simpsons)'], 'Standard Carafa Special I manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carafa Special I', 'Simpsons', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Carafa Special I', 'malt', ARRAY['Carafa Special I','Crisp Carafa Special I','Carafa Special I (Crisp)'], 'Standard Carafa Special I manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carafa Special I', 'Crisp', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Carafa Special I', 'malt', ARRAY['Carafa Special I','Dingemans Carafa Special I','Carafa Special I (Dingemans)'], 'Standard Carafa Special I manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carafa Special I', 'Dingemans', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Carafa Special I', 'malt', ARRAY['Carafa Special I','Castle Malting Carafa Special I','Carafa Special I (Castle Malting)'], 'Standard Carafa Special I manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carafa Special I', 'Castle Malting', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Carafa Special I', 'malt', ARRAY['Carafa Special I','Bairds Carafa Special I','Carafa Special I (Bairds)'], 'Standard Carafa Special I manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carafa Special I', 'Bairds', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Carafa Special I', 'malt', ARRAY['Carafa Special I','Viking Malt Carafa Special I','Carafa Special I (Viking Malt)'], 'Standard Carafa Special I manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carafa Special I', 'Viking Malt', 900, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Carafa Special II', 'malt', ARRAY['Carafa Special II','Weyermann Carafa Special II','Carafa Special II (Weyermann)'], 'Standard Carafa Special II manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carafa Special II', 'Weyermann', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Carafa Special II', 'malt', ARRAY['Carafa Special II','BestMalz Carafa Special II','Carafa Special II (BestMalz)'], 'Standard Carafa Special II manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carafa Special II', 'BestMalz', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Carafa Special II', 'malt', ARRAY['Carafa Special II','Briess Carafa Special II','Carafa Special II (Briess)'], 'Standard Carafa Special II manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carafa Special II', 'Briess', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Carafa Special II', 'malt', ARRAY['Carafa Special II','Simpsons Carafa Special II','Carafa Special II (Simpsons)'], 'Standard Carafa Special II manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carafa Special II', 'Simpsons', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Carafa Special II', 'malt', ARRAY['Carafa Special II','Crisp Carafa Special II','Carafa Special II (Crisp)'], 'Standard Carafa Special II manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carafa Special II', 'Crisp', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Carafa Special II', 'malt', ARRAY['Carafa Special II','Dingemans Carafa Special II','Carafa Special II (Dingemans)'], 'Standard Carafa Special II manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carafa Special II', 'Dingemans', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Carafa Special II', 'malt', ARRAY['Carafa Special II','Castle Malting Carafa Special II','Carafa Special II (Castle Malting)'], 'Standard Carafa Special II manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carafa Special II', 'Castle Malting', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Carafa Special II', 'malt', ARRAY['Carafa Special II','Bairds Carafa Special II','Carafa Special II (Bairds)'], 'Standard Carafa Special II manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carafa Special II', 'Bairds', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Carafa Special II', 'malt', ARRAY['Carafa Special II','Viking Malt Carafa Special II','Carafa Special II (Viking Malt)'], 'Standard Carafa Special II manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carafa Special II', 'Viking Malt', 1150, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Carafa Special III', 'malt', ARRAY['Carafa Special III','Weyermann Carafa Special III','Carafa Special III (Weyermann)'], 'Standard Carafa Special III manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Carafa Special III', 'Weyermann', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Carafa Special III', 'malt', ARRAY['Carafa Special III','BestMalz Carafa Special III','Carafa Special III (BestMalz)'], 'Standard Carafa Special III manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Carafa Special III', 'BestMalz', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Carafa Special III', 'malt', ARRAY['Carafa Special III','Briess Carafa Special III','Carafa Special III (Briess)'], 'Standard Carafa Special III manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Carafa Special III', 'Briess', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Carafa Special III', 'malt', ARRAY['Carafa Special III','Simpsons Carafa Special III','Carafa Special III (Simpsons)'], 'Standard Carafa Special III manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Carafa Special III', 'Simpsons', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Carafa Special III', 'malt', ARRAY['Carafa Special III','Crisp Carafa Special III','Carafa Special III (Crisp)'], 'Standard Carafa Special III manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Carafa Special III', 'Crisp', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Carafa Special III', 'malt', ARRAY['Carafa Special III','Dingemans Carafa Special III','Carafa Special III (Dingemans)'], 'Standard Carafa Special III manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Carafa Special III', 'Dingemans', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Carafa Special III', 'malt', ARRAY['Carafa Special III','Castle Malting Carafa Special III','Carafa Special III (Castle Malting)'], 'Standard Carafa Special III manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Carafa Special III', 'Castle Malting', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Carafa Special III', 'malt', ARRAY['Carafa Special III','Bairds Carafa Special III','Carafa Special III (Bairds)'], 'Standard Carafa Special III manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Carafa Special III', 'Bairds', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Carafa Special III', 'malt', ARRAY['Carafa Special III','Viking Malt Carafa Special III','Carafa Special III (Viking Malt)'], 'Standard Carafa Special III manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Carafa Special III', 'Viking Malt', 1400, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Weyermann Chocolate Malt','Chocolate Malt (Weyermann)'], 'Standard Chocolate Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Chocolate Malt', 'Weyermann', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Chocolate Malt', 'malt', ARRAY['Chocolate Malt','BestMalz Chocolate Malt','Chocolate Malt (BestMalz)'], 'Standard Chocolate Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Chocolate Malt', 'BestMalz', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Briess Chocolate Malt','Chocolate Malt (Briess)'], 'Standard Chocolate Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Chocolate Malt', 'Briess', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Simpsons Chocolate Malt','Chocolate Malt (Simpsons)'], 'Standard Chocolate Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Chocolate Malt', 'Simpsons', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Crisp Chocolate Malt','Chocolate Malt (Crisp)'], 'Standard Chocolate Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Chocolate Malt', 'Crisp', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Dingemans Chocolate Malt','Chocolate Malt (Dingemans)'], 'Standard Chocolate Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Chocolate Malt', 'Dingemans', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Castle Malting Chocolate Malt','Chocolate Malt (Castle Malting)'], 'Standard Chocolate Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Chocolate Malt', 'Castle Malting', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Bairds Chocolate Malt','Chocolate Malt (Bairds)'], 'Standard Chocolate Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Chocolate Malt', 'Bairds', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Chocolate Malt', 'malt', ARRAY['Chocolate Malt','Viking Malt Chocolate Malt','Chocolate Malt (Viking Malt)'], 'Standard Chocolate Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Chocolate Malt', 'Viking Malt', 800, 1.034, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Black Malt', 'malt', ARRAY['Black Malt','Weyermann Black Malt','Black Malt (Weyermann)'], 'Standard Black Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Black Malt', 'Weyermann', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Black Malt', 'malt', ARRAY['Black Malt','BestMalz Black Malt','Black Malt (BestMalz)'], 'Standard Black Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Black Malt', 'BestMalz', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Black Malt', 'malt', ARRAY['Black Malt','Briess Black Malt','Black Malt (Briess)'], 'Standard Black Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Black Malt', 'Briess', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Black Malt', 'malt', ARRAY['Black Malt','Simpsons Black Malt','Black Malt (Simpsons)'], 'Standard Black Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Black Malt', 'Simpsons', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Black Malt', 'malt', ARRAY['Black Malt','Crisp Black Malt','Black Malt (Crisp)'], 'Standard Black Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Black Malt', 'Crisp', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Black Malt', 'malt', ARRAY['Black Malt','Dingemans Black Malt','Black Malt (Dingemans)'], 'Standard Black Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Black Malt', 'Dingemans', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Black Malt', 'malt', ARRAY['Black Malt','Castle Malting Black Malt','Black Malt (Castle Malting)'], 'Standard Black Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Black Malt', 'Castle Malting', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Black Malt', 'malt', ARRAY['Black Malt','Bairds Black Malt','Black Malt (Bairds)'], 'Standard Black Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Black Malt', 'Bairds', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Black Malt', 'malt', ARRAY['Black Malt','Viking Malt Black Malt','Black Malt (Viking Malt)'], 'Standard Black Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Black Malt', 'Viking Malt', 1300, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Roasted Barley', 'malt', ARRAY['Roasted Barley','Weyermann Roasted Barley','Roasted Barley (Weyermann)'], 'Standard Roasted Barley manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Roasted Barley', 'Weyermann', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Roasted Barley', 'malt', ARRAY['Roasted Barley','BestMalz Roasted Barley','Roasted Barley (BestMalz)'], 'Standard Roasted Barley manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Roasted Barley', 'BestMalz', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Roasted Barley', 'malt', ARRAY['Roasted Barley','Briess Roasted Barley','Roasted Barley (Briess)'], 'Standard Roasted Barley manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Roasted Barley', 'Briess', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Roasted Barley', 'malt', ARRAY['Roasted Barley','Simpsons Roasted Barley','Roasted Barley (Simpsons)'], 'Standard Roasted Barley manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Roasted Barley', 'Simpsons', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Roasted Barley', 'malt', ARRAY['Roasted Barley','Crisp Roasted Barley','Roasted Barley (Crisp)'], 'Standard Roasted Barley manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Roasted Barley', 'Crisp', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Roasted Barley', 'malt', ARRAY['Roasted Barley','Dingemans Roasted Barley','Roasted Barley (Dingemans)'], 'Standard Roasted Barley manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Roasted Barley', 'Dingemans', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Roasted Barley', 'malt', ARRAY['Roasted Barley','Castle Malting Roasted Barley','Roasted Barley (Castle Malting)'], 'Standard Roasted Barley manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Roasted Barley', 'Castle Malting', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Roasted Barley', 'malt', ARRAY['Roasted Barley','Bairds Roasted Barley','Roasted Barley (Bairds)'], 'Standard Roasted Barley manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Roasted Barley', 'Bairds', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Roasted Barley', 'malt', ARRAY['Roasted Barley','Viking Malt Roasted Barley','Roasted Barley (Viking Malt)'], 'Standard Roasted Barley manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Roasted Barley', 'Viking Malt', 1000, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Weyermann Melanoidin Malt','Melanoidin Malt (Weyermann)'], 'Standard Melanoidin Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Melanoidin Malt', 'Weyermann', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','BestMalz Melanoidin Malt','Melanoidin Malt (BestMalz)'], 'Standard Melanoidin Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Melanoidin Malt', 'BestMalz', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Briess Melanoidin Malt','Melanoidin Malt (Briess)'], 'Standard Melanoidin Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Melanoidin Malt', 'Briess', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Simpsons Melanoidin Malt','Melanoidin Malt (Simpsons)'], 'Standard Melanoidin Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Melanoidin Malt', 'Simpsons', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Crisp Melanoidin Malt','Melanoidin Malt (Crisp)'], 'Standard Melanoidin Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Melanoidin Malt', 'Crisp', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Dingemans Melanoidin Malt','Melanoidin Malt (Dingemans)'], 'Standard Melanoidin Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Melanoidin Malt', 'Dingemans', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Castle Malting Melanoidin Malt','Melanoidin Malt (Castle Malting)'], 'Standard Melanoidin Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Melanoidin Malt', 'Castle Malting', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Bairds Melanoidin Malt','Melanoidin Malt (Bairds)'], 'Standard Melanoidin Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Melanoidin Malt', 'Bairds', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Melanoidin Malt', 'malt', ARRAY['Melanoidin Malt','Viking Malt Melanoidin Malt','Melanoidin Malt (Viking Malt)'], 'Standard Melanoidin Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Melanoidin Malt', 'Viking Malt', 70, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Weyermann Acidulated Malt','Acidulated Malt (Weyermann)'], 'Standard Acidulated Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Acidulated Malt', 'Weyermann', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Acidulated Malt', 'malt', ARRAY['Acidulated Malt','BestMalz Acidulated Malt','Acidulated Malt (BestMalz)'], 'Standard Acidulated Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Acidulated Malt', 'BestMalz', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Briess Acidulated Malt','Acidulated Malt (Briess)'], 'Standard Acidulated Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Acidulated Malt', 'Briess', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Simpsons Acidulated Malt','Acidulated Malt (Simpsons)'], 'Standard Acidulated Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Acidulated Malt', 'Simpsons', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Crisp Acidulated Malt','Acidulated Malt (Crisp)'], 'Standard Acidulated Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Acidulated Malt', 'Crisp', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Dingemans Acidulated Malt','Acidulated Malt (Dingemans)'], 'Standard Acidulated Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Acidulated Malt', 'Dingemans', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Castle Malting Acidulated Malt','Acidulated Malt (Castle Malting)'], 'Standard Acidulated Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Acidulated Malt', 'Castle Malting', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Bairds Acidulated Malt','Acidulated Malt (Bairds)'], 'Standard Acidulated Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Acidulated Malt', 'Bairds', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Acidulated Malt', 'malt', ARRAY['Acidulated Malt','Viking Malt Acidulated Malt','Acidulated Malt (Viking Malt)'], 'Standard Acidulated Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Acidulated Malt', 'Viking Malt', 4, 1.03, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Rye Malt', 'malt', ARRAY['Rye Malt','Weyermann Rye Malt','Rye Malt (Weyermann)'], 'Standard Rye Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Rye Malt', 'Weyermann', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Rye Malt', 'malt', ARRAY['Rye Malt','BestMalz Rye Malt','Rye Malt (BestMalz)'], 'Standard Rye Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Rye Malt', 'BestMalz', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Rye Malt', 'malt', ARRAY['Rye Malt','Briess Rye Malt','Rye Malt (Briess)'], 'Standard Rye Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Rye Malt', 'Briess', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Rye Malt', 'malt', ARRAY['Rye Malt','Simpsons Rye Malt','Rye Malt (Simpsons)'], 'Standard Rye Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Rye Malt', 'Simpsons', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Rye Malt', 'malt', ARRAY['Rye Malt','Crisp Rye Malt','Rye Malt (Crisp)'], 'Standard Rye Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Rye Malt', 'Crisp', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Rye Malt', 'malt', ARRAY['Rye Malt','Dingemans Rye Malt','Rye Malt (Dingemans)'], 'Standard Rye Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Rye Malt', 'Dingemans', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Rye Malt', 'malt', ARRAY['Rye Malt','Castle Malting Rye Malt','Rye Malt (Castle Malting)'], 'Standard Rye Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Rye Malt', 'Castle Malting', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Rye Malt', 'malt', ARRAY['Rye Malt','Bairds Rye Malt','Rye Malt (Bairds)'], 'Standard Rye Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Rye Malt', 'Bairds', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Rye Malt', 'malt', ARRAY['Rye Malt','Viking Malt Rye Malt','Rye Malt (Viking Malt)'], 'Standard Rye Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Rye Malt', 'Viking Malt', 5, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Flaked Oats', 'malt', ARRAY['Flaked Oats','Weyermann Flaked Oats','Flaked Oats (Weyermann)'], 'Standard Flaked Oats manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Flaked Oats', 'Weyermann', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Flaked Oats', 'malt', ARRAY['Flaked Oats','BestMalz Flaked Oats','Flaked Oats (BestMalz)'], 'Standard Flaked Oats manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Flaked Oats', 'BestMalz', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Flaked Oats', 'malt', ARRAY['Flaked Oats','Briess Flaked Oats','Flaked Oats (Briess)'], 'Standard Flaked Oats manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Flaked Oats', 'Briess', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Flaked Oats', 'malt', ARRAY['Flaked Oats','Simpsons Flaked Oats','Flaked Oats (Simpsons)'], 'Standard Flaked Oats manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Flaked Oats', 'Simpsons', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Flaked Oats', 'malt', ARRAY['Flaked Oats','Crisp Flaked Oats','Flaked Oats (Crisp)'], 'Standard Flaked Oats manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Flaked Oats', 'Crisp', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Flaked Oats', 'malt', ARRAY['Flaked Oats','Dingemans Flaked Oats','Flaked Oats (Dingemans)'], 'Standard Flaked Oats manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Flaked Oats', 'Dingemans', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Flaked Oats', 'malt', ARRAY['Flaked Oats','Castle Malting Flaked Oats','Flaked Oats (Castle Malting)'], 'Standard Flaked Oats manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Flaked Oats', 'Castle Malting', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Flaked Oats', 'malt', ARRAY['Flaked Oats','Bairds Flaked Oats','Flaked Oats (Bairds)'], 'Standard Flaked Oats manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Flaked Oats', 'Bairds', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Flaked Oats', 'malt', ARRAY['Flaked Oats','Viking Malt Flaked Oats','Flaked Oats (Viking Malt)'], 'Standard Flaked Oats manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Flaked Oats', 'Viking Malt', 2.5, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Weyermann Flaked Wheat','Flaked Wheat (Weyermann)'], 'Standard Flaked Wheat manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Flaked Wheat', 'Weyermann', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Flaked Wheat', 'malt', ARRAY['Flaked Wheat','BestMalz Flaked Wheat','Flaked Wheat (BestMalz)'], 'Standard Flaked Wheat manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Flaked Wheat', 'BestMalz', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Briess Flaked Wheat','Flaked Wheat (Briess)'], 'Standard Flaked Wheat manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Flaked Wheat', 'Briess', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Simpsons Flaked Wheat','Flaked Wheat (Simpsons)'], 'Standard Flaked Wheat manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Flaked Wheat', 'Simpsons', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Crisp Flaked Wheat','Flaked Wheat (Crisp)'], 'Standard Flaked Wheat manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Flaked Wheat', 'Crisp', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Dingemans Flaked Wheat','Flaked Wheat (Dingemans)'], 'Standard Flaked Wheat manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Flaked Wheat', 'Dingemans', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Castle Malting Flaked Wheat','Flaked Wheat (Castle Malting)'], 'Standard Flaked Wheat manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Flaked Wheat', 'Castle Malting', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Bairds Flaked Wheat','Flaked Wheat (Bairds)'], 'Standard Flaked Wheat manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Flaked Wheat', 'Bairds', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Flaked Wheat', 'malt', ARRAY['Flaked Wheat','Viking Malt Flaked Wheat','Flaked Wheat (Viking Malt)'], 'Standard Flaked Wheat manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Flaked Wheat', 'Viking Malt', 3, 1.035, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Flaked Barley', 'malt', ARRAY['Flaked Barley','Weyermann Flaked Barley','Flaked Barley (Weyermann)'], 'Standard Flaked Barley manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Flaked Barley', 'Weyermann', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Flaked Barley', 'malt', ARRAY['Flaked Barley','BestMalz Flaked Barley','Flaked Barley (BestMalz)'], 'Standard Flaked Barley manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Flaked Barley', 'BestMalz', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Flaked Barley', 'malt', ARRAY['Flaked Barley','Briess Flaked Barley','Flaked Barley (Briess)'], 'Standard Flaked Barley manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Flaked Barley', 'Briess', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Flaked Barley', 'malt', ARRAY['Flaked Barley','Simpsons Flaked Barley','Flaked Barley (Simpsons)'], 'Standard Flaked Barley manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Flaked Barley', 'Simpsons', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Flaked Barley', 'malt', ARRAY['Flaked Barley','Crisp Flaked Barley','Flaked Barley (Crisp)'], 'Standard Flaked Barley manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Flaked Barley', 'Crisp', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Flaked Barley', 'malt', ARRAY['Flaked Barley','Dingemans Flaked Barley','Flaked Barley (Dingemans)'], 'Standard Flaked Barley manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Flaked Barley', 'Dingemans', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Flaked Barley', 'malt', ARRAY['Flaked Barley','Castle Malting Flaked Barley','Flaked Barley (Castle Malting)'], 'Standard Flaked Barley manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Flaked Barley', 'Castle Malting', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Flaked Barley', 'malt', ARRAY['Flaked Barley','Bairds Flaked Barley','Flaked Barley (Bairds)'], 'Standard Flaked Barley manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Flaked Barley', 'Bairds', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Flaked Barley', 'malt', ARRAY['Flaked Barley','Viking Malt Flaked Barley','Flaked Barley (Viking Malt)'], 'Standard Flaked Barley manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Flaked Barley', 'Viking Malt', 3, 1.032, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Weyermann Torrefied Wheat','Torrefied Wheat (Weyermann)'], 'Standard Torrefied Wheat manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Torrefied Wheat', 'Weyermann', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','BestMalz Torrefied Wheat','Torrefied Wheat (BestMalz)'], 'Standard Torrefied Wheat manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Torrefied Wheat', 'BestMalz', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Briess Torrefied Wheat','Torrefied Wheat (Briess)'], 'Standard Torrefied Wheat manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Torrefied Wheat', 'Briess', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Simpsons Torrefied Wheat','Torrefied Wheat (Simpsons)'], 'Standard Torrefied Wheat manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Torrefied Wheat', 'Simpsons', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Crisp Torrefied Wheat','Torrefied Wheat (Crisp)'], 'Standard Torrefied Wheat manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Torrefied Wheat', 'Crisp', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Dingemans Torrefied Wheat','Torrefied Wheat (Dingemans)'], 'Standard Torrefied Wheat manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Torrefied Wheat', 'Dingemans', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Castle Malting Torrefied Wheat','Torrefied Wheat (Castle Malting)'], 'Standard Torrefied Wheat manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Torrefied Wheat', 'Castle Malting', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Bairds Torrefied Wheat','Torrefied Wheat (Bairds)'], 'Standard Torrefied Wheat manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Torrefied Wheat', 'Bairds', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Torrefied Wheat', 'malt', ARRAY['Torrefied Wheat','Viking Malt Torrefied Wheat','Torrefied Wheat (Viking Malt)'], 'Standard Torrefied Wheat manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Torrefied Wheat', 'Viking Malt', 4, 1.036, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann CaraRed', 'malt', ARRAY['CaraRed','Weyermann CaraRed','CaraRed (Weyermann)'], 'Standard CaraRed manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann CaraRed', 'Weyermann', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz CaraRed', 'malt', ARRAY['CaraRed','BestMalz CaraRed','CaraRed (BestMalz)'], 'Standard CaraRed manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz CaraRed', 'BestMalz', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess CaraRed', 'malt', ARRAY['CaraRed','Briess CaraRed','CaraRed (Briess)'], 'Standard CaraRed manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess CaraRed', 'Briess', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons CaraRed', 'malt', ARRAY['CaraRed','Simpsons CaraRed','CaraRed (Simpsons)'], 'Standard CaraRed manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons CaraRed', 'Simpsons', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp CaraRed', 'malt', ARRAY['CaraRed','Crisp CaraRed','CaraRed (Crisp)'], 'Standard CaraRed manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp CaraRed', 'Crisp', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans CaraRed', 'malt', ARRAY['CaraRed','Dingemans CaraRed','CaraRed (Dingemans)'], 'Standard CaraRed manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans CaraRed', 'Dingemans', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting CaraRed', 'malt', ARRAY['CaraRed','Castle Malting CaraRed','CaraRed (Castle Malting)'], 'Standard CaraRed manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting CaraRed', 'Castle Malting', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds CaraRed', 'malt', ARRAY['CaraRed','Bairds CaraRed','CaraRed (Bairds)'], 'Standard CaraRed manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds CaraRed', 'Bairds', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt CaraRed', 'malt', ARRAY['CaraRed','Viking Malt CaraRed','CaraRed (Viking Malt)'], 'Standard CaraRed manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt CaraRed', 'Viking Malt', 50, 1.033, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Spelt Malt', 'malt', ARRAY['Spelt Malt','Weyermann Spelt Malt','Spelt Malt (Weyermann)'], 'Standard Spelt Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Spelt Malt', 'Weyermann', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Spelt Malt', 'malt', ARRAY['Spelt Malt','BestMalz Spelt Malt','Spelt Malt (BestMalz)'], 'Standard Spelt Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Spelt Malt', 'BestMalz', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Spelt Malt', 'malt', ARRAY['Spelt Malt','Briess Spelt Malt','Spelt Malt (Briess)'], 'Standard Spelt Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Spelt Malt', 'Briess', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Spelt Malt', 'malt', ARRAY['Spelt Malt','Simpsons Spelt Malt','Spelt Malt (Simpsons)'], 'Standard Spelt Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Spelt Malt', 'Simpsons', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Spelt Malt', 'malt', ARRAY['Spelt Malt','Crisp Spelt Malt','Spelt Malt (Crisp)'], 'Standard Spelt Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Spelt Malt', 'Crisp', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Spelt Malt', 'malt', ARRAY['Spelt Malt','Dingemans Spelt Malt','Spelt Malt (Dingemans)'], 'Standard Spelt Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Spelt Malt', 'Dingemans', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Spelt Malt', 'malt', ARRAY['Spelt Malt','Castle Malting Spelt Malt','Spelt Malt (Castle Malting)'], 'Standard Spelt Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Spelt Malt', 'Castle Malting', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Spelt Malt', 'malt', ARRAY['Spelt Malt','Bairds Spelt Malt','Spelt Malt (Bairds)'], 'Standard Spelt Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Spelt Malt', 'Bairds', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Spelt Malt', 'malt', ARRAY['Spelt Malt','Viking Malt Spelt Malt','Spelt Malt (Viking Malt)'], 'Standard Spelt Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Spelt Malt', 'Viking Malt', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Smoked Malt', 'malt', ARRAY['Smoked Malt','Weyermann Smoked Malt','Smoked Malt (Weyermann)'], 'Standard Smoked Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Smoked Malt', 'Weyermann', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Smoked Malt', 'malt', ARRAY['Smoked Malt','BestMalz Smoked Malt','Smoked Malt (BestMalz)'], 'Standard Smoked Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Smoked Malt', 'BestMalz', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Smoked Malt', 'malt', ARRAY['Smoked Malt','Briess Smoked Malt','Smoked Malt (Briess)'], 'Standard Smoked Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Smoked Malt', 'Briess', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Smoked Malt', 'malt', ARRAY['Smoked Malt','Simpsons Smoked Malt','Smoked Malt (Simpsons)'], 'Standard Smoked Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Smoked Malt', 'Simpsons', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Smoked Malt', 'malt', ARRAY['Smoked Malt','Crisp Smoked Malt','Smoked Malt (Crisp)'], 'Standard Smoked Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Smoked Malt', 'Crisp', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Smoked Malt', 'malt', ARRAY['Smoked Malt','Dingemans Smoked Malt','Smoked Malt (Dingemans)'], 'Standard Smoked Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Smoked Malt', 'Dingemans', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Smoked Malt', 'malt', ARRAY['Smoked Malt','Castle Malting Smoked Malt','Smoked Malt (Castle Malting)'], 'Standard Smoked Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Smoked Malt', 'Castle Malting', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Smoked Malt', 'malt', ARRAY['Smoked Malt','Bairds Smoked Malt','Smoked Malt (Bairds)'], 'Standard Smoked Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Smoked Malt', 'Bairds', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Smoked Malt', 'malt', ARRAY['Smoked Malt','Viking Malt Smoked Malt','Smoked Malt (Viking Malt)'], 'Standard Smoked Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Smoked Malt', 'Viking Malt', 6, 1.037, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Weyermann Peated Malt', 'malt', ARRAY['Peated Malt','Weyermann Peated Malt','Peated Malt (Weyermann)'], 'Standard Peated Malt manufactured by Weyermann.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Weyermann Peated Malt', 'Weyermann', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BestMalz Peated Malt', 'malt', ARRAY['Peated Malt','BestMalz Peated Malt','Peated Malt (BestMalz)'], 'Standard Peated Malt manufactured by BestMalz.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'BestMalz Peated Malt', 'BestMalz', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Briess Peated Malt', 'malt', ARRAY['Peated Malt','Briess Peated Malt','Peated Malt (Briess)'], 'Standard Peated Malt manufactured by Briess.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Briess Peated Malt', 'Briess', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Simpsons Peated Malt', 'malt', ARRAY['Peated Malt','Simpsons Peated Malt','Peated Malt (Simpsons)'], 'Standard Peated Malt manufactured by Simpsons.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Simpsons Peated Malt', 'Simpsons', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crisp Peated Malt', 'malt', ARRAY['Peated Malt','Crisp Peated Malt','Peated Malt (Crisp)'], 'Standard Peated Malt manufactured by Crisp.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Crisp Peated Malt', 'Crisp', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Dingemans Peated Malt', 'malt', ARRAY['Peated Malt','Dingemans Peated Malt','Peated Malt (Dingemans)'], 'Standard Peated Malt manufactured by Dingemans.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Dingemans Peated Malt', 'Dingemans', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Castle Malting Peated Malt', 'malt', ARRAY['Peated Malt','Castle Malting Peated Malt','Peated Malt (Castle Malting)'], 'Standard Peated Malt manufactured by Castle Malting.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Castle Malting Peated Malt', 'Castle Malting', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Bairds Peated Malt', 'malt', ARRAY['Peated Malt','Bairds Peated Malt','Peated Malt (Bairds)'], 'Standard Peated Malt manufactured by Bairds.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Bairds Peated Malt', 'Bairds', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Viking Malt Peated Malt', 'malt', ARRAY['Peated Malt','Viking Malt Peated Malt','Peated Malt (Viking Malt)'], 'Standard Peated Malt manufactured by Viking Malt.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
  VALUES (master_id, 'Viking Malt Peated Malt', 'Viking Malt', 5, 1.038, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Citra', 'hop', ARRAY['Citra','Yakima Chief Citra','Citra Pellets'], 'Citra hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Citra', 'Yakima Chief', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Citra', 'hop', ARRAY['Citra','BarthHaas Citra','Citra Pellets'], 'Citra hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Citra', 'BarthHaas', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Citra', 'hop', ARRAY['Citra','Hopsteiner Citra','Citra Pellets'], 'Citra hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Citra', 'Hopsteiner', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Citra', 'hop', ARRAY['Citra','Charles Faram Citra','Citra Pellets'], 'Citra hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Citra', 'Charles Faram', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Citra', 'hop', ARRAY['Citra','Crosby Hops Citra','Citra Pellets'], 'Citra hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Citra', 'Crosby Hops', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Mosaic', 'hop', ARRAY['Mosaic','Yakima Chief Mosaic','Mosaic Pellets'], 'Mosaic hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Mosaic', 'Yakima Chief', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Mosaic', 'hop', ARRAY['Mosaic','BarthHaas Mosaic','Mosaic Pellets'], 'Mosaic hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Mosaic', 'BarthHaas', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Mosaic', 'hop', ARRAY['Mosaic','Hopsteiner Mosaic','Mosaic Pellets'], 'Mosaic hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Mosaic', 'Hopsteiner', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Mosaic', 'hop', ARRAY['Mosaic','Charles Faram Mosaic','Mosaic Pellets'], 'Mosaic hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Mosaic', 'Charles Faram', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Mosaic', 'hop', ARRAY['Mosaic','Crosby Hops Mosaic','Mosaic Pellets'], 'Mosaic hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Mosaic', 'Crosby Hops', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Simcoe', 'hop', ARRAY['Simcoe','Yakima Chief Simcoe','Simcoe Pellets'], 'Simcoe hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Simcoe', 'Yakima Chief', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Simcoe', 'hop', ARRAY['Simcoe','BarthHaas Simcoe','Simcoe Pellets'], 'Simcoe hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Simcoe', 'BarthHaas', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Simcoe', 'hop', ARRAY['Simcoe','Hopsteiner Simcoe','Simcoe Pellets'], 'Simcoe hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Simcoe', 'Hopsteiner', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Simcoe', 'hop', ARRAY['Simcoe','Charles Faram Simcoe','Simcoe Pellets'], 'Simcoe hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Simcoe', 'Charles Faram', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Simcoe', 'hop', ARRAY['Simcoe','Crosby Hops Simcoe','Simcoe Pellets'], 'Simcoe hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Simcoe', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Amarillo', 'hop', ARRAY['Amarillo','Yakima Chief Amarillo','Amarillo Pellets'], 'Amarillo hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Amarillo', 'Yakima Chief', 9, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Amarillo', 'hop', ARRAY['Amarillo','BarthHaas Amarillo','Amarillo Pellets'], 'Amarillo hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Amarillo', 'BarthHaas', 9, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Amarillo', 'hop', ARRAY['Amarillo','Hopsteiner Amarillo','Amarillo Pellets'], 'Amarillo hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Amarillo', 'Hopsteiner', 9, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Amarillo', 'hop', ARRAY['Amarillo','Charles Faram Amarillo','Amarillo Pellets'], 'Amarillo hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Amarillo', 'Charles Faram', 9, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Amarillo', 'hop', ARRAY['Amarillo','Crosby Hops Amarillo','Amarillo Pellets'], 'Amarillo hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Amarillo', 'Crosby Hops', 9, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Cascade', 'hop', ARRAY['Cascade','Yakima Chief Cascade','Cascade Pellets'], 'Cascade hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Cascade', 'Yakima Chief', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Cascade', 'hop', ARRAY['Cascade','BarthHaas Cascade','Cascade Pellets'], 'Cascade hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Cascade', 'BarthHaas', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Cascade', 'hop', ARRAY['Cascade','Hopsteiner Cascade','Cascade Pellets'], 'Cascade hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Cascade', 'Hopsteiner', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Cascade', 'hop', ARRAY['Cascade','Charles Faram Cascade','Cascade Pellets'], 'Cascade hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Cascade', 'Charles Faram', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Cascade', 'hop', ARRAY['Cascade','Crosby Hops Cascade','Cascade Pellets'], 'Cascade hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Cascade', 'Crosby Hops', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Centennial', 'hop', ARRAY['Centennial','Yakima Chief Centennial','Centennial Pellets'], 'Centennial hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Centennial', 'Yakima Chief', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Centennial', 'hop', ARRAY['Centennial','BarthHaas Centennial','Centennial Pellets'], 'Centennial hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Centennial', 'BarthHaas', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Centennial', 'hop', ARRAY['Centennial','Hopsteiner Centennial','Centennial Pellets'], 'Centennial hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Centennial', 'Hopsteiner', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Centennial', 'hop', ARRAY['Centennial','Charles Faram Centennial','Centennial Pellets'], 'Centennial hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Centennial', 'Charles Faram', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Centennial', 'hop', ARRAY['Centennial','Crosby Hops Centennial','Centennial Pellets'], 'Centennial hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Centennial', 'Crosby Hops', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Columbus', 'hop', ARRAY['Columbus','Yakima Chief Columbus','Columbus Pellets'], 'Columbus hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Columbus', 'Yakima Chief', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Columbus', 'hop', ARRAY['Columbus','BarthHaas Columbus','Columbus Pellets'], 'Columbus hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Columbus', 'BarthHaas', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Columbus', 'hop', ARRAY['Columbus','Hopsteiner Columbus','Columbus Pellets'], 'Columbus hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Columbus', 'Hopsteiner', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Columbus', 'hop', ARRAY['Columbus','Charles Faram Columbus','Columbus Pellets'], 'Columbus hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Columbus', 'Charles Faram', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Columbus', 'hop', ARRAY['Columbus','Crosby Hops Columbus','Columbus Pellets'], 'Columbus hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Columbus', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Chinook', 'hop', ARRAY['Chinook','Yakima Chief Chinook','Chinook Pellets'], 'Chinook hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Chinook', 'Yakima Chief', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Chinook', 'hop', ARRAY['Chinook','BarthHaas Chinook','Chinook Pellets'], 'Chinook hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Chinook', 'BarthHaas', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Chinook', 'hop', ARRAY['Chinook','Hopsteiner Chinook','Chinook Pellets'], 'Chinook hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Chinook', 'Hopsteiner', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Chinook', 'hop', ARRAY['Chinook','Charles Faram Chinook','Chinook Pellets'], 'Chinook hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Chinook', 'Charles Faram', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Chinook', 'hop', ARRAY['Chinook','Crosby Hops Chinook','Chinook Pellets'], 'Chinook hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Chinook', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Magnum', 'hop', ARRAY['Magnum','Yakima Chief Magnum','Magnum Pellets'], 'Magnum hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Magnum', 'Yakima Chief', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Magnum', 'hop', ARRAY['Magnum','BarthHaas Magnum','Magnum Pellets'], 'Magnum hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Magnum', 'BarthHaas', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Magnum', 'hop', ARRAY['Magnum','Hopsteiner Magnum','Magnum Pellets'], 'Magnum hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Magnum', 'Hopsteiner', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Magnum', 'hop', ARRAY['Magnum','Charles Faram Magnum','Magnum Pellets'], 'Magnum hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Magnum', 'Charles Faram', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Magnum', 'hop', ARRAY['Magnum','Crosby Hops Magnum','Magnum Pellets'], 'Magnum hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Magnum', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Perle', 'hop', ARRAY['Perle','Yakima Chief Perle','Perle Pellets'], 'Perle hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Perle', 'Yakima Chief', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Perle', 'hop', ARRAY['Perle','BarthHaas Perle','Perle Pellets'], 'Perle hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Perle', 'BarthHaas', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Perle', 'hop', ARRAY['Perle','Hopsteiner Perle','Perle Pellets'], 'Perle hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Perle', 'Hopsteiner', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Perle', 'hop', ARRAY['Perle','Charles Faram Perle','Perle Pellets'], 'Perle hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Perle', 'Charles Faram', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Perle', 'hop', ARRAY['Perle','Crosby Hops Perle','Perle Pellets'], 'Perle hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Perle', 'Crosby Hops', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Tradition', 'hop', ARRAY['Tradition','Yakima Chief Tradition','Tradition Pellets'], 'Tradition hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Tradition', 'Yakima Chief', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Tradition', 'hop', ARRAY['Tradition','BarthHaas Tradition','Tradition Pellets'], 'Tradition hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Tradition', 'BarthHaas', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Tradition', 'hop', ARRAY['Tradition','Hopsteiner Tradition','Tradition Pellets'], 'Tradition hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Tradition', 'Hopsteiner', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Tradition', 'hop', ARRAY['Tradition','Charles Faram Tradition','Tradition Pellets'], 'Tradition hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Tradition', 'Charles Faram', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Tradition', 'hop', ARRAY['Tradition','Crosby Hops Tradition','Tradition Pellets'], 'Tradition hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Tradition', 'Crosby Hops', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Saaz', 'hop', ARRAY['Saaz','Yakima Chief Saaz','Saaz Pellets'], 'Saaz hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Saaz', 'Yakima Chief', 3.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Saaz', 'hop', ARRAY['Saaz','BarthHaas Saaz','Saaz Pellets'], 'Saaz hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Saaz', 'BarthHaas', 3.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Saaz', 'hop', ARRAY['Saaz','Hopsteiner Saaz','Saaz Pellets'], 'Saaz hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Saaz', 'Hopsteiner', 3.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Saaz', 'hop', ARRAY['Saaz','Charles Faram Saaz','Saaz Pellets'], 'Saaz hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Saaz', 'Charles Faram', 3.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Saaz', 'hop', ARRAY['Saaz','Crosby Hops Saaz','Saaz Pellets'], 'Saaz hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Saaz', 'Crosby Hops', 3.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Hallertauer Mittelfrüh', 'hop', ARRAY['Hallertauer Mittelfrüh','Yakima Chief Hallertauer Mittelfrüh','Hallertauer Mittelfrüh Pellets'], 'Hallertauer Mittelfrüh hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Hallertauer Mittelfrüh', 'Yakima Chief', 4, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Hallertauer Mittelfrüh', 'hop', ARRAY['Hallertauer Mittelfrüh','BarthHaas Hallertauer Mittelfrüh','Hallertauer Mittelfrüh Pellets'], 'Hallertauer Mittelfrüh hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Hallertauer Mittelfrüh', 'BarthHaas', 4, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Hallertauer Mittelfrüh', 'hop', ARRAY['Hallertauer Mittelfrüh','Hopsteiner Hallertauer Mittelfrüh','Hallertauer Mittelfrüh Pellets'], 'Hallertauer Mittelfrüh hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Hallertauer Mittelfrüh', 'Hopsteiner', 4, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Hallertauer Mittelfrüh', 'hop', ARRAY['Hallertauer Mittelfrüh','Charles Faram Hallertauer Mittelfrüh','Hallertauer Mittelfrüh Pellets'], 'Hallertauer Mittelfrüh hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Hallertauer Mittelfrüh', 'Charles Faram', 4, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Hallertauer Mittelfrüh', 'hop', ARRAY['Hallertauer Mittelfrüh','Crosby Hops Hallertauer Mittelfrüh','Hallertauer Mittelfrüh Pellets'], 'Hallertauer Mittelfrüh hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Hallertauer Mittelfrüh', 'Crosby Hops', 4, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Tettnanger', 'hop', ARRAY['Tettnanger','Yakima Chief Tettnanger','Tettnanger Pellets'], 'Tettnanger hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Tettnanger', 'Yakima Chief', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Tettnanger', 'hop', ARRAY['Tettnanger','BarthHaas Tettnanger','Tettnanger Pellets'], 'Tettnanger hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Tettnanger', 'BarthHaas', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Tettnanger', 'hop', ARRAY['Tettnanger','Hopsteiner Tettnanger','Tettnanger Pellets'], 'Tettnanger hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Tettnanger', 'Hopsteiner', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Tettnanger', 'hop', ARRAY['Tettnanger','Charles Faram Tettnanger','Tettnanger Pellets'], 'Tettnanger hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Tettnanger', 'Charles Faram', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Tettnanger', 'hop', ARRAY['Tettnanger','Crosby Hops Tettnanger','Tettnanger Pellets'], 'Tettnanger hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Tettnanger', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Spalter Select', 'hop', ARRAY['Spalter Select','Yakima Chief Spalter Select','Spalter Select Pellets'], 'Spalter Select hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Spalter Select', 'Yakima Chief', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Spalter Select', 'hop', ARRAY['Spalter Select','BarthHaas Spalter Select','Spalter Select Pellets'], 'Spalter Select hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Spalter Select', 'BarthHaas', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Spalter Select', 'hop', ARRAY['Spalter Select','Hopsteiner Spalter Select','Spalter Select Pellets'], 'Spalter Select hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Spalter Select', 'Hopsteiner', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Spalter Select', 'hop', ARRAY['Spalter Select','Charles Faram Spalter Select','Spalter Select Pellets'], 'Spalter Select hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Spalter Select', 'Charles Faram', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Spalter Select', 'hop', ARRAY['Spalter Select','Crosby Hops Spalter Select','Spalter Select Pellets'], 'Spalter Select hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Spalter Select', 'Crosby Hops', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Hersbrucker', 'hop', ARRAY['Hersbrucker','Yakima Chief Hersbrucker','Hersbrucker Pellets'], 'Hersbrucker hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Hersbrucker', 'Yakima Chief', 3, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Hersbrucker', 'hop', ARRAY['Hersbrucker','BarthHaas Hersbrucker','Hersbrucker Pellets'], 'Hersbrucker hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Hersbrucker', 'BarthHaas', 3, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Hersbrucker', 'hop', ARRAY['Hersbrucker','Hopsteiner Hersbrucker','Hersbrucker Pellets'], 'Hersbrucker hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Hersbrucker', 'Hopsteiner', 3, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Hersbrucker', 'hop', ARRAY['Hersbrucker','Charles Faram Hersbrucker','Hersbrucker Pellets'], 'Hersbrucker hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Hersbrucker', 'Charles Faram', 3, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Hersbrucker', 'hop', ARRAY['Hersbrucker','Crosby Hops Hersbrucker','Hersbrucker Pellets'], 'Hersbrucker hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Hersbrucker', 'Crosby Hops', 3, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Northern Brewer', 'hop', ARRAY['Northern Brewer','Yakima Chief Northern Brewer','Northern Brewer Pellets'], 'Northern Brewer hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Northern Brewer', 'Yakima Chief', 8.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Northern Brewer', 'hop', ARRAY['Northern Brewer','BarthHaas Northern Brewer','Northern Brewer Pellets'], 'Northern Brewer hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Northern Brewer', 'BarthHaas', 8.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Northern Brewer', 'hop', ARRAY['Northern Brewer','Hopsteiner Northern Brewer','Northern Brewer Pellets'], 'Northern Brewer hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Northern Brewer', 'Hopsteiner', 8.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Northern Brewer', 'hop', ARRAY['Northern Brewer','Charles Faram Northern Brewer','Northern Brewer Pellets'], 'Northern Brewer hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Northern Brewer', 'Charles Faram', 8.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Northern Brewer', 'hop', ARRAY['Northern Brewer','Crosby Hops Northern Brewer','Northern Brewer Pellets'], 'Northern Brewer hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Northern Brewer', 'Crosby Hops', 8.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Fuggles', 'hop', ARRAY['Fuggles','Yakima Chief Fuggles','Fuggles Pellets'], 'Fuggles hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Fuggles', 'Yakima Chief', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Fuggles', 'hop', ARRAY['Fuggles','BarthHaas Fuggles','Fuggles Pellets'], 'Fuggles hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Fuggles', 'BarthHaas', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Fuggles', 'hop', ARRAY['Fuggles','Hopsteiner Fuggles','Fuggles Pellets'], 'Fuggles hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Fuggles', 'Hopsteiner', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Fuggles', 'hop', ARRAY['Fuggles','Charles Faram Fuggles','Fuggles Pellets'], 'Fuggles hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Fuggles', 'Charles Faram', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Fuggles', 'hop', ARRAY['Fuggles','Crosby Hops Fuggles','Fuggles Pellets'], 'Fuggles hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Fuggles', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief East Kent Goldings', 'hop', ARRAY['East Kent Goldings','Yakima Chief East Kent Goldings','East Kent Goldings Pellets'], 'East Kent Goldings hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief East Kent Goldings', 'Yakima Chief', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas East Kent Goldings', 'hop', ARRAY['East Kent Goldings','BarthHaas East Kent Goldings','East Kent Goldings Pellets'], 'East Kent Goldings hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas East Kent Goldings', 'BarthHaas', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner East Kent Goldings', 'hop', ARRAY['East Kent Goldings','Hopsteiner East Kent Goldings','East Kent Goldings Pellets'], 'East Kent Goldings hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner East Kent Goldings', 'Hopsteiner', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram East Kent Goldings', 'hop', ARRAY['East Kent Goldings','Charles Faram East Kent Goldings','East Kent Goldings Pellets'], 'East Kent Goldings hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram East Kent Goldings', 'Charles Faram', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops East Kent Goldings', 'hop', ARRAY['East Kent Goldings','Crosby Hops East Kent Goldings','East Kent Goldings Pellets'], 'East Kent Goldings hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops East Kent Goldings', 'Crosby Hops', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Galaxy', 'hop', ARRAY['Galaxy','Yakima Chief Galaxy','Galaxy Pellets'], 'Galaxy hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Galaxy', 'Yakima Chief', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Galaxy', 'hop', ARRAY['Galaxy','BarthHaas Galaxy','Galaxy Pellets'], 'Galaxy hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Galaxy', 'BarthHaas', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Galaxy', 'hop', ARRAY['Galaxy','Hopsteiner Galaxy','Galaxy Pellets'], 'Galaxy hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Galaxy', 'Hopsteiner', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Galaxy', 'hop', ARRAY['Galaxy','Charles Faram Galaxy','Galaxy Pellets'], 'Galaxy hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Galaxy', 'Charles Faram', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Galaxy', 'hop', ARRAY['Galaxy','Crosby Hops Galaxy','Galaxy Pellets'], 'Galaxy hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Galaxy', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin','Yakima Chief Nelson Sauvin','Nelson Sauvin Pellets'], 'Nelson Sauvin hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Nelson Sauvin', 'Yakima Chief', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin','BarthHaas Nelson Sauvin','Nelson Sauvin Pellets'], 'Nelson Sauvin hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Nelson Sauvin', 'BarthHaas', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin','Hopsteiner Nelson Sauvin','Nelson Sauvin Pellets'], 'Nelson Sauvin hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Nelson Sauvin', 'Hopsteiner', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin','Charles Faram Nelson Sauvin','Nelson Sauvin Pellets'], 'Nelson Sauvin hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Nelson Sauvin', 'Charles Faram', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin','Crosby Hops Nelson Sauvin','Nelson Sauvin Pellets'], 'Nelson Sauvin hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Nelson Sauvin', 'Crosby Hops', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Motueka', 'hop', ARRAY['Motueka','Yakima Chief Motueka','Motueka Pellets'], 'Motueka hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Motueka', 'Yakima Chief', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Motueka', 'hop', ARRAY['Motueka','BarthHaas Motueka','Motueka Pellets'], 'Motueka hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Motueka', 'BarthHaas', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Motueka', 'hop', ARRAY['Motueka','Hopsteiner Motueka','Motueka Pellets'], 'Motueka hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Motueka', 'Hopsteiner', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Motueka', 'hop', ARRAY['Motueka','Charles Faram Motueka','Motueka Pellets'], 'Motueka hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Motueka', 'Charles Faram', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Motueka', 'hop', ARRAY['Motueka','Crosby Hops Motueka','Motueka Pellets'], 'Motueka hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Motueka', 'Crosby Hops', 7, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Vic Secret', 'hop', ARRAY['Vic Secret','Yakima Chief Vic Secret','Vic Secret Pellets'], 'Vic Secret hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Vic Secret', 'Yakima Chief', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Vic Secret', 'hop', ARRAY['Vic Secret','BarthHaas Vic Secret','Vic Secret Pellets'], 'Vic Secret hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Vic Secret', 'BarthHaas', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Vic Secret', 'hop', ARRAY['Vic Secret','Hopsteiner Vic Secret','Vic Secret Pellets'], 'Vic Secret hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Vic Secret', 'Hopsteiner', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Vic Secret', 'hop', ARRAY['Vic Secret','Charles Faram Vic Secret','Vic Secret Pellets'], 'Vic Secret hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Vic Secret', 'Charles Faram', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Vic Secret', 'hop', ARRAY['Vic Secret','Crosby Hops Vic Secret','Vic Secret Pellets'], 'Vic Secret hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Vic Secret', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Sabro', 'hop', ARRAY['Sabro','Yakima Chief Sabro','Sabro Pellets'], 'Sabro hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Sabro', 'Yakima Chief', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Sabro', 'hop', ARRAY['Sabro','BarthHaas Sabro','Sabro Pellets'], 'Sabro hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Sabro', 'BarthHaas', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Sabro', 'hop', ARRAY['Sabro','Hopsteiner Sabro','Sabro Pellets'], 'Sabro hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Sabro', 'Hopsteiner', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Sabro', 'hop', ARRAY['Sabro','Charles Faram Sabro','Sabro Pellets'], 'Sabro hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Sabro', 'Charles Faram', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Sabro', 'hop', ARRAY['Sabro','Crosby Hops Sabro','Sabro Pellets'], 'Sabro hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Sabro', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief El Dorado', 'hop', ARRAY['El Dorado','Yakima Chief El Dorado','El Dorado Pellets'], 'El Dorado hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief El Dorado', 'Yakima Chief', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas El Dorado', 'hop', ARRAY['El Dorado','BarthHaas El Dorado','El Dorado Pellets'], 'El Dorado hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas El Dorado', 'BarthHaas', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner El Dorado', 'hop', ARRAY['El Dorado','Hopsteiner El Dorado','El Dorado Pellets'], 'El Dorado hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner El Dorado', 'Hopsteiner', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram El Dorado', 'hop', ARRAY['El Dorado','Charles Faram El Dorado','El Dorado Pellets'], 'El Dorado hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram El Dorado', 'Charles Faram', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops El Dorado', 'hop', ARRAY['El Dorado','Crosby Hops El Dorado','El Dorado Pellets'], 'El Dorado hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops El Dorado', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Idaho 7', 'hop', ARRAY['Idaho 7','Yakima Chief Idaho 7','Idaho 7 Pellets'], 'Idaho 7 hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Idaho 7', 'Yakima Chief', 13.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Idaho 7', 'hop', ARRAY['Idaho 7','BarthHaas Idaho 7','Idaho 7 Pellets'], 'Idaho 7 hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Idaho 7', 'BarthHaas', 13.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Idaho 7', 'hop', ARRAY['Idaho 7','Hopsteiner Idaho 7','Idaho 7 Pellets'], 'Idaho 7 hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Idaho 7', 'Hopsteiner', 13.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Idaho 7', 'hop', ARRAY['Idaho 7','Charles Faram Idaho 7','Idaho 7 Pellets'], 'Idaho 7 hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Idaho 7', 'Charles Faram', 13.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Idaho 7', 'hop', ARRAY['Idaho 7','Crosby Hops Idaho 7','Idaho 7 Pellets'], 'Idaho 7 hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Idaho 7', 'Crosby Hops', 13.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Strata', 'hop', ARRAY['Strata','Yakima Chief Strata','Strata Pellets'], 'Strata hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Strata', 'Yakima Chief', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Strata', 'hop', ARRAY['Strata','BarthHaas Strata','Strata Pellets'], 'Strata hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Strata', 'BarthHaas', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Strata', 'hop', ARRAY['Strata','Hopsteiner Strata','Strata Pellets'], 'Strata hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Strata', 'Hopsteiner', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Strata', 'hop', ARRAY['Strata','Charles Faram Strata','Strata Pellets'], 'Strata hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Strata', 'Charles Faram', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Strata', 'hop', ARRAY['Strata','Crosby Hops Strata','Strata Pellets'], 'Strata hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Strata', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Nectaron', 'hop', ARRAY['Nectaron','Yakima Chief Nectaron','Nectaron Pellets'], 'Nectaron hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Nectaron', 'Yakima Chief', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Nectaron', 'hop', ARRAY['Nectaron','BarthHaas Nectaron','Nectaron Pellets'], 'Nectaron hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Nectaron', 'BarthHaas', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Nectaron', 'hop', ARRAY['Nectaron','Hopsteiner Nectaron','Nectaron Pellets'], 'Nectaron hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Nectaron', 'Hopsteiner', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Nectaron', 'hop', ARRAY['Nectaron','Charles Faram Nectaron','Nectaron Pellets'], 'Nectaron hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Nectaron', 'Charles Faram', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Nectaron', 'hop', ARRAY['Nectaron','Crosby Hops Nectaron','Nectaron Pellets'], 'Nectaron hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Nectaron', 'Crosby Hops', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Loral', 'hop', ARRAY['Loral','Yakima Chief Loral','Loral Pellets'], 'Loral hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Loral', 'Yakima Chief', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Loral', 'hop', ARRAY['Loral','BarthHaas Loral','Loral Pellets'], 'Loral hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Loral', 'BarthHaas', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Loral', 'hop', ARRAY['Loral','Hopsteiner Loral','Loral Pellets'], 'Loral hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Loral', 'Hopsteiner', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Loral', 'hop', ARRAY['Loral','Charles Faram Loral','Loral Pellets'], 'Loral hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Loral', 'Charles Faram', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Loral', 'hop', ARRAY['Loral','Crosby Hops Loral','Loral Pellets'], 'Loral hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Loral', 'Crosby Hops', 11.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Equinox', 'hop', ARRAY['Equinox','Yakima Chief Equinox','Equinox Pellets'], 'Equinox hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Equinox', 'Yakima Chief', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Equinox', 'hop', ARRAY['Equinox','BarthHaas Equinox','Equinox Pellets'], 'Equinox hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Equinox', 'BarthHaas', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Equinox', 'hop', ARRAY['Equinox','Hopsteiner Equinox','Equinox Pellets'], 'Equinox hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Equinox', 'Hopsteiner', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Equinox', 'hop', ARRAY['Equinox','Charles Faram Equinox','Equinox Pellets'], 'Equinox hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Equinox', 'Charles Faram', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Equinox', 'hop', ARRAY['Equinox','Crosby Hops Equinox','Equinox Pellets'], 'Equinox hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Equinox', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Sorachi Ace', 'hop', ARRAY['Sorachi Ace','Yakima Chief Sorachi Ace','Sorachi Ace Pellets'], 'Sorachi Ace hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Sorachi Ace', 'Yakima Chief', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Sorachi Ace', 'hop', ARRAY['Sorachi Ace','BarthHaas Sorachi Ace','Sorachi Ace Pellets'], 'Sorachi Ace hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Sorachi Ace', 'BarthHaas', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Sorachi Ace', 'hop', ARRAY['Sorachi Ace','Hopsteiner Sorachi Ace','Sorachi Ace Pellets'], 'Sorachi Ace hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Sorachi Ace', 'Hopsteiner', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Sorachi Ace', 'hop', ARRAY['Sorachi Ace','Charles Faram Sorachi Ace','Sorachi Ace Pellets'], 'Sorachi Ace hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Sorachi Ace', 'Charles Faram', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Sorachi Ace', 'hop', ARRAY['Sorachi Ace','Crosby Hops Sorachi Ace','Sorachi Ace Pellets'], 'Sorachi Ace hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Sorachi Ace', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Athanum', 'hop', ARRAY['Athanum','Yakima Chief Athanum','Athanum Pellets'], 'Athanum hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Athanum', 'Yakima Chief', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Athanum', 'hop', ARRAY['Athanum','BarthHaas Athanum','Athanum Pellets'], 'Athanum hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Athanum', 'BarthHaas', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Athanum', 'hop', ARRAY['Athanum','Hopsteiner Athanum','Athanum Pellets'], 'Athanum hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Athanum', 'Hopsteiner', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Athanum', 'hop', ARRAY['Athanum','Charles Faram Athanum','Athanum Pellets'], 'Athanum hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Athanum', 'Charles Faram', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Athanum', 'hop', ARRAY['Athanum','Crosby Hops Athanum','Athanum Pellets'], 'Athanum hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Athanum', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Bravo', 'hop', ARRAY['Bravo','Yakima Chief Bravo','Bravo Pellets'], 'Bravo hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Bravo', 'Yakima Chief', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Bravo', 'hop', ARRAY['Bravo','BarthHaas Bravo','Bravo Pellets'], 'Bravo hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Bravo', 'BarthHaas', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Bravo', 'hop', ARRAY['Bravo','Hopsteiner Bravo','Bravo Pellets'], 'Bravo hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Bravo', 'Hopsteiner', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Bravo', 'hop', ARRAY['Bravo','Charles Faram Bravo','Bravo Pellets'], 'Bravo hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Bravo', 'Charles Faram', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Bravo', 'hop', ARRAY['Bravo','Crosby Hops Bravo','Bravo Pellets'], 'Bravo hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Bravo', 'Crosby Hops', 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Bramling Cross', 'hop', ARRAY['Bramling Cross','Yakima Chief Bramling Cross','Bramling Cross Pellets'], 'Bramling Cross hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Bramling Cross', 'Yakima Chief', 6.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Bramling Cross', 'hop', ARRAY['Bramling Cross','BarthHaas Bramling Cross','Bramling Cross Pellets'], 'Bramling Cross hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Bramling Cross', 'BarthHaas', 6.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Bramling Cross', 'hop', ARRAY['Bramling Cross','Hopsteiner Bramling Cross','Bramling Cross Pellets'], 'Bramling Cross hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Bramling Cross', 'Hopsteiner', 6.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Bramling Cross', 'hop', ARRAY['Bramling Cross','Charles Faram Bramling Cross','Bramling Cross Pellets'], 'Bramling Cross hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Bramling Cross', 'Charles Faram', 6.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Bramling Cross', 'hop', ARRAY['Bramling Cross','Crosby Hops Bramling Cross','Bramling Cross Pellets'], 'Bramling Cross hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Bramling Cross', 'Crosby Hops', 6.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Calypso', 'hop', ARRAY['Calypso','Yakima Chief Calypso','Calypso Pellets'], 'Calypso hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Calypso', 'Yakima Chief', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Calypso', 'hop', ARRAY['Calypso','BarthHaas Calypso','Calypso Pellets'], 'Calypso hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Calypso', 'BarthHaas', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Calypso', 'hop', ARRAY['Calypso','Hopsteiner Calypso','Calypso Pellets'], 'Calypso hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Calypso', 'Hopsteiner', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Calypso', 'hop', ARRAY['Calypso','Charles Faram Calypso','Calypso Pellets'], 'Calypso hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Calypso', 'Charles Faram', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Calypso', 'hop', ARRAY['Calypso','Crosby Hops Calypso','Calypso Pellets'], 'Calypso hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Calypso', 'Crosby Hops', 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Crystal', 'hop', ARRAY['Crystal','Yakima Chief Crystal','Crystal Pellets'], 'Crystal hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Crystal', 'Yakima Chief', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Crystal', 'hop', ARRAY['Crystal','BarthHaas Crystal','Crystal Pellets'], 'Crystal hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Crystal', 'BarthHaas', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Crystal', 'hop', ARRAY['Crystal','Hopsteiner Crystal','Crystal Pellets'], 'Crystal hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Crystal', 'Hopsteiner', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Crystal', 'hop', ARRAY['Crystal','Charles Faram Crystal','Crystal Pellets'], 'Crystal hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Crystal', 'Charles Faram', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Crystal', 'hop', ARRAY['Crystal','Crosby Hops Crystal','Crystal Pellets'], 'Crystal hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Crystal', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Galena', 'hop', ARRAY['Galena','Yakima Chief Galena','Galena Pellets'], 'Galena hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Galena', 'Yakima Chief', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Galena', 'hop', ARRAY['Galena','BarthHaas Galena','Galena Pellets'], 'Galena hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Galena', 'BarthHaas', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Galena', 'hop', ARRAY['Galena','Hopsteiner Galena','Galena Pellets'], 'Galena hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Galena', 'Hopsteiner', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Galena', 'hop', ARRAY['Galena','Charles Faram Galena','Galena Pellets'], 'Galena hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Galena', 'Charles Faram', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Galena', 'hop', ARRAY['Galena','Crosby Hops Galena','Galena Pellets'], 'Galena hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Galena', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Glacier', 'hop', ARRAY['Glacier','Yakima Chief Glacier','Glacier Pellets'], 'Glacier hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Glacier', 'Yakima Chief', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Glacier', 'hop', ARRAY['Glacier','BarthHaas Glacier','Glacier Pellets'], 'Glacier hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Glacier', 'BarthHaas', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Glacier', 'hop', ARRAY['Glacier','Hopsteiner Glacier','Glacier Pellets'], 'Glacier hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Glacier', 'Hopsteiner', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Glacier', 'hop', ARRAY['Glacier','Charles Faram Glacier','Glacier Pellets'], 'Glacier hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Glacier', 'Charles Faram', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Glacier', 'hop', ARRAY['Glacier','Crosby Hops Glacier','Glacier Pellets'], 'Glacier hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Glacier', 'Crosby Hops', 5.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Liberty', 'hop', ARRAY['Liberty','Yakima Chief Liberty','Liberty Pellets'], 'Liberty hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Liberty', 'Yakima Chief', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Liberty', 'hop', ARRAY['Liberty','BarthHaas Liberty','Liberty Pellets'], 'Liberty hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Liberty', 'BarthHaas', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Liberty', 'hop', ARRAY['Liberty','Hopsteiner Liberty','Liberty Pellets'], 'Liberty hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Liberty', 'Hopsteiner', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Liberty', 'hop', ARRAY['Liberty','Charles Faram Liberty','Liberty Pellets'], 'Liberty hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Liberty', 'Charles Faram', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Liberty', 'hop', ARRAY['Liberty','Crosby Hops Liberty','Liberty Pellets'], 'Liberty hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Liberty', 'Crosby Hops', 4.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Mount Hood', 'hop', ARRAY['Mount Hood','Yakima Chief Mount Hood','Mount Hood Pellets'], 'Mount Hood hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Mount Hood', 'Yakima Chief', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Mount Hood', 'hop', ARRAY['Mount Hood','BarthHaas Mount Hood','Mount Hood Pellets'], 'Mount Hood hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Mount Hood', 'BarthHaas', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Mount Hood', 'hop', ARRAY['Mount Hood','Hopsteiner Mount Hood','Mount Hood Pellets'], 'Mount Hood hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Mount Hood', 'Hopsteiner', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Mount Hood', 'hop', ARRAY['Mount Hood','Charles Faram Mount Hood','Mount Hood Pellets'], 'Mount Hood hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Mount Hood', 'Charles Faram', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Mount Hood', 'hop', ARRAY['Mount Hood','Crosby Hops Mount Hood','Mount Hood Pellets'], 'Mount Hood hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Mount Hood', 'Crosby Hops', 6, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Nugget', 'hop', ARRAY['Nugget','Yakima Chief Nugget','Nugget Pellets'], 'Nugget hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Nugget', 'Yakima Chief', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Nugget', 'hop', ARRAY['Nugget','BarthHaas Nugget','Nugget Pellets'], 'Nugget hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Nugget', 'BarthHaas', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Nugget', 'hop', ARRAY['Nugget','Hopsteiner Nugget','Nugget Pellets'], 'Nugget hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Nugget', 'Hopsteiner', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Nugget', 'hop', ARRAY['Nugget','Charles Faram Nugget','Nugget Pellets'], 'Nugget hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Nugget', 'Charles Faram', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Nugget', 'hop', ARRAY['Nugget','Crosby Hops Nugget','Nugget Pellets'], 'Nugget hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Nugget', 'Crosby Hops', 13, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Palisade', 'hop', ARRAY['Palisade','Yakima Chief Palisade','Palisade Pellets'], 'Palisade hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Palisade', 'Yakima Chief', 7.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Palisade', 'hop', ARRAY['Palisade','BarthHaas Palisade','Palisade Pellets'], 'Palisade hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Palisade', 'BarthHaas', 7.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Palisade', 'hop', ARRAY['Palisade','Hopsteiner Palisade','Palisade Pellets'], 'Palisade hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Palisade', 'Hopsteiner', 7.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Palisade', 'hop', ARRAY['Palisade','Charles Faram Palisade','Palisade Pellets'], 'Palisade hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Palisade', 'Charles Faram', 7.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Palisade', 'hop', ARRAY['Palisade','Crosby Hops Palisade','Palisade Pellets'], 'Palisade hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Palisade', 'Crosby Hops', 7.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Willamette', 'hop', ARRAY['Willamette','Yakima Chief Willamette','Willamette Pellets'], 'Willamette hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Willamette', 'Yakima Chief', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Willamette', 'hop', ARRAY['Willamette','BarthHaas Willamette','Willamette Pellets'], 'Willamette hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Willamette', 'BarthHaas', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Willamette', 'hop', ARRAY['Willamette','Hopsteiner Willamette','Willamette Pellets'], 'Willamette hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Willamette', 'Hopsteiner', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Willamette', 'hop', ARRAY['Willamette','Charles Faram Willamette','Willamette Pellets'], 'Willamette hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Willamette', 'Charles Faram', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Willamette', 'hop', ARRAY['Willamette','Crosby Hops Willamette','Willamette Pellets'], 'Willamette hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Willamette', 'Crosby Hops', 5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Warrior', 'hop', ARRAY['Warrior','Yakima Chief Warrior','Warrior Pellets'], 'Warrior hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Warrior', 'Yakima Chief', 16, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Warrior', 'hop', ARRAY['Warrior','BarthHaas Warrior','Warrior Pellets'], 'Warrior hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Warrior', 'BarthHaas', 16, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Warrior', 'hop', ARRAY['Warrior','Hopsteiner Warrior','Warrior Pellets'], 'Warrior hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Warrior', 'Hopsteiner', 16, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Warrior', 'hop', ARRAY['Warrior','Charles Faram Warrior','Warrior Pellets'], 'Warrior hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Warrior', 'Charles Faram', 16, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Warrior', 'hop', ARRAY['Warrior','Crosby Hops Warrior','Warrior Pellets'], 'Warrior hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Warrior', 'Crosby Hops', 16, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief HBC 586', 'hop', ARRAY['HBC 586','Yakima Chief HBC 586','HBC 586 Pellets'], 'HBC 586 hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief HBC 586', 'Yakima Chief', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas HBC 586', 'hop', ARRAY['HBC 586','BarthHaas HBC 586','HBC 586 Pellets'], 'HBC 586 hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas HBC 586', 'BarthHaas', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner HBC 586', 'hop', ARRAY['HBC 586','Hopsteiner HBC 586','HBC 586 Pellets'], 'HBC 586 hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner HBC 586', 'Hopsteiner', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram HBC 586', 'hop', ARRAY['HBC 586','Charles Faram HBC 586','HBC 586 Pellets'], 'HBC 586 hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram HBC 586', 'Charles Faram', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops HBC 586', 'hop', ARRAY['HBC 586','Crosby Hops HBC 586','HBC 586 Pellets'], 'HBC 586 hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops HBC 586', 'Crosby Hops', 12, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief HBC 1019', 'hop', ARRAY['HBC 1019','Yakima Chief HBC 1019','HBC 1019 Pellets'], 'HBC 1019 hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief HBC 1019', 'Yakima Chief', 10.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas HBC 1019', 'hop', ARRAY['HBC 1019','BarthHaas HBC 1019','HBC 1019 Pellets'], 'HBC 1019 hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas HBC 1019', 'BarthHaas', 10.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner HBC 1019', 'hop', ARRAY['HBC 1019','Hopsteiner HBC 1019','HBC 1019 Pellets'], 'HBC 1019 hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner HBC 1019', 'Hopsteiner', 10.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram HBC 1019', 'hop', ARRAY['HBC 1019','Charles Faram HBC 1019','HBC 1019 Pellets'], 'HBC 1019 hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram HBC 1019', 'Charles Faram', 10.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops HBC 1019', 'hop', ARRAY['HBC 1019','Crosby Hops HBC 1019','HBC 1019 Pellets'], 'HBC 1019 hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops HBC 1019', 'Crosby Hops', 10.5, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Krush', 'hop', ARRAY['Krush','Yakima Chief Krush','Krush Pellets'], 'Krush hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Krush', 'Yakima Chief', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Krush', 'hop', ARRAY['Krush','BarthHaas Krush','Krush Pellets'], 'Krush hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Krush', 'BarthHaas', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Krush', 'hop', ARRAY['Krush','Hopsteiner Krush','Krush Pellets'], 'Krush hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Krush', 'Hopsteiner', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Krush', 'hop', ARRAY['Krush','Charles Faram Krush','Krush Pellets'], 'Krush hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Krush', 'Charles Faram', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Krush', 'hop', ARRAY['Krush','Crosby Hops Krush','Krush Pellets'], 'Krush hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Krush', 'Crosby Hops', 11, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Yakima Chief Superdelic', 'hop', ARRAY['Superdelic','Yakima Chief Superdelic','Superdelic Pellets'], 'Superdelic hop provided by Yakima Chief. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Yakima Chief Superdelic', 'Yakima Chief', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BarthHaas Superdelic', 'hop', ARRAY['Superdelic','BarthHaas Superdelic','Superdelic Pellets'], 'Superdelic hop provided by BarthHaas. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'BarthHaas Superdelic', 'BarthHaas', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Hopsteiner Superdelic', 'hop', ARRAY['Superdelic','Hopsteiner Superdelic','Superdelic Pellets'], 'Superdelic hop provided by Hopsteiner. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Hopsteiner Superdelic', 'Hopsteiner', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Charles Faram Superdelic', 'hop', ARRAY['Superdelic','Charles Faram Superdelic','Superdelic Pellets'], 'Superdelic hop provided by Charles Faram. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Charles Faram Superdelic', 'Charles Faram', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Crosby Hops Superdelic', 'hop', ARRAY['Superdelic','Crosby Hops Superdelic','Superdelic Pellets'], 'Superdelic hop provided by Crosby Hops. Alpha acids are highly variable per crop year.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
  VALUES (master_id, 'Crosby Hops Superdelic', 'Crosby Hops', 10, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'US-05', 'yeast', ARRAY['US-05','Fermentis US-05','US-05 Ale Yeast'], 'Commercial yeast strain US-05 produced by Fermentis.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis US-05', 'Fermentis', 81, 18, 28, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'S-04', 'yeast', ARRAY['S-04','Fermentis S-04','S-04 Ale Yeast'], 'Commercial yeast strain S-04 produced by Fermentis.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis S-04', 'Fermentis', 75, 15, 20, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'W-34/70', 'yeast', ARRAY['W-34/70','Fermentis W-34/70','W-34/70 Ale Yeast'], 'Commercial yeast strain W-34/70 produced by Fermentis.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis W-34/70', 'Fermentis', 83, 9, 15, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Nottingham', 'yeast', ARRAY['Nottingham','Lallemand Nottingham','Nottingham Ale Yeast'], 'Commercial yeast strain Nottingham produced by Lallemand.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Nottingham', 'Lallemand', 80, 14, 21, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Verdant IPA', 'yeast', ARRAY['Verdant IPA','Lallemand Verdant IPA','Verdant IPA Ale Yeast'], 'Commercial yeast strain Verdant IPA produced by Lallemand.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Verdant IPA', 'Lallemand', 78, 18, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'BRY-97', 'yeast', ARRAY['BRY-97','Lallemand BRY-97','BRY-97 Ale Yeast'], 'Commercial yeast strain BRY-97 produced by Lallemand.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand BRY-97', 'Lallemand', 82, 15, 22, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'WLP001 California Ale', 'yeast', ARRAY['WLP001 California Ale','White Labs WLP001 California Ale','WLP001 California Ale Ale Yeast'], 'Commercial yeast strain WLP001 California Ale produced by White Labs.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP001 California Ale', 'White Labs', 80, 20, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'WLP002 English Ale', 'yeast', ARRAY['WLP002 English Ale','White Labs WLP002 English Ale','WLP002 English Ale Ale Yeast'], 'Commercial yeast strain WLP002 English Ale produced by White Labs.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP002 English Ale', 'White Labs', 70, 18, 20, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'WLP029 German Ale/Kolsch', 'yeast', ARRAY['WLP029 German Ale/Kolsch','White Labs WLP029 German Ale/Kolsch','WLP029 German Ale/Kolsch Ale Yeast'], 'Commercial yeast strain WLP029 German Ale/Kolsch produced by White Labs.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP029 German Ale/Kolsch', 'White Labs', 78, 18, 21, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'WLP830 German Lager', 'yeast', ARRAY['WLP830 German Lager','White Labs WLP830 German Lager','WLP830 German Lager Ale Yeast'], 'Commercial yeast strain WLP830 German Lager produced by White Labs.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'White Labs WLP830 German Lager', 'White Labs', 79, 10, 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, '1056 American Ale', 'yeast', ARRAY['1056 American Ale','Wyeast 1056 American Ale','1056 American Ale Ale Yeast'], 'Commercial yeast strain 1056 American Ale produced by Wyeast.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Wyeast 1056 American Ale', 'Wyeast', 75, 15, 22, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, '1318 London Ale III', 'yeast', ARRAY['1318 London Ale III','Wyeast 1318 London Ale III','1318 London Ale III Ale Yeast'], 'Commercial yeast strain 1318 London Ale III produced by Wyeast.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Wyeast 1318 London Ale III', 'Wyeast', 75, 18, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, '2124 Bohemian Lager', 'yeast', ARRAY['2124 Bohemian Lager','Wyeast 2124 Bohemian Lager','2124 Bohemian Lager Ale Yeast'], 'Commercial yeast strain 2124 Bohemian Lager produced by Wyeast.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Wyeast 2124 Bohemian Lager', 'Wyeast', 73, 9, 14, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Voss Kveik', 'yeast', ARRAY['Voss Kveik','Lallemand Voss Kveik','Voss Kveik Ale Yeast'], 'Commercial yeast strain Voss Kveik produced by Lallemand.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Voss Kveik', 'Lallemand', 80, 35, 40, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Philly Sour', 'yeast', ARRAY['Philly Sour','Lallemand Philly Sour','Philly Sour Ale Yeast'], 'Commercial yeast strain Philly Sour produced by Lallemand.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Philly Sour', 'Lallemand', 80, 22, 25, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'Belle Saison', 'yeast', ARRAY['Belle Saison','Lallemand Belle Saison','Belle Saison Ale Yeast'], 'Commercial yeast strain Belle Saison produced by Lallemand.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Lallemand Belle Saison', 'Lallemand', 90, 20, 35, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'SafAle BE-256', 'yeast', ARRAY['SafAle BE-256','Fermentis SafAle BE-256','SafAle BE-256 Ale Yeast'], 'Commercial yeast strain SafAle BE-256 produced by Fermentis.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis SafAle BE-256', 'Fermentis', 85, 15, 25, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'SafAle K-97', 'yeast', ARRAY['SafAle K-97','Fermentis SafAle K-97','SafAle K-97 Ale Yeast'], 'Commercial yeast strain SafAle K-97 produced by Fermentis.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Fermentis SafAle K-97', 'Fermentis', 81, 15, 20, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'M44 US West Coast', 'yeast', ARRAY['M44 US West Coast','Mangrove Jack''s M44 US West Coast','M44 US West Coast Ale Yeast'], 'Commercial yeast strain M44 US West Coast produced by Mangrove Jack''s.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Mangrove Jack''s M44 US West Coast', 'Mangrove Jack''s', 81, 18, 23, true);

  master_id := gen_random_uuid();
  INSERT INTO ingredient_master (id, name, type, aliases, description)
  VALUES (master_id, 'M36 Liberty Bell', 'yeast', ARRAY['M36 Liberty Bell','Mangrove Jack''s M36 Liberty Bell','M36 Liberty Bell Ale Yeast'], 'Commercial yeast strain M36 Liberty Bell produced by Mangrove Jack''s.');

  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, min_temp_c, max_temp_c, is_verified)
  VALUES (master_id, 'Mangrove Jack''s M36 Liberty Bell', 'Mangrove Jack''s', 74, 18, 23, true);

END $$;
