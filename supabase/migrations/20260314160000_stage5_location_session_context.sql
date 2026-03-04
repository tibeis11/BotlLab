-- ══════════════════════════════════════════════════════════════════════════════
-- Stage 5 Extended: breweries.location → Wasserchemie-Proxy
--                   brewing_sessions.* → Prozess-Kontext
--
-- 1. equipmentProfile now includes `location` from breweries (always present
--    when p_brewery_id is set, even when no equipment_profile exists yet).
--    → buildEquipmentContext() in route.ts will map known city names to
--      water-chemistry hints ("München → weiches Wasser – ideal für Weizen").
--
-- 2. sessionContext: when p_session_id is set, exposes
--    - phase, status (current brewing stage)
--    - notes (brewer's free-text session notes)
--    - currentGravity, apparentAttenuation (cached quick-access values)
--    - processNotes: last 10 NOTE events from the timeline JSONB
--      (step completions and manual notes the brewer wrote during brewing)
--    Complements sessionMeasurements (which already gives gravity curve).
-- ══════════════════════════════════════════════════════════════════════════════

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

    -- ── Experience tier ────────────────────────────────────────────────────
    'experienceTier', (
      SELECT p.tier
      FROM public.profiles p
      WHERE p.id = p_user_id
      LIMIT 1
    ),

    -- ── Last 5 brews with recipe DNA + community reception ────────────────
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

    -- ── Best-rated brew (community validated recipe) ───────────────────────
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

    -- ── Inspiration signal: liked foreign brews ───────────────────────────
    'inspirationSignal', (
      WITH liked_foreign AS (
        SELECT b.style, b.data -> 'hops' AS hops_json
        FROM public.likes l
        JOIN public.brews b ON b.id = l.brew_id
        WHERE l.user_id = p_user_id
          AND b.user_id != p_user_id
          AND b.is_public = true
      ),
      top_styles AS (
        SELECT style, COUNT(*) AS cnt
        FROM liked_foreign
        WHERE style IS NOT NULL AND style <> ''
        GROUP BY style
        ORDER BY cnt DESC
        LIMIT 3
      ),
      top_hops AS (
        SELECT elem ->> 'name' AS hop_name, COUNT(*) AS cnt
        FROM liked_foreign,
             jsonb_array_elements(
               CASE jsonb_typeof(hops_json)
                 WHEN 'array' THEN hops_json
                 ELSE '[]'::jsonb
               END
             ) AS elem
        WHERE elem ->> 'name' IS NOT NULL
          AND elem ->> 'name' <> ''
        GROUP BY hop_name
        ORDER BY cnt DESC
        LIMIT 3
      )
      SELECT CASE
        WHEN (SELECT COUNT(*) FROM liked_foreign) = 0 THEN NULL
        ELSE jsonb_build_object(
          'likedCount',  (SELECT COUNT(*) FROM liked_foreign),
          'topStyles',   (SELECT jsonb_agg(style ORDER BY cnt DESC) FROM top_styles),
          'topHops',     (SELECT jsonb_agg(hop_name ORDER BY cnt DESC) FROM top_hops)
        )
      END
    ),

    -- ── Active session: fermentation measurements ─────────────────────────
    'sessionMeasurements', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_agg(
          jsonb_build_object(
            'measuredAt',  m.measured_at,
            'gravity',     m.gravity,
            'temperature', m.temperature,
            'ph',          m.ph,
            'notes',       m.notes
          )
          ORDER BY m.measured_at ASC
        )
        FROM public.brew_measurements m
        WHERE m.session_id = p_session_id
      )
      ELSE NULL
    END,

    -- ── Active session: process context ──────────────────────────────────
    -- Complements sessionMeasurements with the brewer's qualitative context:
    -- current phase, session notes, and recent NOTE events from the timeline
    -- (step completions, ad-hoc notes written during the brew day).
    'sessionContext', CASE
      WHEN p_session_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'phase',               bs.phase,
          'status',              bs.status,
          'notes',               bs.notes,
          'currentGravity',      bs.current_gravity,
          'apparentAttenuation', bs.apparent_attenuation,
          'processNotes', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'date',  n.evt_date,
                'title', n.evt_title,
                'note',  n.evt_note
              )
            )
            FROM (
              SELECT
                evt ->> 'date'  AS evt_date,
                evt ->> 'title' AS evt_title,
                evt ->> 'note'  AS evt_note
              FROM jsonb_array_elements(COALESCE(bs.timeline, '[]'::jsonb)) AS evt
              WHERE evt ->> 'type' = 'NOTE'
                AND (evt ->> 'title') IS NOT NULL
              ORDER BY (evt ->> 'date') DESC NULLS LAST
              LIMIT 10
            ) n
          )
        )
        FROM public.brewing_sessions bs
        WHERE bs.id = p_session_id
        LIMIT 1
      )
      ELSE NULL
    END,

    -- ── Equipment profile + brewery location ──────────────────────────────
    -- LEFT JOIN ensures location is included even without a default profile.
    -- NULL when p_brewery_id is not passed (e.g. hobbybrewer without brewery).
    'equipmentProfile', CASE
      WHEN p_brewery_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'name',            ep.name,
          'brewMethod',      ep.brew_method,
          'batchVolumeL',    ep.batch_volume_l,
          'boilOffRateL',    ep.boil_off_rate,
          'trubLossL',       ep.trub_loss,
          'grainAbsorption', ep.grain_absorption,
          'mashThickness',   ep.mash_thickness,
          'location',        br.location    -- NEW: from breweries table
        )
        FROM public.breweries br
        LEFT JOIN public.equipment_profiles ep
               ON ep.brewery_id = br.id AND ep.is_default = true
        WHERE br.id = p_brewery_id
        LIMIT 1
      )
      ELSE NULL
    END,

    -- ── Community Flavor DNA ────────────────────────────────────────────────
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
        SELECT br2.id FROM public.brews br2 WHERE br2.user_id = p_user_id
      )
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_brew_context TO authenticated, service_role;
