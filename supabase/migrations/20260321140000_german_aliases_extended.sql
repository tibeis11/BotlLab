-- Extended German aliases and alternative spellings for ingredient_master
-- Adds aliases via deduplication to avoid duplicates

-- Helper to merge without duplicates
-- Uses: array_cat + distinct unnest trick

-- ─── MALTS ───────────────────────────────────────────────────────────────────

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Abtei Malz','Klostermalz','Abbey Malt']))))
WHERE name = 'Abbey Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Sauermalz','Säuerungsmalz','Acidulated Malt']))))
WHERE name = 'Acidulated Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Amber Malz','Braunes Malz','Britisches Amber Malz']))))
WHERE name = 'Amber Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Aromatisches Malz','Aromatic Malt','Belges Aromatisches']))))
WHERE name = 'Aromatic Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Avangard Münchner Malz','Münchner Malz','Munich Malt']))))
WHERE name = 'Avangard Munich Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Avangard Pale Ale Malz','Pale Ale Malz']))))
WHERE name = 'Avangard Pale Ale Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Avangard Pilsnermalz','Pilsnermalz']))))
WHERE name = 'Avangard Pilsner Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Barke Pilsnermalz','Pilsenermalz','Barke Pils']))))
WHERE name = 'Barke Pilsner Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Buchenrauchmalz','Rauchmalz','Buchensmokedmalt','Smoked Malt']))))
WHERE name = 'Beech Smoked Barley Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Schwarzmalz','Schwarzmalz','Farbmalz']))))
WHERE name = 'Best Black Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Karamell Amber','Karamell Amber','Caramel Amber']))))
WHERE name = 'Best Caramel Amber' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Karamell Dunkel','Karamell Dunkel','Caramel Dark']))))
WHERE name = 'Best Caramel Dark' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Karamell Hell','Karamell Hell','Cara Hell','Caramel Hell']))))
WHERE name = 'Best Caramel Hell' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Chit Malt','Rohfrucht','Vormaischmalz']))))
WHERE name = 'Best Chit Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Heidelberger Malz','Best Heidelberg Malz']))))
WHERE name = 'Best Heidelberg' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Münchner Malz','Münchner Malz','Munich Malt']))))
WHERE name = 'Best Munich' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Münchner Dunkelmalz','Münchner Dunkelmalz','Dark Munich']))))
WHERE name = 'Best Munich Dark' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Pale Ale Malz','Pale Ale Malz']))))
WHERE name = 'Best Pale Ale' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Pilsenermalz','Pilsenermalz','Pilsner Malt']))))
WHERE name = 'Best Pilsen' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Rauchmalz','Rauchmalz','Smoked Malt']))))
WHERE name = 'Best Smoked' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Best Wiener Malz','Wiener Malz','Vienna Malt']))))
WHERE name = 'Best Vienna' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Biscuit Malz','Toast Malz','Toastmalz','Victory Malt']))))
WHERE name = 'Biscuit Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Schwarzmalz','Farbmalz','Röstmalz','Black Malt']))))
WHERE name = 'BlackSwaen© Black' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Schokoladenmalz','Chocolate Malz','BlackSwaen Schokolade']))))
WHERE name = 'BlackSwaen© Chocolate' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Kaffeemalz','Coffee Malt','Röstmalz Kaffee']))))
WHERE name = 'BlackSwaen© Coffee' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Brown Malz','Braunes Malz','Britisches Brown Malt']))))
WHERE name = 'Brown Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamell Hell','Helles Karamellmalz','Cara Clair','Chit Malt']))))
WHERE name = 'Cara Clair' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamell Gold','Cara Gold Malz']))))
WHERE name = 'Cara Gold' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamell Amber','Caraaroma','Karamellmalz Amber']))))
WHERE name = 'Caraamber' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamell Aroma','Karamellmalz Aroma']))))
WHERE name = 'Caraaroma' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamellmalz Belgien','Belgisches Karamell']))))
WHERE name = 'Carabelge' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Böhmisches Karamellmalz','Tschechisches Karamell','Bohemian Caramel']))))
WHERE name = 'Carabohemian' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Carafa 1','Carafa Typ 1','Carafa Typ I','Entfärbtes Schwarzmalz']))))
WHERE name = 'Carafa I' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Carafa 2','Carafa Typ 2','Carafa Typ II']))))
WHERE name = 'Carafa II' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Carafa 3','Carafa Typ 3','Carafa Typ III']))))
WHERE name = 'Carafa III' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Caramünch I','Caramünch 1','Karamellmünchner']))))
WHERE name = 'Caramunich I' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Caramünch II','Caramünch 2','Karamell Münchner']))))
WHERE name = 'Caramunich II' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Caramünch III','Caramünch 3']))))
WHERE name = 'Caramunich III' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamellpils','Dextrinmalz','Cara Pils','CaraPils']))))
WHERE name = 'Carapils' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Karamell Rot','Cara Red','Rotes Karamellmalz']))))
WHERE name = 'Carared' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Schwarzmalz','Schwarzmalz','Farbmalz']))))
WHERE name = 'Château Black' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Schokoladenmalz','Schokoladenmalz']))))
WHERE name = 'Château Chocolat' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Melanoidinmalz','Melanoidinmalz']))))
WHERE name = 'Château Melano' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Münchner Malz','Münchner Malz','Munich Malt']))))
WHERE name = 'Château Munich' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Pale Ale Malz','Pale Ale Malz']))))
WHERE name = 'Château Pale Ale' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Pilsenermalz','Pilsenermalz']))))
WHERE name = 'Château Pilsen' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Château Wiener Malz','Wiener Malz']))))
WHERE name = 'Château Vienna' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Schokoladenmalz','Chocolate Malz','Crisp Schokolade']))))
WHERE name = 'Crisp Chocolate Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Crystal 45','Crisp Crystal 45L','Karamellmalz 45']))))
WHERE name = 'Crisp Crystal 45' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Maris Otter','Britisches Pale Malz','MO Finest']))))
WHERE name = 'Crisp Finest Maris Otter' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Maris Otter Malz','Britisches Basismalz','MO']))))
WHERE name = 'Crisp Maris Otter' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Dunkles Weizenmalz','Dark Wheat','Dunkelweizenmalz']))))
WHERE name = 'Dark Wheat Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Fawcett Schokoladenmalz','Schokoladenmalz']))))
WHERE name = 'Fawcett Chocolate Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Fawcett Crystal 50','Crystal 50L']))))
WHERE name = 'Fawcett Crystal 50' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Maris Otter','Britisches Pale Malz','Fawcett MO']))))
WHERE name = 'Fawcett Maris Otter' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Pearl Malz','Pearl Malt','Britisches Basismalz']))))
WHERE name = 'Fawcett Pearl' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Röstgerste','Roasted Barley','Fawcett Röstgerste']))))
WHERE name = 'Fawcett Roasted Barley' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Gerstenflakes','Gersten Flocken','Rohgerste']))))
WHERE name = 'Flaked Barley' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Haferflocken','Hafer Flocken','Rolled Oats','Oatflakes']))))
WHERE name = 'Flaked Oats' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Amber Malz','Goldmalz','GoldSwaen Amber']))))
WHERE name = 'GoldSwaen© Amber' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Braunes Malz','Brown Malz','GoldSwaen Brown']))))
WHERE name = 'GoldSwaen© Brown' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Helles Malz','Pilsenermalz','Pils Malz']))))
WHERE name = 'GoldSwaen© Hell' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Honigmalz','Honey Malt','Bernstein Malz']))))
WHERE name = 'Honey Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Melanoidinmalz','Aromamalz']))))
WHERE name = 'Melanoidin' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Münchner Malz Typ 1','Münchner I','Munich Type I']))))
WHERE name = 'Munich I' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Münchner Malz Typ 2','Münchner II','Dunkles Münchner','Munich Type II']))))
WHERE name = 'Munich II' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Maris Otter Malz','Crystal Malt','Muntons Crystal']))))
WHERE name = 'Muntons Crystal Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Maris Otter','Britisches Pale Malz']))))
WHERE name = 'Muntons Maris Otter Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Propino Pale Ale Malz','Britisches Pale Malz']))))
WHERE name = 'Muntons Propino Pale Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Eichenrauch Weizenmalz','Rauch Weizenmalz','Oak Smoked Wheat']))))
WHERE name = 'Oak Smoked Wheat Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Hafermalz','Oat Malt','Hafenmalz']))))
WHERE name = 'Oat Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Helles Weizenmalz','Pale Wheat','Weizenmalz hell']))))
WHERE name = 'Pale Wheat Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Torfmalz','Rauchmalz Torf','Whisky Malz','Scotch Malt']))))
WHERE name = 'Peated Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Premium Pilsnermalz','Premium Pilsener','Pils Malz']))))
WHERE name = 'Premium Pilsner Malt' AND type = 'malt';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Amber Malz','Toast Malz','Toastmalz','Biscuit Malt']))))
WHERE name = 'Victory Malt' AND type = 'malt';

