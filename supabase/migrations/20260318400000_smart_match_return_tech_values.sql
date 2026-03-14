-- Function to retrieve ingredient match along with technical stats
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
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND (
        im.name ILIKE search_term 
        OR search_term ILIKE ANY(im.aliases)
    );

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
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND EXISTS (
        SELECT 1 FROM unnest(im.aliases) alias 
        WHERE length(alias) >= 3  -- Prevent tiny alias matches
        AND (search_term ILIKE '%' || alias || '%' OR alias ILIKE '%' || search_term || '%')
    );

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
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct
    FROM ingredient_master im
    WHERE im.type = search_type 
    AND similarity(im.aliases_flat, search_term) > 0.25
    ORDER BY match_score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;