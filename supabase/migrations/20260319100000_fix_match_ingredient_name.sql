-- Fix: match_ingredient RPC gibt jetzt konsistent im.name (Master-Name) zurück.
--
-- Vorher: Level 1 + Level 4 gaben ip.name (Produkt-Name, z.B. "Safale US-05 11.5g")
--         zurück, obwohl Level 2/3/5 bereits im.name (Master-Name, z.B. "Safale US-05")
--         lieferten. Das führte dazu, dass beim Import der Produktname statt des
--         kanonischen Namens in recipe_ingredients landete.
--
-- Nach dem Fix: Alle Level geben im.name zurück. ip.name wird weiterhin für den
-- Abgleich (WHERE-Klausel) genutzt, aber nicht mehr als Display-Name exportiert.

CREATE OR REPLACE FUNCTION match_ingredient(
    search_term text,
    search_type text
)
RETURNS TABLE (
    master_id uuid,
    name text,
    type text,
    match_score real,
    match_level int,
    color_ebc numeric,
    potential_pts numeric,
    alpha_pct numeric
) AS $$
BEGIN
    -- Level 1: Exact match on product name (z.B. "Weyermann Pilsner Malt")
    RETURN QUERY
    SELECT
        im.id         AS master_id,
        im.name,                     -- Master-Name statt Produkt-Name
        im.type,
        1.0::real     AS match_score,
        1             AS match_level,
        ip.color_ebc,
        ip.potential_pts,
        ip.alpha_pct
    FROM ingredient_products ip
    JOIN ingredient_master im ON im.id = ip.master_id
    WHERE im.type = search_type
      AND ip.name ILIKE search_term
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 2: Exact match on master name or alias (z.B. "Pilsner Malt")
    RETURN QUERY
    SELECT
        im.id         AS master_id,
        im.name,
        im.type,
        0.9::real     AS match_score,
        2             AS match_level,
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type
      AND (
          im.name ILIKE search_term
          OR search_term ILIKE ANY(im.aliases)
      )
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 3: Alias Substring
    RETURN QUERY
    SELECT
        im.id         AS master_id,
        im.name,
        im.type,
        0.8::real     AS match_score,
        3             AS match_level,
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type
      AND EXISTS (
          SELECT 1 FROM unnest(im.aliases) alias
          WHERE length(alias) >= 3
            AND (search_term ILIKE '%' || alias || '%' OR alias ILIKE '%' || search_term || '%')
      )
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 4: Fuzzy Match on Product Name — gibt jetzt je Master-Name zurück
    RETURN QUERY
    SELECT
        im.id                                  AS master_id,
        im.name,                               -- Master-Name statt Produkt-Name
        im.type,
        similarity(ip.name, search_term)       AS match_score,
        4                                      AS match_level,
        ip.color_ebc,
        ip.potential_pts,
        ip.alpha_pct
    FROM ingredient_products ip
    JOIN ingredient_master im ON im.id = ip.master_id
    WHERE im.type = search_type
      AND similarity(ip.name, search_term) > 0.4
    ORDER BY similarity(ip.name, search_term) DESC
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 5: Fuzzy Match on Master Name / aliases_flat
    RETURN QUERY
    SELECT
        im.id                                       AS master_id,
        im.name,
        im.type,
        similarity(im.aliases_flat, search_term)    AS match_score,
        5                                           AS match_level,
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type
      AND similarity(im.aliases_flat, search_term) > 0.25
    ORDER BY similarity(im.aliases_flat, search_term) DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
