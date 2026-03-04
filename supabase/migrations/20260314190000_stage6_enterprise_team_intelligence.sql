-- ============================================================================
-- Stage 6: Enterprise & Team Intelligence
-- ============================================================================
-- Adds:
--   1. brewery_settings          – per-brewery BotlGuide config (custom voice, limits)
--   2. team_knowledge_base       – uploaded SOPs/manuals metadata
--   3. team_knowledge_chunks     – chunked text with 768-dim embeddings for RAG
--   4. botlguide_audit_log       – compliance audit trail for every BotlGuide call
--   5. Storage bucket            – team-documents (private)
--   6. RPC search_team_knowledge – cosine-similarity search over team chunks
--   7. RPC get_botlguide_usage_stats – admin analytics (usage per capability, P95, trends)
--   8. RLS policies              – brewery-member scoped access
-- ============================================================================

-- ── 1. brewery_settings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brewery_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brewery_id    UUID NOT NULL REFERENCES public.breweries(id) ON DELETE CASCADE UNIQUE,
  -- Custom Brand Voice: overrides auto-extracted breweries.description
  botlguide_voice_config JSONB DEFAULT '{}'::jsonb,
  -- { tone?: string, style?: string, custom_intro?: string, custom_instructions?: string }
  botlguide_enabled      BOOLEAN NOT NULL DEFAULT true,
  sop_upload_enabled     BOOLEAN NOT NULL DEFAULT true,
  max_documents          INTEGER NOT NULL DEFAULT 10,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brewery_settings_brewery
  ON public.brewery_settings(brewery_id);

ALTER TABLE public.brewery_settings ENABLE ROW LEVEL SECURITY;

-- Brewery members can read settings
CREATE POLICY "brewery_members_read_settings"
  ON public.brewery_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = brewery_settings.brewery_id
         AND bm.user_id = auth.uid()
    )
  );

-- Brewery owners can manage settings
CREATE POLICY "brewery_owners_manage_settings"
  ON public.brewery_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = brewery_settings.brewery_id
         AND bm.user_id = auth.uid()
         AND bm.role = 'owner'
    )
  );

-- Service role full access (for edge functions)
CREATE POLICY "service_role_brewery_settings"
  ON public.brewery_settings FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. team_knowledge_base ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_knowledge_base (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brewery_id      UUID NOT NULL REFERENCES public.breweries(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  filename        TEXT NOT NULL,
  file_path       TEXT NOT NULL,             -- storage path in 'team-documents' bucket
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type       TEXT NOT NULL DEFAULT 'application/pdf',
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending → processing → ready | error
  chunk_count     INTEGER DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb, -- { pageCount?, title?, author? }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_kb_brewery
  ON public.team_knowledge_base(brewery_id);
CREATE INDEX IF NOT EXISTS idx_team_kb_status
  ON public.team_knowledge_base(brewery_id, status);

ALTER TABLE public.team_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Brewery members can read knowledge documents
CREATE POLICY "brewery_members_read_knowledge"
  ON public.team_knowledge_base FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = team_knowledge_base.brewery_id
         AND bm.user_id = auth.uid()
    )
  );

-- Owner/admin can insert documents
CREATE POLICY "brewery_admins_insert_knowledge"
  ON public.team_knowledge_base FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = team_knowledge_base.brewery_id
         AND bm.user_id = auth.uid()
         AND bm.role IN ('owner', 'admin')
    )
  );

-- Owner/admin can update (status changes)
CREATE POLICY "brewery_admins_update_knowledge"
  ON public.team_knowledge_base FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = team_knowledge_base.brewery_id
         AND bm.user_id = auth.uid()
         AND bm.role IN ('owner', 'admin')
    )
  );

-- Owner/admin can delete documents
CREATE POLICY "brewery_admins_delete_knowledge"
  ON public.team_knowledge_base FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = team_knowledge_base.brewery_id
         AND bm.user_id = auth.uid()
         AND bm.role IN ('owner', 'admin')
    )
  );

