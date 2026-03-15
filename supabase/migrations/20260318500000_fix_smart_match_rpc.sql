-- Fix the RPC to properly join ingredient_products for technical parameters
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
    -- Level 1: Exact match (name or alias matches search term exactly, case-insensitive)
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        1.0::real as match_score,
        1 as match_level,
        ROUND(AVG(ip.color_ebc)::numeric, 2) as color_ebc,
        ROUND(AVG(ip.potential_pts)::numeric, 3) as potential_pts,
        ROUND(AVG(ip.alpha_pct)::numeric, 2) as alpha_pct
    FROM ingredient_master im
    LEFT JOIN ingredient_products ip ON ip.master_id = im.id
    WHERE im.type = search_type 
    AND (
        im.name ILIKE search_term 
        OR search_term ILIKE ANY(im.aliases)
    )
    GROUP BY im.id, im.name, im.type;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 2: Alias is contained in search term or vice versa
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        0.8::real as match_score,
        2 as match_level,
        ROUND(AVG(ip.color_ebc)::numeric, 2) as color_ebc,
        ROUND(AVG(ip.potential_pts)::numeric, 3) as potential_pts,
        ROUND(AVG(ip.alpha_pct)::numeric, 2) as alpha_pct
    FROM ingredient_master im
    LEFT JOIN ingredient_products ip ON ip.master_id = im.id
    WHERE im.type = search_type 
    AND EXISTS (
        SELECT 1 FROM unnest(im.aliases) alias 
        WHERE length(alias) >= 3
        AND (search_term ILIKE '%' || alias || '%' OR alias ILIKE '%' || search_term || '%')
    )
    GROUP BY im.id, im.name, im.type;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Level 3: Fuzzy Match (pg_trgm)
    RETURN QUERY
    SELECT 
        im.id as master_id,
        im.name,
        im.type,
        similarity(im.aliases_flat, search_term) as match_score,
        3 as match_level,
        ROUND(AVG(ip.color_ebc)::numeric, 2) as color_ebc,
        ROUND(AVG(ip.potential_pts)::numeric, 3) as potential_pts,
        ROUND(AVG(ip.alpha_pct)::numeric, 2) as alpha_pct
    FROM ingredient_master im
    LEFT JOIN ingredient_products ip ON ip.master_id = im.id
    WHERE im.type = search_type 
    AND similarity(im.aliases_flat, search_term) > 0.25
    GROUP BY im.id, im.name, im.type, im.aliases_flat
    ORDER BY similarity(im.aliases_flat, search_term) DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;