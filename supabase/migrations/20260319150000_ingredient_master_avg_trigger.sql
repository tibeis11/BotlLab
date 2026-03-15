-- Trigger: Hält ingredient_master.color_ebc / alpha_pct / potential_pts
-- automatisch als Durchschnitt aller zugehörigen ingredient_products-Zeilen aktuell.
-- Läuft nach INSERT, UPDATE oder DELETE auf ingredient_products.

CREATE OR REPLACE FUNCTION update_ingredient_master_averages()
RETURNS TRIGGER AS $$
DECLARE
  v_master_id UUID;
BEGIN
  -- Bei DELETE den master_id aus OLD holen, sonst aus NEW
  v_master_id := COALESCE(NEW.master_id, OLD.master_id);

  UPDATE public.ingredient_master
  SET
    color_ebc     = (SELECT AVG(color_ebc)     FROM public.ingredient_products WHERE master_id = v_master_id AND color_ebc     IS NOT NULL),
    alpha_pct     = (SELECT AVG(alpha_pct)     FROM public.ingredient_products WHERE master_id = v_master_id AND alpha_pct     IS NOT NULL),
    potential_pts = (SELECT AVG(potential_pts) FROM public.ingredient_products WHERE master_id = v_master_id AND potential_pts IS NOT NULL)
  WHERE id = v_master_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_ingredient_products_update_master_avgs
AFTER INSERT OR UPDATE OR DELETE ON public.ingredient_products
FOR EACH ROW
EXECUTE FUNCTION update_ingredient_master_averages();

-- Einmalig alle Durchschnitte für bestehende Daten berechnen
UPDATE public.ingredient_master im
SET
  color_ebc     = agg.avg_color_ebc,
  alpha_pct     = agg.avg_alpha_pct,
  potential_pts = agg.avg_potential_pts
FROM (
  SELECT
    master_id,
    AVG(color_ebc)     AS avg_color_ebc,
    AVG(alpha_pct)     AS avg_alpha_pct,
    AVG(potential_pts) AS avg_potential_pts
  FROM public.ingredient_products
  GROUP BY master_id
) agg
WHERE im.id = agg.master_id;
