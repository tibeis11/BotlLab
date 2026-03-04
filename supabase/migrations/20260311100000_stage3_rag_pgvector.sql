-- ──────────────────────────────────────────────────────────────────────────────
-- Stage 3: BotlGuide Context Engine — RAG (pgvector)
-- ──────────────────────────────────────────────────────────────────────────────
-- Enables semantic search over BJCP style definitions and user recipes.
-- Embeddings are generated via Gemini text-embedding-004 (768 dimensions).
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Enable pgvector extension (requires Supabase with pg_vector support)
CREATE EXTENSION IF NOT EXISTS vector
  SCHEMA extensions;

-- 2. Embeddings table
-- Stores vector embeddings for:
--   - bjcp_style  : static BJCP style guide definitions (seed once)
--   - user_recipe : per-user recipe snapshots (updated on save)
CREATE TABLE IF NOT EXISTS public.botlguide_embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     text NOT NULL CHECK (source_type IN ('bjcp_style', 'user_recipe')),
  source_id       text NOT NULL,          -- BJCP style code (e.g. "10A") or brew UUID
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL for bjcp_style
  brewery_id      uuid REFERENCES public.breweries(id) ON DELETE CASCADE,
  content         text NOT NULL,          -- the text that was embedded
  embedding       extensions.vector(768), -- Gemini text-embedding-004 output
  metadata        jsonb DEFAULT '{}',     -- og_min/max, ibu_min/max, style_name, etc.
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, user_id)  -- one embedding per (type, id, user)
);

-- Allow NULL user_id for BJCP styles (adjust unique constraint)
DROP INDEX IF EXISTS botlguide_embeddings_source_type_source_id_user_id_idx;
ALTER TABLE public.botlguide_embeddings
  DROP CONSTRAINT IF EXISTS botlguide_embeddings_source_type_source_id_user_id_key;
CREATE UNIQUE INDEX botlguide_embeddings_unique_idx
  ON public.botlguide_embeddings (source_type, source_id, COALESCE(user_id::text, ''));

-- Indexes
CREATE INDEX IF NOT EXISTS botlguide_embeddings_source_type_idx
  ON public.botlguide_embeddings (source_type);
CREATE INDEX IF NOT EXISTS botlguide_embeddings_user_id_idx
  ON public.botlguide_embeddings (user_id)
  WHERE user_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_botlguide_embeddings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_botlguide_embeddings_updated_at ON public.botlguide_embeddings;
CREATE TRIGGER trg_botlguide_embeddings_updated_at
  BEFORE UPDATE ON public.botlguide_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_botlguide_embeddings();

-- 3. RLS
ALTER TABLE public.botlguide_embeddings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (seed script + Edge Functions)
CREATE POLICY "service_role_all" ON public.botlguide_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read BJCP styles (source_type = 'bjcp_style')
CREATE POLICY "read_bjcp_styles" ON public.botlguide_embeddings
  FOR SELECT TO authenticated
  USING (source_type = 'bjcp_style');

-- Users can read their own recipe embeddings
CREATE POLICY "read_own_recipe_embeddings" ON public.botlguide_embeddings
  FOR SELECT TO authenticated
  USING (source_type = 'user_recipe' AND user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. RPC: search_botlguide_embeddings
--    Cosine similarity search. Returns top-k most similar embeddings.
--    Used by /api/botlguide for RAG context retrieval.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_botlguide_embeddings(
  p_query_embedding extensions.vector(768),
  p_source_type      text DEFAULT 'bjcp_style',
  p_match_count      int  DEFAULT 3,
  p_user_id          uuid DEFAULT NULL,
  p_min_similarity   float DEFAULT 0.5
)
RETURNS TABLE (
  id          uuid,
  source_id   text,
  content     text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = extensions, public, pg_catalog
AS $$
  SELECT
    e.id,
    e.source_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> p_query_embedding) AS similarity
  FROM public.botlguide_embeddings e
  WHERE
    e.source_type = p_source_type
    AND (p_user_id IS NULL OR e.user_id = p_user_id OR e.user_id IS NULL)
    AND e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

GRANT EXECUTE ON FUNCTION public.search_botlguide_embeddings TO authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. RPC: get_user_brew_context
--    Aggregates a user's last 5 brews + current session measurements as a
--    structured JSON context object — used by Coach capabilities for RAG.
-- ──────────────────────────────────────────────────────────────────────────────
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
          'createdAt',   b.created_at
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. botlguide_insights table (Stage 4 prep — Proactive Analyst)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.botlguide_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brewery_id      uuid REFERENCES public.breweries(id) ON DELETE CASCADE,
  session_id      uuid REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  brew_id         uuid REFERENCES public.brews(id) ON DELETE CASCADE,
  insight_type    text NOT NULL, -- 'fermentation_stall' | 'temp_anomaly' | 'slow_fermentation' | 'ready_to_package'
  severity        text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title           text NOT NULL,
  body            text NOT NULL,
  dismissed       boolean NOT NULL DEFAULT false,
  dismissed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS botlguide_insights_user_id_idx
  ON public.botlguide_insights (user_id, dismissed, created_at DESC);

ALTER TABLE public.botlguide_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_insights" ON public.botlguide_insights
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_insights" ON public.botlguide_insights
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_role_all_insights" ON public.botlguide_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);
