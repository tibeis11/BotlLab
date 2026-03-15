-- Aktualisiert den Trigger und rundet alle Durchschnittswerte auf 1 Nachkommastelle.

CREATE OR REPLACE FUNCTION update_ingredient_master_averages()
RETURNS TRIGGER AS $$
DECLARE
  v_master_id UUID;
BEGIN
  v_master_id := COALESCE(NEW.master_id, OLD.master_id);

  UPDATE public.ingredient_master
  SET
    color_ebc     = ROUND((SELECT AVG(color_ebc)     FROM public.ingredient_products WHERE master_id = v_master_id AND color_ebc     IS NOT NULL)::NUMERIC, 1),
    alpha_pct     = ROUND((SELECT AVG(alpha_pct)     FROM public.ingredient_products WHERE master_id = v_master_id AND alpha_pct     IS NOT NULL)::NUMERIC, 1),
    potential_pts = ROUND((SELECT AVG(potential_pts) FROM public.ingredient_products WHERE master_id = v_master_id AND potential_pts IS NOT NULL)::NUMERIC, 1)
  WHERE id = v_master_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bestehende Werte einmalig runden
UPDATE public.ingredient_master
SET
  color_ebc     = ROUND(color_ebc::NUMERIC,     1),
  alpha_pct     = ROUND(alpha_pct::NUMERIC,     1),
  potential_pts = ROUND(potential_pts::NUMERIC, 1)
WHERE color_ebc IS NOT NULL OR alpha_pct IS NOT NULL OR potential_pts IS NOT NULL;
