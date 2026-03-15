-- Migration: Ingredients Expansion Pack
-- Comprehensive ingredient data: malts, hops, yeasts, misc.
-- Requires migration 20260320100000 (UNIQUE constraints on ingredient tables).
-- All inserts are idempotent via ON CONFLICT DO NOTHING.

DO $$
BEGIN

  -- ============================================================
  -- RICH MALTS (multi-manufacturer, aliases)
  -- ============================================================

  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Golden Promise', 'malt', ARRAY['Simpsons Golden Promise','Fawcett Golden Promise'], 5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Simpsons Golden Promise', 'Simpsons', 5, 1.038, true
    FROM ingredient_master WHERE name = 'Golden Promise'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Fawcett Golden Promise', 'Thomas Fawcett', 4.5, 1.038, true
    FROM ingredient_master WHERE name = 'Golden Promise'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Crystal 10', 'malt', ARRAY['Caramel 10','Crystal 10L','C10'], 20, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Briess Caramel 10L', 'Briess', 20, 1.035, true
    FROM ingredient_master WHERE name = 'Crystal 10'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Crystal 40', 'malt', ARRAY['Caramel 40','Crystal 40L','C40'], 80, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Briess Caramel 40L', 'Briess', 80, 1.034, true
    FROM ingredient_master WHERE name = 'Crystal 40'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Bairds Crystal Medium', 'Bairds', 75, 1.034, true
    FROM ingredient_master WHERE name = 'Crystal 40'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Crystal 60', 'malt', ARRAY['Caramel 60','Crystal 60L','C60'], 120, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Briess Caramel 60L', 'Briess', 120, 1.034, true
    FROM ingredient_master WHERE name = 'Crystal 60'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Crystal 120', 'malt', ARRAY['Caramel 120','Crystal 120L','C120'], 240, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Briess Caramel 120L', 'Briess', 240, 1.033, true
    FROM ingredient_master WHERE name = 'Crystal 120'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Special B', 'malt', ARRAY['Carabruin','Belgian Special B'], 300, 1.03)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Castle Malting Special B', 'Castle Malting', 300, 1.03, true
    FROM ingredient_master WHERE name = 'Special B'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Dingemans Special B', 'Dingemans', 290, 1.03, true
    FROM ingredient_master WHERE name = 'Special B'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Victory Malt', 'malt', ARRAY['Victory','Biscuit Malt'], 75, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Briess Victory Malt', 'Briess', 75, 1.034, true
    FROM ingredient_master WHERE name = 'Victory Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Red X', 'malt', ARRAY['RedX','BestMalz Red X'], 30, 1.036)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Red X', 'BestMalz', 30, 1.036, true
    FROM ingredient_master WHERE name = 'Red X'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Honey Malt', 'malt', ARRAY['Gambrinus Honey Malt','Brumalt'], 50, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Gambrinus Honey Malt', 'Gambrinus', 50, 1.037, true
    FROM ingredient_master WHERE name = 'Honey Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Brown Malt', 'malt', ARRAY['Brown Malt'], 150, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Brown Malt', 'Crisp', 150, 1.032, true
    FROM ingredient_master WHERE name = 'Brown Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Simpsons Brown Malt', 'Simpsons', 150, 1.032, true
    FROM ingredient_master WHERE name = 'Brown Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Amber Malt', 'malt', ARRAY['Amber Malt'], 50, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Amber Malt', 'Crisp', 50, 1.032, true
    FROM ingredient_master WHERE name = 'Amber Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Simpsons Amber Malt', 'Simpsons', 55, 1.032, true
    FROM ingredient_master WHERE name = 'Amber Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Biscuit Malt', 'malt', ARRAY['Biscuit'], 50, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Castle Malting Biscuit', 'Castle Malting', 50, 1.035, true
    FROM ingredient_master WHERE name = 'Biscuit Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Dingemans Biscuit', 'Dingemans', 50, 1.035, true
    FROM ingredient_master WHERE name = 'Biscuit Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Aromatic Malt', 'malt', ARRAY['Aromatic'], 50, 1.036)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Castle Malting Aromatic', 'Castle Malting', 50, 1.036, true
    FROM ingredient_master WHERE name = 'Aromatic Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Dingemans Aromatic', 'Dingemans', 50, 1.036, true
    FROM ingredient_master WHERE name = 'Aromatic Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Oat Malt', 'malt', ARRAY['Golden Oats'], 5, 1.03)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Thomas Fawcett Oat Malt', 'Thomas Fawcett', 5, 1.03, true
    FROM ingredient_master WHERE name = 'Oat Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Oat Malt', 'Crisp', 4, 1.032, true
    FROM ingredient_master WHERE name = 'Oat Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Cara Clair', 'malt', ARRAY['Cara Clair','Chit Malt'], 4, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Castle Malting Cara Clair', 'Castle Malting', 4, 1.035, true
    FROM ingredient_master WHERE name = 'Cara Clair'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, color_ebc, potential_pts)
    VALUES ('Cara Gold', 'malt', ARRAY['Cara Gold'], 120, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Castle Malting Cara Gold', 'Castle Malting', 120, 1.034, true
    FROM ingredient_master WHERE name = 'Cara Gold'
    ON CONFLICT DO NOTHING;

  -- ============================================================
  -- RICH HOPS (aliases)
  -- ============================================================

  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Mandarina Bavaria', 'hop', ARRAY['Mandarina'], 8.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Mandarina Bavaria', 'BarthHaas', 8.5, true
    FROM ingredient_master WHERE name = 'Mandarina Bavaria'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Hallertau Blanc', 'hop', ARRAY['Hallertau Blanc'], 10.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Hallertau Blanc', 'BarthHaas', 10.5, true
    FROM ingredient_master WHERE name = 'Hallertau Blanc'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Styrian Golding', 'hop', ARRAY['Celeia','Styrian Golding Celeia'], 4.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Styrian Golding', 'BarthHaas', 4.5, true
    FROM ingredient_master WHERE name = 'Styrian Golding'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Enigma', 'hop', ARRAY['Enigma (AU)','Enigma Hop'], 15.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Hop France Enigma', 'Hop France', 15.5, true
    FROM ingredient_master WHERE name = 'Enigma'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Riwaka', 'hop', ARRAY['Riwaka Pellets','D-Saaz'], 5.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Riwaka', 'NZ Hops', 5.5, true
    FROM ingredient_master WHERE name = 'Riwaka'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Nelson Sauvin', 'hop', ARRAY['Nelson Sauvin Pellets','Nelson'], 12.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Nelson Sauvin', 'NZ Hops', 12.5, true
    FROM ingredient_master WHERE name = 'Nelson Sauvin'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Galaxy', 'hop', ARRAY['Galaxy Hop','Galaxy (AU)'], 14)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Hop Products Australia Galaxy', 'HPA', 14, true
    FROM ingredient_master WHERE name = 'Galaxy'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Vic Secret', 'hop', ARRAY['Vic Secret (AU)'], 15.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Hop Products Australia Vic Secret', 'HPA', 15.5, true
    FROM ingredient_master WHERE name = 'Vic Secret'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases, alpha_pct)
    VALUES ('Ella', 'hop', ARRAY['Ella (AU)','Ella Hop'], 14.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Hop Products Australia Ella', 'HPA', 14.5, true
    FROM ingredient_master WHERE name = 'Ella'
    ON CONFLICT DO NOTHING;

  -- ============================================================
  -- MISC / ADJUNCTS
  -- ============================================================

  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Lactose', 'misc', ARRAY['Milk Sugar','Laktose'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Gypsum', 'misc', ARRAY['Calcium Sulfate','Braugips','CaSO4'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Whirlfloc', 'misc', ARRAY['Irish Moss','Whirlfloc Tablets','Finings','Karrageen'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Lactic Acid', 'misc', ARRAY['Milchsäure 80%','Lactic Acid 80%','Milchsäure'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Irish Moss', 'misc', ARRAY['Carrageenan','Irisches Moos'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Coriander Seed', 'misc', ARRAY['Koriander','Coriander'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Orange Peel', 'misc', ARRAY['Orangenschale','Sweet Orange Peel','Bitter Orange Peel'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Calcium Chloride', 'misc', ARRAY['CaCl2','Calciumchlorid'])
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_master (name, type, aliases)
    VALUES ('Epsom Salt', 'misc', ARRAY['Magnesium Sulfate','Bittersalz','MgSO4'])
    ON CONFLICT (name) DO NOTHING;

  -- ============================================================
  -- BULK MALTS (single manufacturer)
  -- ============================================================

  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Swaen© Ale', 'malt', 7, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Swaen© Ale', 'The Swaen', 7, 1.037, true
    FROM ingredient_master WHERE name = 'Swaen© Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Swaen© Pilsner', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Swaen© Pilsner', 'The Swaen', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Swaen© Pilsner'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Swaen© Munich Light', 'malt', 15, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Swaen© Munich Light', 'The Swaen', 15, 1.037, true
    FROM ingredient_master WHERE name = 'Swaen© Munich Light'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Swaen© Munich Dark', 'malt', 30, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Swaen© Munich Dark', 'The Swaen', 30, 1.037, true
    FROM ingredient_master WHERE name = 'Swaen© Munich Dark'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('GoldSwaen© Hell', 'malt', 25, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'GoldSwaen© Hell', 'The Swaen', 25, 1.035, true
    FROM ingredient_master WHERE name = 'GoldSwaen© Hell'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('GoldSwaen© Amber', 'malt', 70, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'GoldSwaen© Amber', 'The Swaen', 70, 1.035, true
    FROM ingredient_master WHERE name = 'GoldSwaen© Amber'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('GoldSwaen© Brown', 'malt', 200, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'GoldSwaen© Brown', 'The Swaen', 200, 1.035, true
    FROM ingredient_master WHERE name = 'GoldSwaen© Brown'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('BlackSwaen© Coffee', 'malt', 500, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BlackSwaen© Coffee', 'The Swaen', 500, 1.032, true
    FROM ingredient_master WHERE name = 'BlackSwaen© Coffee'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('BlackSwaen© Chocolate', 'malt', 900, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BlackSwaen© Chocolate', 'The Swaen', 900, 1.032, true
    FROM ingredient_master WHERE name = 'BlackSwaen© Chocolate'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('BlackSwaen© Black', 'malt', 1300, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BlackSwaen© Black', 'The Swaen', 1300, 1.032, true
    FROM ingredient_master WHERE name = 'BlackSwaen© Black'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Gladfield American Ale Malt', 'malt', 5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Gladfield American Ale', 'Gladfield', 5, 1.038, true
    FROM ingredient_master WHERE name = 'Gladfield American Ale Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Gladfield Aurora Malt', 'malt', 55, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Gladfield Aurora', 'Gladfield', 55, 1.037, true
    FROM ingredient_master WHERE name = 'Gladfield Aurora Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Gladfield Redback Malt', 'malt', 65, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Gladfield Redback', 'Gladfield', 65, 1.035, true
    FROM ingredient_master WHERE name = 'Gladfield Redback Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Gladfield Shepherds Delight', 'malt', 300, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Gladfield Shepherds Delight', 'Gladfield', 300, 1.033, true
    FROM ingredient_master WHERE name = 'Gladfield Shepherds Delight'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Gladfield Toffee Malt', 'malt', 15, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Gladfield Toffee', 'Gladfield', 15, 1.037, true
    FROM ingredient_master WHERE name = 'Gladfield Toffee Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Avangard Pilsner Malt', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Avangard Pilsner', 'Avangard', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Avangard Pilsner Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Avangard Pale Ale Malt', 'malt', 6, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Avangard Pale Ale', 'Avangard', 6, 1.037, true
    FROM ingredient_master WHERE name = 'Avangard Pale Ale Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Avangard Munich Malt', 'malt', 20, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Avangard Munich', 'Avangard', 20, 1.037, true
    FROM ingredient_master WHERE name = 'Avangard Munich Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Muntons Propino Pale Malt', 'malt', 5.5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Muntons Propino', 'Muntons', 5.5, 1.038, true
    FROM ingredient_master WHERE name = 'Muntons Propino Pale Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Muntons Maris Otter Malt', 'malt', 5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Muntons Maris Otter', 'Muntons', 5, 1.038, true
    FROM ingredient_master WHERE name = 'Muntons Maris Otter Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Muntons Crystal Malt', 'malt', 150, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Muntons Crystal', 'Muntons', 150, 1.034, true
    FROM ingredient_master WHERE name = 'Muntons Crystal Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Pilsner Malt', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Pilsner Malt', 'Weyermann', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Pilsner Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Premium Pilsner Malt', 'malt', 2.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Premium Pilsner', 'Weyermann', 2.5, 1.037, true
    FROM ingredient_master WHERE name = 'Premium Pilsner Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Barke Pilsner Malt', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Barke Pilsner', 'Weyermann', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Barke Pilsner Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Pale Ale Malt', 'malt', 6.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Pale Ale Malt', 'Weyermann', 6.5, 1.037, true
    FROM ingredient_master WHERE name = 'Pale Ale Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Vienna Malt', 'malt', 8, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Vienna Malt', 'Weyermann', 8, 1.037, true
    FROM ingredient_master WHERE name = 'Vienna Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Munich I', 'malt', 15, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Munich Malt I', 'Weyermann', 15, 1.037, true
    FROM ingredient_master WHERE name = 'Munich I'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Munich II', 'malt', 25, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Munich Malt II', 'Weyermann', 25, 1.037, true
    FROM ingredient_master WHERE name = 'Munich II'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Melanoidin', 'malt', 70, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Melanoidin Malt', 'Weyermann', 70, 1.033, true
    FROM ingredient_master WHERE name = 'Melanoidin'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Acidulated Malt', 'malt', 5, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Acidulated Malt', 'Weyermann', 5, 1.033, true
    FROM ingredient_master WHERE name = 'Acidulated Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carapils', 'malt', 4, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carapils', 'Weyermann', 4, 1.033, true
    FROM ingredient_master WHERE name = 'Carapils'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carahell', 'malt', 25, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carahell', 'Weyermann', 25, 1.033, true
    FROM ingredient_master WHERE name = 'Carahell'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carared', 'malt', 50, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carared', 'Weyermann', 50, 1.033, true
    FROM ingredient_master WHERE name = 'Carared'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Caraamber', 'malt', 70, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Caraamber', 'Weyermann', 70, 1.033, true
    FROM ingredient_master WHERE name = 'Caraamber'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Caramunich I', 'malt', 90, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Caramunich I', 'Weyermann', 90, 1.033, true
    FROM ingredient_master WHERE name = 'Caramunich I'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Caramunich II', 'malt', 120, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Caramunich II', 'Weyermann', 120, 1.033, true
    FROM ingredient_master WHERE name = 'Caramunich II'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Caramunich III', 'malt', 150, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Caramunich III', 'Weyermann', 150, 1.033, true
    FROM ingredient_master WHERE name = 'Caramunich III'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Caraaroma', 'malt', 400, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Caraaroma', 'Weyermann', 400, 1.033, true
    FROM ingredient_master WHERE name = 'Caraaroma'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carafa Special I', 'malt', 800, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carafa Special I', 'Weyermann', 800, 1.032, true
    FROM ingredient_master WHERE name = 'Carafa Special I'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carafa Special II', 'malt', 1150, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carafa Special II', 'Weyermann', 1150, 1.032, true
    FROM ingredient_master WHERE name = 'Carafa Special II'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carafa Special III', 'malt', 1400, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carafa Special III', 'Weyermann', 1400, 1.032, true
    FROM ingredient_master WHERE name = 'Carafa Special III'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carabohemian', 'malt', 200, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carabohemian', 'Weyermann', 200, 1.033, true
    FROM ingredient_master WHERE name = 'Carabohemian'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carabelge', 'malt', 35, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carabelge', 'Weyermann', 35, 1.033, true
    FROM ingredient_master WHERE name = 'Carabelge'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Abbey Malt', 'malt', 45, 1.033)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Abbey Malt', 'Weyermann', 45, 1.033, true
    FROM ingredient_master WHERE name = 'Abbey Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Beech Smoked Barley Malt', 'malt', 5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Rauchmalz', 'Weyermann', 5, 1.037, true
    FROM ingredient_master WHERE name = 'Beech Smoked Barley Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Oak Smoked Wheat Malt', 'malt', 5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Oak Smoked Wheat', 'Weyermann', 5, 1.037, true
    FROM ingredient_master WHERE name = 'Oak Smoked Wheat Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Pale Wheat Malt', 'malt', 4, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Pale Wheat Malt', 'Weyermann', 4, 1.038, true
    FROM ingredient_master WHERE name = 'Pale Wheat Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Dark Wheat Malt', 'malt', 17, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Dark Wheat Malt', 'Weyermann', 17, 1.038, true
    FROM ingredient_master WHERE name = 'Dark Wheat Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carafa I', 'malt', 800, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carafa I', 'Weyermann', 800, 1.032, true
    FROM ingredient_master WHERE name = 'Carafa I'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carafa II', 'malt', 1150, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carafa II', 'Weyermann', 1150, 1.032, true
    FROM ingredient_master WHERE name = 'Carafa II'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Carafa III', 'malt', 1400, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Weyermann Carafa III', 'Weyermann', 1400, 1.032, true
    FROM ingredient_master WHERE name = 'Carafa III'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Pilsen', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Pilsen', 'BestMalz', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Best Pilsen'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Heidelberg', 'malt', 2.9, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Heidelberg', 'BestMalz', 2.9, 1.037, true
    FROM ingredient_master WHERE name = 'Best Heidelberg'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Pale Ale', 'malt', 6, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Pale Ale', 'BestMalz', 6, 1.037, true
    FROM ingredient_master WHERE name = 'Best Pale Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Vienna', 'malt', 9, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Vienna', 'BestMalz', 9, 1.037, true
    FROM ingredient_master WHERE name = 'Best Vienna'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Munich', 'malt', 15, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Munich', 'BestMalz', 15, 1.037, true
    FROM ingredient_master WHERE name = 'Best Munich'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Munich Dark', 'malt', 25, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Munich Dark', 'BestMalz', 25, 1.037, true
    FROM ingredient_master WHERE name = 'Best Munich Dark'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Caramel Hell', 'malt', 30, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Caramel Hell', 'BestMalz', 30, 1.035, true
    FROM ingredient_master WHERE name = 'Best Caramel Hell'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Caramel Amber', 'malt', 70, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Caramel Amber', 'BestMalz', 70, 1.035, true
    FROM ingredient_master WHERE name = 'Best Caramel Amber'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Caramel Dark', 'malt', 120, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Caramel Dark', 'BestMalz', 120, 1.035, true
    FROM ingredient_master WHERE name = 'Best Caramel Dark'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Smoked', 'malt', 5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Smoked', 'BestMalz', 5, 1.037, true
    FROM ingredient_master WHERE name = 'Best Smoked'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Black Malt', 'malt', 1200, 1.032)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Black Malt', 'BestMalz', 1200, 1.032, true
    FROM ingredient_master WHERE name = 'Best Black Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Best Chit Malt', 'malt', 2.5, 1.035)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'BestMalz Chit Malt', 'BestMalz', 2.5, 1.035, true
    FROM ingredient_master WHERE name = 'Best Chit Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Pilsen', 'malt', 3, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Pilsen', 'Castle Malting', 3, 1.037, true
    FROM ingredient_master WHERE name = 'Château Pilsen'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Pale Ale', 'malt', 8, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Pale Ale', 'Castle Malting', 8, 1.037, true
    FROM ingredient_master WHERE name = 'Château Pale Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Vienna', 'malt', 5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Vienna', 'Castle Malting', 5, 1.037, true
    FROM ingredient_master WHERE name = 'Château Vienna'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Munich', 'malt', 18, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Munich', 'Castle Malting', 18, 1.037, true
    FROM ingredient_master WHERE name = 'Château Munich'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Melano', 'malt', 70, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Melano', 'Castle Malting', 70, 1.034, true
    FROM ingredient_master WHERE name = 'Château Melano'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Chocolat', 'malt', 900, 1.03)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Chocolat', 'Castle Malting', 900, 1.03, true
    FROM ingredient_master WHERE name = 'Château Chocolat'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Château Black', 'malt', 1400, 1.027)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Château Black', 'Castle Malting', 1400, 1.027, true
    FROM ingredient_master WHERE name = 'Château Black'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Crisp Maris Otter', 'malt', 5.5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Maris Otter', 'Crisp', 5.5, 1.038, true
    FROM ingredient_master WHERE name = 'Crisp Maris Otter'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Crisp Finest Maris Otter', 'malt', 4.5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Finest Maris Otter', 'Crisp', 4.5, 1.038, true
    FROM ingredient_master WHERE name = 'Crisp Finest Maris Otter'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Crisp Crystal 45', 'malt', 90, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Crystal 45', 'Crisp', 90, 1.034, true
    FROM ingredient_master WHERE name = 'Crisp Crystal 45'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Crisp Chocolate Malt', 'malt', 900, 1.03)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Crisp Chocolate Malt', 'Crisp', 900, 1.03, true
    FROM ingredient_master WHERE name = 'Crisp Chocolate Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Fawcett Maris Otter', 'malt', 5.5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Fawcett Maris Otter Pale Ale', 'Thomas Fawcett', 5.5, 1.038, true
    FROM ingredient_master WHERE name = 'Fawcett Maris Otter'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Fawcett Pearl', 'malt', 5, 1.038)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Fawcett Pearl Ale Malt', 'Thomas Fawcett', 5, 1.038, true
    FROM ingredient_master WHERE name = 'Fawcett Pearl'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Fawcett Crystal 50', 'malt', 100, 1.034)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Fawcett Crystal Medium', 'Thomas Fawcett', 100, 1.034, true
    FROM ingredient_master WHERE name = 'Fawcett Crystal 50'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Fawcett Chocolate Malt', 'malt', 900, 1.03)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Fawcett Chocolate Malt', 'Thomas Fawcett', 900, 1.03, true
    FROM ingredient_master WHERE name = 'Fawcett Chocolate Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Fawcett Roasted Barley', 'malt', 1500, 1.027)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Fawcett Roasted Barley', 'Thomas Fawcett', 1500, 1.027, true
    FROM ingredient_master WHERE name = 'Fawcett Roasted Barley'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Paul''s Pilsner Malt', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Paul''s Pilsner', 'Paul''s Malt', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Paul''s Pilsner Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Paul''s Pale Ale Malt', 'malt', 7, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Paul''s Pale Ale', 'Paul''s Malt', 7, 1.037, true
    FROM ingredient_master WHERE name = 'Paul''s Pale Ale Malt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Rahr Standard 2-Row', 'malt', 3.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Rahr Standard 2-Row', 'Rahr', 3.5, 1.037, true
    FROM ingredient_master WHERE name = 'Rahr Standard 2-Row'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Rahr White Wheat', 'malt', 3, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Rahr White Wheat', 'Rahr', 3, 1.037, true
    FROM ingredient_master WHERE name = 'Rahr White Wheat'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Rahr Red Wheat', 'malt', 4.5, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Rahr Red Wheat', 'Rahr', 4.5, 1.037, true
    FROM ingredient_master WHERE name = 'Rahr Red Wheat'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Great Western 2-Row', 'malt', 3, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Great Western 2-Row', 'Great Western Malting', 3, 1.037, true
    FROM ingredient_master WHERE name = 'Great Western 2-Row'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, color_ebc, potential_pts)
    VALUES ('Canada Malting 2-Row', 'malt', 3, 1.037)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, color_ebc, potential_pts, is_verified)
    SELECT id, 'Canada Malting 2-Row', 'Canada Malting', 3, 1.037, true
    FROM ingredient_master WHERE name = 'Canada Malting 2-Row'
    ON CONFLICT DO NOTHING;

  -- ============================================================
  -- BULK HOPS (single manufacturer)
  -- ============================================================

  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Cascade', 'hop', 6.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Cascade', 'Yakima Chief', 6.5, true
    FROM ingredient_master WHERE name = 'Cascade'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Centennial', 'hop', 10)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Centennial', 'Yakima Chief', 10, true
    FROM ingredient_master WHERE name = 'Centennial'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Chinook', 'hop', 13)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Chinook', 'Yakima Chief', 13, true
    FROM ingredient_master WHERE name = 'Chinook'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Citra', 'hop', 12)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Citra', 'Yakima Chief', 12, true
    FROM ingredient_master WHERE name = 'Citra'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Mosaic', 'hop', 12.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Mosaic', 'Yakima Chief', 12.5, true
    FROM ingredient_master WHERE name = 'Mosaic'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Simcoe', 'hop', 13)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Simcoe', 'Yakima Chief', 13, true
    FROM ingredient_master WHERE name = 'Simcoe'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Amarillo', 'hop', 9.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Amarillo', 'Yakima Chief', 9.5, true
    FROM ingredient_master WHERE name = 'Amarillo'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Columbus', 'hop', 15)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Columbus', 'Yakima Chief', 15, true
    FROM ingredient_master WHERE name = 'Columbus'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Nugget', 'hop', 13)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Nugget', 'Yakima Chief', 13, true
    FROM ingredient_master WHERE name = 'Nugget'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Willamette', 'hop', 5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Willamette', 'Yakima Chief', 5, true
    FROM ingredient_master WHERE name = 'Willamette'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Talus', 'hop', 8.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Talus', 'Yakima Chief', 8.5, true
    FROM ingredient_master WHERE name = 'Talus'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Cashmere', 'hop', 8.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Cashmere', 'Yakima Chief', 8.5, true
    FROM ingredient_master WHERE name = 'Cashmere'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Azacca', 'hop', 14)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Azacca', 'Yakima Chief', 14, true
    FROM ingredient_master WHERE name = 'Azacca'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Ekuanot', 'hop', 14.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Ekuanot', 'Yakima Chief', 14.5, true
    FROM ingredient_master WHERE name = 'Ekuanot'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Idaho 7', 'hop', 13)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Yakima Chief Idaho 7', 'Yakima Chief', 13, true
    FROM ingredient_master WHERE name = 'Idaho 7'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Strata', 'hop', 12.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Indie Hops Strata', 'Indie Hops', 12.5, true
    FROM ingredient_master WHERE name = 'Strata'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Rakau', 'hop', 10.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Rakau', 'NZ Hops', 10.5, true
    FROM ingredient_master WHERE name = 'Rakau'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Wai-iti', 'hop', 3)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Wai-iti', 'NZ Hops', 3, true
    FROM ingredient_master WHERE name = 'Wai-iti'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Wakatu', 'hop', 7.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Wakatu', 'NZ Hops', 7.5, true
    FROM ingredient_master WHERE name = 'Wakatu'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Kohatu', 'hop', 6.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Kohatu', 'NZ Hops', 6.5, true
    FROM ingredient_master WHERE name = 'Kohatu'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Moutere', 'hop', 14.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'NZ Hops Moutere', 'NZ Hops', 14.5, true
    FROM ingredient_master WHERE name = 'Moutere'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Saaz', 'hop', 3.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Saaz', 'BarthHaas', 3.5, true
    FROM ingredient_master WHERE name = 'Saaz'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Hallertau Mittelfrüh', 'hop', 3.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Hallertau Mittelfrüh', 'BarthHaas', 3.5, true
    FROM ingredient_master WHERE name = 'Hallertau Mittelfrüh'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Tettnanger', 'hop', 4.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Tettnanger', 'BarthHaas', 4.5, true
    FROM ingredient_master WHERE name = 'Tettnanger'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Spalt', 'hop', 4.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Spalt', 'BarthHaas', 4.5, true
    FROM ingredient_master WHERE name = 'Spalt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Hallertau Tradition', 'hop', 6)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Hallertau Tradition', 'BarthHaas', 6, true
    FROM ingredient_master WHERE name = 'Hallertau Tradition'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Huell Melon', 'hop', 7.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Huell Melon', 'BarthHaas', 7.5, true
    FROM ingredient_master WHERE name = 'Huell Melon'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Callista', 'hop', 4)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Callista', 'BarthHaas', 4, true
    FROM ingredient_master WHERE name = 'Callista'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Ariane', 'hop', 11)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Ariane', 'BarthHaas', 11, true
    FROM ingredient_master WHERE name = 'Ariane'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Akoya', 'hop', 10)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'BarthHaas Akoya', 'BarthHaas', 10, true
    FROM ingredient_master WHERE name = 'Akoya'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Target', 'hop', 11)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram Target', 'Charles Faram', 11, true
    FROM ingredient_master WHERE name = 'Target'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Fuggles', 'hop', 4.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram Fuggles', 'Charles Faram', 4.5, true
    FROM ingredient_master WHERE name = 'Fuggles'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('East Kent Goldings', 'hop', 5.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram EKG', 'Charles Faram', 5.5, true
    FROM ingredient_master WHERE name = 'East Kent Goldings'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Progress', 'hop', 6)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram Progress', 'Charles Faram', 6, true
    FROM ingredient_master WHERE name = 'Progress'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Bramling Cross', 'hop', 6.5)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram Bramling Cross', 'Charles Faram', 6.5, true
    FROM ingredient_master WHERE name = 'Bramling Cross'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('First Gold', 'hop', 8)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram First Gold', 'Charles Faram', 8, true
    FROM ingredient_master WHERE name = 'First Gold'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type, alpha_pct)
    VALUES ('Sovereign', 'hop', 6)
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, alpha_pct, is_verified)
    SELECT id, 'Charles Faram Sovereign', 'Charles Faram', 6, true
    FROM ingredient_master WHERE name = 'Sovereign'
    ON CONFLICT DO NOTHING;

  -- ============================================================
  -- BULK YEASTS (single manufacturer)
  -- ============================================================

  INSERT INTO ingredient_master (name, type)
    VALUES ('US-05', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle US-05', 'Fermentis', 81, true
    FROM ingredient_master WHERE name = 'US-05'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('S-04', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle S-04', 'Fermentis', 75, true
    FROM ingredient_master WHERE name = 'S-04'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('W-34/70', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafLager W-34/70', 'Fermentis', 83, true
    FROM ingredient_master WHERE name = 'W-34/70'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('S-189', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafLager S-189', 'Fermentis', 82, true
    FROM ingredient_master WHERE name = 'S-189'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('S-23', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafLager S-23', 'Fermentis', 82, true
    FROM ingredient_master WHERE name = 'S-23'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WB-06', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle WB-06', 'Fermentis', 86, true
    FROM ingredient_master WHERE name = 'WB-06'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('BE-256', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle BE-256', 'Fermentis', 83, true
    FROM ingredient_master WHERE name = 'BE-256'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('T-58', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle T-58', 'Fermentis', 70, true
    FROM ingredient_master WHERE name = 'T-58'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('K-97', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle K-97', 'Fermentis', 81, true
    FROM ingredient_master WHERE name = 'K-97'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('BE-134', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Fermentis SafAle BE-134', 'Fermentis', 90, true
    FROM ingredient_master WHERE name = 'BE-134'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Nottingham', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Nottingham', 'Lallemand', 80, true
    FROM ingredient_master WHERE name = 'LalBrew Nottingham'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Windsor', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Windsor', 'Lallemand', 70, true
    FROM ingredient_master WHERE name = 'LalBrew Windsor'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Diamond', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Diamond Lager', 'Lallemand', 80, true
    FROM ingredient_master WHERE name = 'LalBrew Diamond'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Munich Classic', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Munich Classic', 'Lallemand', 75, true
    FROM ingredient_master WHERE name = 'LalBrew Munich Classic'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Verdant IPA', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Verdant IPA', 'Lallemand', 78, true
    FROM ingredient_master WHERE name = 'LalBrew Verdant IPA'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Voss Kveik', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Voss Kveik', 'Lallemand', 80, true
    FROM ingredient_master WHERE name = 'LalBrew Voss Kveik'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew NovaLager', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand NovaLager', 'Lallemand', 80, true
    FROM ingredient_master WHERE name = 'LalBrew NovaLager'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Farmhouse', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Farmhouse', 'Lallemand', 80, true
    FROM ingredient_master WHERE name = 'LalBrew Farmhouse'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('LalBrew Abbaye', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Lallemand Abbaye', 'Lallemand', 80, true
    FROM ingredient_master WHERE name = 'LalBrew Abbaye'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M44 US West Coast', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M44 US West Coast', 'Mangrove Jack''s', 81, true
    FROM ingredient_master WHERE name = 'MJ M44 US West Coast'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M36 Liberty Bell', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M36 Liberty Bell', 'Mangrove Jack''s', 74, true
    FROM ingredient_master WHERE name = 'MJ M36 Liberty Bell'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M15 Empire Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M15 Empire Ale', 'Mangrove Jack''s', 72, true
    FROM ingredient_master WHERE name = 'MJ M15 Empire Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M29 French Saison', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M29 French Saison', 'Mangrove Jack''s', 90, true
    FROM ingredient_master WHERE name = 'MJ M29 French Saison'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M54 Californian Lager', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M54 Californian Lager', 'Mangrove Jack''s', 80, true
    FROM ingredient_master WHERE name = 'MJ M54 Californian Lager'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M42 New World Strong Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M42 New World Strong Ale', 'Mangrove Jack''s', 80, true
    FROM ingredient_master WHERE name = 'MJ M42 New World Strong Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M21 Belgian Wit', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M21 Belgian Wit', 'Mangrove Jack''s', 75, true
    FROM ingredient_master WHERE name = 'MJ M21 Belgian Wit'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M31 Belgian Tripel', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M31 Belgian Tripel', 'Mangrove Jack''s', 85, true
    FROM ingredient_master WHERE name = 'MJ M31 Belgian Tripel'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M41 Belgian Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M41 Belgian Ale', 'Mangrove Jack''s', 85, true
    FROM ingredient_master WHERE name = 'MJ M41 Belgian Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('MJ M20 Bavarian Wheat', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'Mangrove Jack''s M20 Bavarian Wheat', 'Mangrove Jack''s', 72, true
    FROM ingredient_master WHERE name = 'MJ M20 Bavarian Wheat'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP001 California Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP001', 'White Labs', 76, true
    FROM ingredient_master WHERE name = 'WLP001 California Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP002 English Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP002', 'White Labs', 67, true
    FROM ingredient_master WHERE name = 'WLP002 English Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP004 Irish Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP004', 'White Labs', 72, true
    FROM ingredient_master WHERE name = 'WLP004 Irish Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP005 British Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP005', 'White Labs', 70, true
    FROM ingredient_master WHERE name = 'WLP005 British Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP007 Dry English Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP007', 'White Labs', 75, true
    FROM ingredient_master WHERE name = 'WLP007 Dry English Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP008 East Coast Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP008', 'White Labs', 72, true
    FROM ingredient_master WHERE name = 'WLP008 East Coast Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP013 London Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP013', 'White Labs', 70, true
    FROM ingredient_master WHERE name = 'WLP013 London Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP023 Burton Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP023', 'White Labs', 72, true
    FROM ingredient_master WHERE name = 'WLP023 Burton Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP029 German Ale/Kolsch', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP029', 'White Labs', 75, true
    FROM ingredient_master WHERE name = 'WLP029 German Ale/Kolsch'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP036 Dusseldorf Alt', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP036', 'White Labs', 70, true
    FROM ingredient_master WHERE name = 'WLP036 Dusseldorf Alt'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP300 Hefeweizen Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP300', 'White Labs', 74, true
    FROM ingredient_master WHERE name = 'WLP300 Hefeweizen Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP500 Abbey Ale', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP500', 'White Labs', 77, true
    FROM ingredient_master WHERE name = 'WLP500 Abbey Ale'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP530 Abbey Ale II', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP530', 'White Labs', 77, true
    FROM ingredient_master WHERE name = 'WLP530 Abbey Ale II'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP830 German Lager', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP830', 'White Labs', 77, true
    FROM ingredient_master WHERE name = 'WLP830 German Lager'
    ON CONFLICT DO NOTHING;
  INSERT INTO ingredient_master (name, type)
    VALUES ('WLP833 German Bock Lager', 'yeast')
    ON CONFLICT (name) DO NOTHING;
  INSERT INTO ingredient_products (master_id, name, manufacturer, attenuation_pct, is_verified)
    SELECT id, 'White Labs WLP833', 'White Labs', 73, true
    FROM ingredient_master WHERE name = 'WLP833 German Bock Lager'
    ON CONFLICT DO NOTHING;

END $$;
