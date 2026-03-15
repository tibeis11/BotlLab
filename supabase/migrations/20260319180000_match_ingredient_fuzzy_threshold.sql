-- Erhöht den Fuzzy-Match-Threshold in match_ingredient() von 0.25 auf 0.35.
--
-- Hintergrund: 0.25 war zu niedrig — kurze Namen wie "Malt" oder "Hop" ergaben
-- false positives (similarity ~0.30) auf völlig falsche Master-Einträge.
-- 0.35 eliminiert diese False Positives und behält echte partielle Matches.

DROP FUNCTION IF EXISTS match_ingredient(text, text);

CREATE FUNCTION match_ingredient(
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
    alpha_pct numeric,
    attenuation_pct numeric
) AS $$
BEGIN
    -- Level 1: Exact match on product name
    RETURN QUERY
    SELECT
        im.id         AS master_id,
        im.name,
        im.type,
        1.0::real     AS match_score,
        1             AS match_level,
        ip.color_ebc,
        ip.potential_pts,
        ip.alpha_pct,
        ip.attenuation_pct
    FROM ingredient_products ip
    JOIN ingredient_master im ON im.id = ip.master_id
    WHERE im.type = search_type
      AND ip.name ILIKE search_term
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 2: Exact match on master name or alias
    RETURN QUERY
    SELECT
        im.id         AS master_id,
        im.name,
        im.type,
        0.9::real     AS match_score,
        2             AS match_level,
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct,
        (SELECT ROUND(AVG(ip2.attenuation_pct), 0)
         FROM ingredient_products ip2
         WHERE ip2.master_id = im.id
           AND ip2.attenuation_pct IS NOT NULL)::numeric AS attenuation_pct
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
        im.alpha_pct,
        (SELECT ROUND(AVG(ip2.attenuation_pct), 0)
         FROM ingredient_products ip2
         WHERE ip2.master_id = im.id
           AND ip2.attenuation_pct IS NOT NULL)::numeric AS attenuation_pct
    FROM ingredient_master im
    WHERE im.type = search_type
      AND EXISTS (
          SELECT 1 FROM unnest(im.aliases) alias
          WHERE length(alias) >= 3
            AND (search_term ILIKE '%' || alias || '%' OR alias ILIKE '%' || search_term || '%')
      )
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 4: Fuzzy Match on Product Name (threshold 0.4 — unchanged)
    RETURN QUERY
    SELECT
        im.id                                  AS master_id,
        im.name,
        im.type,
        similarity(ip.name, search_term)       AS match_score,
        4                                      AS match_level,
        ip.color_ebc,
        ip.potential_pts,
        ip.alpha_pct,
        ip.attenuation_pct
    FROM ingredient_products ip
    JOIN ingredient_master im ON im.id = ip.master_id
    WHERE im.type = search_type
      AND similarity(ip.name, search_term) > 0.4
    ORDER BY similarity(ip.name, search_term) DESC
    LIMIT 1;

    IF FOUND THEN RETURN; END IF;

    -- Level 5: Fuzzy Match on Master Name / aliases_flat (threshold raised: 0.25 → 0.35)
    RETURN QUERY
    SELECT
        im.id                                       AS master_id,
        im.name,
        im.type,
        similarity(im.aliases_flat, search_term)    AS match_score,
        5                                           AS match_level,
        im.color_ebc,
        im.potential_pts,
        im.alpha_pct,
        (SELECT ROUND(AVG(ip2.attenuation_pct), 0)
         FROM ingredient_products ip2
         WHERE ip2.master_id = im.id
           AND ip2.attenuation_pct IS NOT NULL)::numeric AS attenuation_pct
    FROM ingredient_master im
    WHERE im.type = search_type
      AND similarity(im.aliases_flat, search_term) > 0.35
    ORDER BY similarity(im.aliases_flat, search_term) DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