-- Service role (edge functions)
CREATE POLICY "service_role_knowledge_base"
  ON public.team_knowledge_base FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. team_knowledge_chunks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_knowledge_chunks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id   UUID NOT NULL REFERENCES public.team_knowledge_base(id) ON DELETE CASCADE,
  brewery_id    UUID NOT NULL REFERENCES public.breweries(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  embedding     extensions.vector(768),
  token_count   INTEGER DEFAULT 0,
  metadata      JSONB DEFAULT '{}'::jsonb,   -- { page?: number, section?: string }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_chunks_brewery
  ON public.team_knowledge_chunks(brewery_id);
CREATE INDEX IF NOT EXISTS idx_team_chunks_document
  ON public.team_knowledge_chunks(document_id);
-- HNSW index for fast cosine similarity search (no training required)
CREATE INDEX IF NOT EXISTS idx_team_chunks_embedding
  ON public.team_knowledge_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE public.team_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Brewery members can read/search chunks
CREATE POLICY "brewery_members_read_chunks"
  ON public.team_knowledge_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = team_knowledge_chunks.brewery_id
         AND bm.user_id = auth.uid()
    )
  );

-- Service role (edge function writes)
CREATE POLICY "service_role_knowledge_chunks"
  ON public.team_knowledge_chunks FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. botlguide_audit_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.botlguide_audit_log (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brewery_id          UUID REFERENCES public.breweries(id) ON DELETE SET NULL,
  capability          TEXT NOT NULL,
  model               TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  input_summary       TEXT,                   -- truncated first 200 chars of prompt
  output_summary      TEXT,                   -- truncated first 200 chars of response
  credits_used        INTEGER NOT NULL DEFAULT 1,
  response_time_ms    INTEGER,
  token_count_input   INTEGER,
  token_count_output  INTEGER,
  rag_sources_used    TEXT[],                 -- which RAG sources were consulted
  status              TEXT NOT NULL DEFAULT 'success',
  -- success | error | rate_limited
  error_message       TEXT,
  ip_address          INET,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.botlguide_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_brewery
  ON public.botlguide_audit_log(brewery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_capability
  ON public.botlguide_audit_log(capability, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON public.botlguide_audit_log(created_at DESC);

ALTER TABLE public.botlguide_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit log entries
CREATE POLICY "users_read_own_audit"
  ON public.botlguide_audit_log FOR SELECT
  USING (user_id = auth.uid());

-- Brewery owners/admins can read audit logs for their brewery
CREATE POLICY "brewery_admins_read_audit"
  ON public.botlguide_audit_log FOR SELECT
  USING (
    brewery_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = botlguide_audit_log.brewery_id
         AND bm.user_id = auth.uid()
         AND bm.role IN ('owner', 'admin')
    )
  );

-- Service role full access (route.ts writes via service client)
CREATE POLICY "service_role_audit_log"
  ON public.botlguide_audit_log FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. Storage bucket: team-documents (private) ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('team-documents', 'team-documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: brewery members can read uploaded docs
CREATE POLICY "brewery_members_read_team_docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'team-documents'
    AND EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = (storage.foldername(name))[1]::uuid
         AND bm.user_id = auth.uid()
    )
  );

-- Storage RLS: owner/admin can upload
CREATE POLICY "brewery_admins_upload_team_docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'team-documents'
    AND EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = (storage.foldername(name))[1]::uuid
         AND bm.user_id = auth.uid()
         AND bm.role IN ('owner', 'admin')
    )
  );

-- Storage RLS: owner/admin can delete
CREATE POLICY "brewery_admins_delete_team_docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'team-documents'
    AND EXISTS (
      SELECT 1 FROM public.brewery_members bm
       WHERE bm.brewery_id = (storage.foldername(name))[1]::uuid
         AND bm.user_id = auth.uid()
         AND bm.role IN ('owner', 'admin')
    )
  );

