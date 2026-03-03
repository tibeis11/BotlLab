-- ============================================================================
-- Phase 15.1 — analytics_ai_insights table
-- BotlGuide Analyst: proactive KI-Insights for brewers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_ai_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id      uuid NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  brew_id         uuid REFERENCES brews(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,                           -- Insights expire (e.g. after 30 days)

  -- Classification
  insight_type    text NOT NULL,                         -- 'off_flavor', 'batch_comparison', 'trend', 'market', 'seasonality', 'shelf_life', 'event_detected'
  severity        text NOT NULL DEFAULT 'info',          -- 'info', 'warning', 'critical'

  -- Content
  title           text NOT NULL,                         -- Short title for action card
  body            text NOT NULL,                         -- Markdown-formatted insight text
  action_suggestion text,                                -- Concrete action recommendation

  -- Data source (transparency)
  trigger_data    jsonb NOT NULL DEFAULT '{}',           -- Raw data that triggered the insight
  source_phases   text[],                                -- e.g. ['phase_4', 'phase_5']

  -- Brewer feedback
  brewer_reaction text,                                  -- 'helpful', 'not_helpful', NULL
  brewer_notes    text,                                  -- Optional comment

  -- Status
  is_read         boolean NOT NULL DEFAULT false,
  is_dismissed    boolean NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insights_brewery
  ON public.analytics_ai_insights (brewery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insights_unread
  ON public.analytics_ai_insights (brewery_id)
  WHERE is_read = false AND is_dismissed = false;

-- RLS
ALTER TABLE public.analytics_ai_insights ENABLE ROW LEVEL SECURITY;

-- Brewery members can read their own brewery's insights
DROP POLICY IF EXISTS "Brewery members can read own insights" ON public.analytics_ai_insights;
CREATE POLICY "Brewery members can read own insights"
  ON public.analytics_ai_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = analytics_ai_insights.brewery_id
        AND bm.user_id = auth.uid()
    )
  );

-- Brewery members can update reaction/read/dismiss on own insights
DROP POLICY IF EXISTS "Brewery members can update own insights" ON public.analytics_ai_insights;
CREATE POLICY "Brewery members can update own insights"
  ON public.analytics_ai_insights FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = analytics_ai_insights.brewery_id
        AND bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = analytics_ai_insights.brewery_id
        AND bm.user_id = auth.uid()
    )
  );

-- Service role can insert (Cron-Job / API route)
DROP POLICY IF EXISTS "Service role can insert insights" ON public.analytics_ai_insights;
CREATE POLICY "Service role can insert insights"
  ON public.analytics_ai_insights FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can do anything
DROP POLICY IF EXISTS "Service role full access insights" ON public.analytics_ai_insights;
CREATE POLICY "Service role full access insights"
  ON public.analytics_ai_insights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