-- ─── HOPS ────────────────────────────────────────────────────────────────────

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Akoya Hopfen','Akoya Pellets']))))
WHERE name = 'Akoya' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Ariane Hopfen','Ariane Pellets','Ariane (DE)']))))
WHERE name = 'Ariane' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Azacca Hopfen','Azacca Pellets']))))
WHERE name = 'Azacca' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Callista Hopfen','Callista Pellets','Callista (DE)','Hallertauer Callista']))))
WHERE name = 'Callista' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Cashmere Hopfen','Cashmere Pellets']))))
WHERE name = 'Cashmere' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['EKG','Golding','Goldings','East Kent Goldings','Ostgoldinger']))))
WHERE name = 'East Kent Goldings' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Ekuanot Hopfen','Equinox','HBC 366']))))
WHERE name = 'Ekuanot' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['First Gold Hopfen','First Gold Pellets','UK First Gold']))))
WHERE name = 'First Gold' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Hallertau Blanc','Hallertauer Blanc','Blanc Pellets']))))
WHERE name = 'Hallertau Blanc' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Hallertauer Mittelfrüh','Hallertauer MF','HallMF','Hallertau MF']))))
WHERE name = 'Hallertau Mittelfrüh' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Hallertau Tradition','Hallertauer Tradition','Tradition Pellets']))))
WHERE name = 'Hallertau Tradition' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Hüll Melon','Huell Melon Pellets','Hüll Melon Pellets','Hull Melon']))))
WHERE name = 'Huell Melon' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Kohatu Hopfen','Kohatu Pellets','Kohatu (NZ)']))))
WHERE name = 'Kohatu' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Moutere Hopfen','Moutere Pellets','Moutere (NZ)']))))
WHERE name = 'Moutere' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Progress Hopfen','Progress Pellets','UK Progress']))))
WHERE name = 'Progress' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Rākau Hopfen','Rakau Pellets','Rakau (NZ)']))))
WHERE name = 'Rakau' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Sovereign Hopfen','Sovereign Pellets','UK Sovereign']))))
WHERE name = 'Sovereign' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Spalter','Spalt Hopfen','Spalt Pellets','Hallertauer Spalt']))))
WHERE name = 'Spalt' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Styrian Goldings','Celeia','Styrian Golding Pellets','Slowenische Goldings']))))
WHERE name = 'Styrian Golding' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Talus Hopfen','Talus Pellets','HBC 692']))))
WHERE name = 'Talus' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Target Hopfen','Target Pellets','UK Target']))))
WHERE name = 'Target' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Wai-iti Hopfen','Wai-iti Pellets','Waiiti','Wai iti (NZ)']))))
WHERE name = 'Wai-iti' AND type = 'hop';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Wakatu Hopfen','Wakatu Pellets','Wakatu (NZ)','Hallertauer Aroma']))))
WHERE name = 'Wakatu' AND type = 'hop';

