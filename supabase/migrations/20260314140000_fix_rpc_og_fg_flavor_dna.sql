-- ══════════════════════════════════════════════════════════════════════════════
-- BUGFIX: get_user_brew_context — zwei kritische Korrekturen
--
-- BUG 1: b.og, b.fg, b.batch_size_liters sind keine echten Spalten auf brews.
--         Diese Werte liegen in brews.data JSONB. Seit Stage 3 gab die RPC
--         für OG, FG und batchSizeL immer NULL zurück.
--         FIX: Extraktion via data->>'og', data->>'fg', data->>'batch_size_liters'
--
-- BUG 2: flavorDna aggregierte WHERE fp.user_id = p_user_id — das sind die
--         Flavor-Profile die dieser User als CONSUMER auf fremde Biere
--         abgegeben hat (via Beat the Brewer). Für die Brauer-DNA brauchen
--         wir die Profile die über die EIGENEN Brews des Brauers abgegeben
--         wurden — also die Community-Bewertung seiner Biere.
--         FIX: WHERE fp.brew_id IN (SELECT id FROM brews WHERE user_id = ...)
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop all existing overloads before recreating
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

    -- Last 5 brews with full recipe DNA + community rating
    -- BUG 1 FIX: og, fg, batchSizeL now extracted from data JSONB (no top-level columns)
    --            abv and ibu are real columns (migration 20260222140000)
    'recentBrews', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          b.id,
          'name',        b.name,
          'style',       b.style,
          'brewType',    b.brew_type,
          'og',          (b.data ->> 'og'),
          'fg',          (b.data ->> 'fg'),
          'abv',         b.abv,
          'ibu',         b.ibu,
          'batchSizeL',  (b.data ->> 'batch_size_liters'),
          'createdAt',   b.created_at,
          'malts',       b.data -> 'malts',
          'hops',        b.data -> 'hops',
          'yeast',       b.data -> 'yeast',
          -- Community rating signal
          'avgRating',   (
            SELECT ROUND(AVG(r.rating)::numeric, 1)
            FROM public.ratings r
            WHERE r.brew_id = b.id
              AND r.moderation_status = 'auto_approved'
          ),
          'ratingCount', (
            SELECT COUNT(*)
            FROM public.ratings r
            WHERE r.brew_id = b.id
              AND r.moderation_status = 'auto_approved'
          )
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

    -- Best-rated brew: recipe parameters of the most successful recipe.
    -- Requires at least 2 ratings to avoid single-vote noise.
    -- BUG 1 FIX: og extracted from data JSONB
    'topRatedBrew', (
      SELECT jsonb_build_object(
        'name',        b.name,
        'style',       b.style,
        'og',          (b.data ->> 'og'),
        'ibu',         b.ibu,
        'avgRating',   ROUND(AVG(r.rating)::numeric, 1),
        'ratingCount', COUNT(r.id)
      )
      FROM public.brews b
      JOIN public.ratings r ON r.brew_id = b.id
      WHERE b.user_id = p_user_id
        AND r.moderation_status = 'auto_approved'
      GROUP BY b.id, b.name, b.style, b.data, b.ibu
      HAVING COUNT(r.id) >= 2
      ORDER BY AVG(r.rating) DESC, COUNT(r.id) DESC
      LIMIT 1
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

    -- BUG 2 FIX: Flavor DNA — average of all flavor profiles submitted
    -- ON THIS BREWER'S BREWS (by any user via Beat the Brewer / ratings).
    -- Previously: WHERE fp.user_id = p_user_id → wrong! That gave the
    --   profiles this user submitted AS A CONSUMER on other people's brews.
    -- Now: WHERE fp.brew_id IN (SELECT id FROM brews WHERE user_id = p_user_id)
    --   → aggregates community taste perception of this brewer's own beers.
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
      WHERE fp.brew_id IN (
        SELECT br.id FROM public.brews br WHERE br.user_id = p_user_id
      )
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_brew_context TO authenticated, service_role;
