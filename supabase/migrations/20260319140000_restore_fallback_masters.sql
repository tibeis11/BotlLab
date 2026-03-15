-- Stellt die Fallback-Master-Einträge wieder her, die durch das DELETE in
-- 20260318550000_generic_ingredients_seed.sql entfernt wurden.
-- Diese IDs werden vom JSONB-Migrations-Script als Fallback für nicht erkannte Zutaten genutzt.

INSERT INTO public.ingredient_master (id, name, type, aliases, description)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'Unbekanntes Malz',    'malt',  ARRAY['Unknown Malt',  'Sonstiges Malz'],   'Fallback für nicht erkennbare Malz-Imports'),
  ('00000000-0000-4000-a000-000000000002', 'Unbekannter Hopfen',  'hop',   ARRAY['Unknown Hop',   'Sonstiges Hopfen'], 'Fallback für nicht erkennbare Hopfen-Imports'),
  ('00000000-0000-4000-a000-000000000003', 'Unbekannte Hefe',     'yeast', ARRAY['Unknown Yeast', 'Sonstige Hefe'],    'Fallback für nicht erkennbare Hefe-Imports'),
  ('00000000-0000-4000-a000-000000000004', 'Unbekannte Zutat',    'misc',  ARRAY['Unknown Misc',  'Sonstige Zutat'],   'Fallback für nicht erkennbare Misc-Imports')
ON CONFLICT (id) DO NOTHING;
