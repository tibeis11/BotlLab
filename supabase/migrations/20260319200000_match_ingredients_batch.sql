-- Migration: match_ingredients_batch()
--
-- Batch-Version von match_ingredient(): alle Zutaten eines Rezepts in einem
-- einzigen Datenbank-Aufruf abgleichen statt N einzelner Roundtrips.
--
-- Vorher: N Zutaten = N HTTP-Calls App → DB (N+1 Problem)
-- Nachher: N Zutaten = 1 HTTP-Call App → DB (intern sequenziell, aber kein Netzwerk-Overhead)
--
-- Input:  JSONB-Array mit { raw_name, type } Objekten
-- Output: Gleiche Spalten wie match_ingredient(), plus input_index (0-basiert)
--         damit der Aufrufer die Ergebnisse den ursprünglichen Zutaten zuordnen kann.
--
-- Beispiel-Aufruf:
--   SELECT * FROM match_ingredients_batch('[
--     {"raw_name": "Pilsner Malz", "type": "malt"},
--     {"raw_name": "Citra",        "type": "hop"},
--     {"raw_name": "US-05",        "type": "yeast"}
--   ]');

CREATE OR REPLACE FUNCTION public.match_ingredients_batch(p_terms JSONB)
RETURNS TABLE (
  input_index   int,
  master_id     uuid,
  name          text,
  type          text,
  match_score   real,
  match_level   int,
  color_ebc     numeric,
  potential_pts numeric,
  alpha_pct     numeric,
  attenuation_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term JSONB;
  v_idx  int := 0;
BEGIN
  FOR v_term IN SELECT value FROM jsonb_array_elements(p_terms) LOOP
    -- Bestehende match_ingredient()-Logik wiederverwenden — kein doppelter Code
    RETURN QUERY
    SELECT v_idx, r.*
    FROM public.match_ingredient(
      v_term->>'raw_name',
      v_term->>'type'
    ) r;

    v_idx := v_idx + 1;
  END LOOP;
END;
$$;
