-- ══════════════════════════════════════════════════════════════════════════════
-- Stage 5: Context-Anreicherung — Brewing DNA
-- 
-- Updates get_user_brew_context RPC to include:
--   1. brews.data JSONB fields (malts, hops, yeast) per brew
--   2. profiles.tier (experience level) for prompt-depth adaptation
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_brew_context(
  p_user_id    uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(

    -- Experience tier of the brewer (hobby / geselle / meister / legende / etc.)
    'experienceTier', (
      SELECT p.tier
      FROM public.profiles p
      WHERE p.id = p_user_id
      LIMIT 1
    ),

    -- Last 5 recipes including full ingredient DNA from data JSONB
    'recentBrews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          b.id,
          'name',        b.name,
          'style',       b.style,
          'brewType',    b.brew_type,
          'og',          b.og,
          'fg',          b.fg,
          'abv',         b.abv,
          'ibu',         b.ibu,
          'batchSizeL',  b.batch_size_liters,
          'createdAt',   b.created_at,

          -- Stage 5: Recipe DNA from data JSONB
          -- These keys match what BrewEditor stores in the `data` column
          'malts',       b.data -> 'malts',
          'hops',        b.data -> 'hops',
          'yeast',       b.data -> 'yeast'
        )
        ORDER BY b.created_at DESC
      )
      FROM (
        SELECT b2.*
        FROM public.brews b2
        WHERE b2.user_id = p_user_id
        ORDER BY b2.created_at DESC
        LIMIT 5
      ) b
    ),

    -- Active session measurements (for Coach fermentation analysis)
    'sessionMeasurements', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_agg(
          jsonb_build_object(
            'measuredAt', m.measured_at,
            'gravity',    m.gravity,
            'temperature',m.temperature,
            'ph',         m.ph,
            'notes',      m.notes
          )
          ORDER BY m.measured_at ASC
        )
        FROM public.brew_measurements m
        WHERE m.session_id = p_session_id
      )
      ELSE NULL
    END

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_brew_context TO authenticated, service_role;