-- ── 6. RPC: search_team_knowledge ───────────────────────────────────────────
-- Cosine-similarity search over team knowledge chunks for a given brewery.
-- Returns top-k matching chunks with source document filename.
CREATE OR REPLACE FUNCTION public.search_team_knowledge(
  p_query_embedding extensions.vector(768),
  p_brewery_id      UUID,
  p_match_count     INTEGER DEFAULT 5,
  p_min_similarity  FLOAT   DEFAULT 0.5
)
RETURNS TABLE (
  id          UUID,
  document_id UUID,
  content     TEXT,
  similarity  FLOAT,
  metadata    JSONB,
  filename    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    (1 - (c.embedding <=> p_query_embedding))::FLOAT AS similarity,
    c.metadata,
    d.filename
  FROM public.team_knowledge_chunks c
  JOIN public.team_knowledge_base d ON d.id = c.document_id
  WHERE c.brewery_id = p_brewery_id
    AND d.status = 'ready'
    AND 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- ── 7. RPC: get_botlguide_usage_stats ───────────────────────────────────────
-- Admin analytics: usage per capability, P50/P95 response time, error rate,
-- daily trend, team RAG usage. Called from Admin Dashboard BotlguideView.
CREATE OR REPLACE FUNCTION public.get_botlguide_usage_stats(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result   JSONB;
  cutoff   TIMESTAMPTZ := now() - (p_days || ' days')::interval;
BEGIN
  SELECT jsonb_build_object(
    'totalCalls',
      (SELECT count(*) FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'totalCredits',
      (SELECT COALESCE(sum(credits_used), 0)
         FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'uniqueUsers',
      (SELECT count(DISTINCT user_id)
         FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'avgResponseMs',
      (SELECT COALESCE(round(avg(response_time_ms)), 0)
         FROM public.botlguide_audit_log
         WHERE created_at >= cutoff AND status = 'success'),
    'p50ResponseMs',
      (SELECT COALESCE(round(percentile_cont(0.50) WITHIN GROUP (ORDER BY response_time_ms)), 0)
         FROM public.botlguide_audit_log
         WHERE created_at >= cutoff AND status = 'success'),
    'p95ResponseMs',
      (SELECT COALESCE(round(percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms)), 0)
         FROM public.botlguide_audit_log
         WHERE created_at >= cutoff AND status = 'success'),
    'errorRate',
      (SELECT COALESCE(
         round(count(*) FILTER (WHERE status = 'error') * 100.0
               / NULLIF(count(*), 0), 1), 0)
         FROM public.botlguide_audit_log WHERE created_at >= cutoff),
    'byCapability',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub.cnt DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'capability', capability,
          'calls',      count(*),
          'avgMs',      round(avg(response_time_ms)),
          'credits',    sum(credits_used),
          'errorRate',  round(count(*) FILTER (WHERE status = 'error') * 100.0
                              / NULLIF(count(*), 0), 1)
        ) AS sub, count(*) AS cnt
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff
        GROUP BY capability
      ) t),
    'dailyTrend',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'date'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'date',    created_at::date,
          'calls',   count(*),
          'credits', sum(credits_used),
          'avgMs',   round(avg(response_time_ms))
        ) AS sub
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff
        GROUP BY created_at::date
      ) t),
    'teamRagUsage',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'calls' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'breweryId', brewery_id,
          'calls',     count(*),
          'ragCalls',  count(*) FILTER (
            WHERE rag_sources_used IS NOT NULL
              AND array_length(rag_sources_used, 1) > 0
          )
        ) AS sub
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff AND brewery_id IS NOT NULL
        GROUP BY brewery_id
      ) t),
    'topErrors',
      (SELECT COALESCE(jsonb_agg(sub ORDER BY sub->>'count' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'capability',   capability,
          'errorMessage', error_message,
          'count',        count(*)
        ) AS sub
        FROM public.botlguide_audit_log
        WHERE created_at >= cutoff AND status = 'error'
        GROUP BY capability, error_message
        LIMIT 20
      ) t)
  ) INTO result;

  RETURN result;
END;
$$;

-- ── Auto-cleanup: partition hint ────────────────────────────────────────────
-- For large-scale deployments, consider partitioning botlguide_audit_log
-- by month. For now the created_at DESC index is sufficient.
COMMENT ON TABLE public.botlguide_audit_log IS
  'Compliance audit trail for every BotlGuide AI call. Retention: 90 days recommended.';
COMMENT ON TABLE public.team_knowledge_base IS
  'Uploaded SOP/manual documents per brewery for team-specific BotlGuide RAG.';
COMMENT ON TABLE public.team_knowledge_chunks IS
  'Chunked + embedded text fragments from team_knowledge_base for vector similarity search.';
COMMENT ON TABLE public.brewery_settings IS
  'Per-brewery BotlGuide configuration: custom brand voice, document limits, feature toggles.';
