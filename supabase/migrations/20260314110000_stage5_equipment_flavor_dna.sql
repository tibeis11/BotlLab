-- ══════════════════════════════════════════════════════════════════════════════
-- Stage 5: Context-Anreicherung — Equipment Profile + Flavor DNA
--
-- Updates get_user_brew_context to accept an optional brewery_id and return:
--   - equipmentProfile  → default equipment profile for this brewery
--   - flavorDna         → AVG flavor dimensions (all profiles submitted by this user)
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop all existing overloads before recreating with new signature
DROP FUNCTION IF EXISTS public.get_user_brew_context(uuid);
DROP FUNCTION IF EXISTS public.get_user_brew_context(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_brew_context(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_user_brew_context(
  p_user_id    uuid,
  p_session_id uuid DEFAULT NULL,
  p_brewery_id uuid DEFAULT NULL
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

    -- Experience tier (used for prompt-depth adaptation)
    'experienceTier', (
      SELECT p.tier
      FROM public.profiles p
      WHERE p.id = p_user_id
      LIMIT 1
    ),

    -- Last 5 brews with full recipe DNA
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

    -- Active session measurements
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
    END,

    -- Default equipment profile for this brewery (NULL if no brewery_id given)
    'equipmentProfile', CASE
      WHEN p_brewery_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'name',             ep.name,
          'brewMethod',       ep.brew_method,
          'batchVolumeL',     ep.batch_volume_l,
          'boilOffRateL',     ep.boil_off_rate,
          'trubLossL',        ep.trub_loss,
          'grainAbsorption',  ep.grain_absorption,
          'mashThickness',    ep.mash_thickness
        )
        FROM public.equipment_profiles ep
        WHERE ep.brewery_id = p_brewery_id
          AND ep.is_default = true
        LIMIT 1
      )
      ELSE NULL
    END,

    -- Flavor DNA: average of all flavor_profile entries created by this user.
    -- Represents the brewer's personal sensory fingerprint across their brews.
    'flavorDna', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN jsonb_build_object(
          'count',      COUNT(*),
          'sweetness',  ROUND(AVG(fp.sweetness)::numeric, 3),
          'bitterness', ROUND(AVG(fp.bitterness)::numeric, 3),
          'body',       ROUND(AVG(fp.body)::numeric, 3),
          'roast',      ROUND(AVG(fp.roast)::numeric, 3),
          'fruitiness', ROUND(AVG(fp.fruitiness)::numeric, 3)
        )
        ELSE NULL
      END
      FROM public.flavor_profiles fp
      WHERE fp.user_id = p_user_id
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_brew_context TO authenticated, service_role;
