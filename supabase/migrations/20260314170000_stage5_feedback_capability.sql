-- ══════════════════════════════════════════════════════════════════════════════
-- Stage 5: botlguide_feedback → Prompt-Stil-Adapter
--
-- 1. Add `capability` column to botlguide_feedback (TEXT, nullable so old rows
--    are not broken). New feedback inserts will always include the capability.
--    e.g. 'coach.analyze_fermentation', 'architect.optimize', 'coach.guide'
--
-- 2. Rebuild get_user_brew_context to include a new `feedbackProfile` key:
--    Per-capability up/down counts for THIS user.
--    Used by buildFeedbackContext() in route.ts to add a one-line style hint
--    to the prompt when a capability has a high negative-feedback ratio.
--    e.g. "Vorherige Antworten als zu vage bewertet → bitte konkreter"
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Schema change
ALTER TABLE public.botlguide_feedback
  ADD COLUMN IF NOT EXISTS capability TEXT;

-- Optional: index for fast aggregation per user+capability
CREATE INDEX IF NOT EXISTS idx_botlguide_feedback_user_capability
  ON public.botlguide_feedback (user_id, capability)
  WHERE capability IS NOT NULL;

-- ── Rebuild RPC ───────────────────────────────────────────────────────────────
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

    -- ── Active session: process context ───────────────────────────────────
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
          'location',        br.location
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
    ),

    -- ── Feedback profile: per-capability up/down counts ───────────────────
    -- Used by buildFeedbackContext() in route.ts to adapt the prompt style
    -- when a capability consistently receives negative feedback from this user.
    -- Threshold: capability with ≥3 total votes and >50% down → add hint.
    -- NULL when no capability-tagged feedback exists yet.
    'feedbackProfile', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE jsonb_object_agg(
          capability,
          jsonb_build_object(
            'up',    up_count,
            'down',  down_count,
            'total', up_count + down_count
          )
        )
      END
      FROM (
        SELECT
          capability,
          COUNT(*) FILTER (WHERE feedback = 'up')   AS up_count,
          COUNT(*) FILTER (WHERE feedback = 'down')  AS down_count
        FROM public.botlguide_feedback
        WHERE user_id = p_user_id
          AND capability IS NOT NULL
        GROUP BY capability
        HAVING COUNT(*) >= 1
      ) fb
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_brew_context TO authenticated, service_role;