-- Cross-reference: Hallertau Mittelfrüh <-> Hallertauer Mittelfrüh
UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Hallertau Mittelfrüh','Hallertauer MF','HallMF','Hallertau MF','Hallertauer Pellets','Mittelfrüh']))))
WHERE name = 'Hallertauer Mittelfrüh' AND type = 'hop';

-- ─── YEASTS ──────────────────────────────────────────────────────────────────

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafBrew BE-134','Belgische Saison Hefe','Abbaye Hefe','Belgian Saison']))))
WHERE name = 'BE-134' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafAle BE-256','Abbaye','Belgische Ale Hefe','Belgian Ale Yeast']))))
WHERE name = 'BE-256' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafAle K-97','Weizen Kölsch Hefe','Deutsche Ale Hefe']))))
WHERE name = 'K-97' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['LalBrew Abbaye Hefe','Belgische Klosterhefe','Trappistenhefe','Abbey Yeast']))))
WHERE name = 'LalBrew Abbaye' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Diamond Lagerhefe','Tschechische Lagerhefe','Czech Lager Yeast']))))
WHERE name = 'LalBrew Diamond' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Bauernhofhefe','Saison Hefe','Farmhouse Yeast','LalBrew Saison']))))
WHERE name = 'LalBrew Farmhouse' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Münchner Weizenhefe','Bayrische Weizenhefe','Munich Classic Hefe','Hefeweizen']))))
WHERE name = 'LalBrew Munich Classic' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Nottingham','Nottingham Ale','Britische Trockenhefe']))))
WHERE name = 'LalBrew Nottingham' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['NovaLager','Nova Lager Hefe','Lagerhefe','Amerikanische Lagerhefe']))))
WHERE name = 'LalBrew NovaLager' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Verdant IPA Hefe','Verdant','Hazy IPA Hefe','London Ale III']))))
WHERE name = 'LalBrew Verdant IPA' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Voss Kveik','Kveik','Norwegische Hefe','Farmhouse Kveik']))))
WHERE name = 'LalBrew Voss Kveik' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Windsor Englische Hefe','Britische Ale Hefe','Mild Ale Yeast']))))
WHERE name = 'LalBrew Windsor' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Mangrove Jack M15','Empire Ale','Britische Ale Hefe']))))
WHERE name = 'MJ M15 Empire Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Bayrische Weizenhefe','Hefeweizen Hefe','Weizen Hefe','Bavarian Wheat']))))
WHERE name = 'MJ M20 Bavarian Wheat' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Belgische Wit Hefe','Witbier Hefe','Belgian Wit Yeast']))))
WHERE name = 'MJ M21 Belgian Wit' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Französische Saison Hefe','Saison Farmhouse','French Saison']))))
WHERE name = 'MJ M29 French Saison' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Belgische Tripel Hefe','Trappistenhefe Tripel','Belgian Tripel Yeast']))))
WHERE name = 'MJ M31 Belgian Tripel' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Liberty Bell Hefe','M36','Britische Ale Hefe']))))
WHERE name = 'MJ M36 Liberty Bell' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Belgische Ale Hefe','M41 Belgian','Belgian Ale Yeast']))))
WHERE name = 'MJ M41 Belgian Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Starke Ale Hefe','New World Strong','High Gravity Yeast']))))
WHERE name = 'MJ M42 New World Strong Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['US West Coast Hefe','M44','West Coast Ale','Californische Ale Hefe']))))
WHERE name = 'MJ M44 US West Coast' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['Californische Lagerhefe','California Lager','M54']))))
WHERE name = 'MJ M54 Californian Lager' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafLager S-189','Schweizer Lagerhefe','Swiss Lager','S189']))))
WHERE name = 'S-189' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafLager S-23','Berliner Lagerhefe','European Lager','S23']))))
WHERE name = 'S-23' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafAle T-58','Belgische Trockenhefe','Belgisch T58','Belgian T-58']))))
WHERE name = 'T-58' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['W34/70','34/70 Hefe','Weihenstephaner Lagerhefe','Saflager W-34/70']))))
WHERE name = 'W-34/70' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['SafBrew WB-06','Weizenbier Hefe','Hefeweizen Trockenhefe','WB06']))))
WHERE name = 'WB-06' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP004','Irische Ale Hefe','Irish Ale Yeast']))))
WHERE name = 'WLP004 Irish Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP005','Britische Ale Hefe','British Ale Yeast']))))
WHERE name = 'WLP005 British Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP007','Trockene Englische Hefe','Dry English Ale']))))
WHERE name = 'WLP007 Dry English Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP008','East Coast Hefe','East Coast Yeast']))))
WHERE name = 'WLP008 East Coast Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP013','Londoner Ale Hefe','London Ale Yeast']))))
WHERE name = 'WLP013 London Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP023','Burton Ale Hefe','Burton Ale Yeast']))))
WHERE name = 'WLP023 Burton Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP036','Düsseldorfer Altbier Hefe','Altbier Yeast']))))
WHERE name = 'WLP036 Dusseldorf Alt' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP300','Hefeweizen Hefe','Weizenbier Hefe','Weizenhefe']))))
WHERE name = 'WLP300 Hefeweizen Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP500','Belgische Klosterhefe','Trappistenhefe','Chimay Hefe']))))
WHERE name = 'WLP500 Abbey Ale' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP530','Belgische Klosterhefe II','Westmalle Hefe','Trappisten Hefe']))))
WHERE name = 'WLP530 Abbey Ale II' AND type = 'yeast';

UPDATE ingredient_master SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(array_cat(aliases, ARRAY['White Labs WLP833','Bockbier Hefe','Bayrische Bock Lagerhefe']))))
WHERE name = 'WLP833 German Bock Lager' AND type = 'yeast';
