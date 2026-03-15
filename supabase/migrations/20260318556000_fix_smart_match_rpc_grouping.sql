-- Fix the RPC to properly group and only return one generic master
DROP FUNCTION IF EXISTS match_ingredient(text, text);

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
    -- Level 1: Exact match on product name (if someone says "Weyermann Pilsner Malt")
    RETURN QUERY
    SELECT 
        im.id as master_id,
        ip.name,
        im.type,
        1.0::real as match_score,
        1 as match_level,
        ip.color_ebc,
        ip.potential_pts,
        ip.alpha_pct
    FROM ingredient_products ip
    JOIN ingredient_master im ON im.id = ip.master_id
    WHERE im.type = search_type 
    AND ip.name ILIKE search_term;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 2: Exact match on master name or alias (Generic like "Pilsner Malt")
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        0.9::real as match_score,
        2 as match_level,
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

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 3: Alias Substring (Generic)
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        0.8::real as match_score,
        3 as match_level,
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

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 4: Fuzzy Match on Product Name
    RETURN QUERY
    SELECT 
        im.id as master_id,
        ip.name,
        im.type,
        similarity(ip.name, search_term) as match_score,
        4 as match_level,
        ip.color_ebc,
        ip.potential_pts,
        ip.alpha_pct
    FROM ingredient_products ip
    JOIN ingredient_master im ON im.id = ip.master_id
    WHERE im.type = search_type 
    AND similarity(ip.name, search_term) > 0.4
    ORDER BY similarity(ip.name, search_term) DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 5: Fuzzy Match on Master Name
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        similarity(im.aliases_flat, search_term) as match_score,
        5 as match_level,
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND similarity(im.aliases_flat, search_term) > 0.25
    ORDER BY similarity(im.aliases_flat, search_term) DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
