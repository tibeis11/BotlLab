-- Fügt '34/70' und verwandte Kurzschreibweisen als Aliases für alle W-34/70-Hefeneinträge hinzu.
--
-- Hintergrund: "34/70" ist die in MMuM-Rezepten häufig verwendete Kurzform für
-- die Fermentis Saflager W-34/70. Ohne diesen Alias schlägt der match_ingredient-RPC
-- bei solchen Importdateien fehl.
--
-- Korrigiert außerdem den Mismatch in 20260318600000_german_aliases.sql, dessen
-- WHERE-Klausel auf 'W34/70' (ohne Bindestrich) zielt und daher keinen Row trifft.

UPDATE ingredient_master
SET aliases = array_cat(
  COALESCE(aliases, ARRAY[]::TEXT[]),
  ARRAY['34/70', 'W34/70', 'Saflager W-34/70', 'Saflager 34/70']
)
WHERE type = 'yeast'
  AND (name ILIKE '%W-34/70%' OR name ILIKE '%W34/70%');
