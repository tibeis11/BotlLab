-- Track individual AI generation requests for analytics
-- ⚠️ DSGVO BEACHTEN: Speichere KEINE personenbezogenen Daten in Logs
-- Prompts dürfen NICHT im Klartext gespeichert werden (User könnte PII eingeben)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'image' | 'text'
  model_used TEXT NOT NULL,
  prompt_length INTEGER, -- Nur Länge, nicht Inhalt
  tokens_used INTEGER,
  cost_estimate NUMERIC(10,4), -- In EUR
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft Delete für Retention Policy
  metadata JSONB DEFAULT '{}'::jsonb -- KEIN prompt_text Feld!
);

-- Automatische Löschung alter Logs (DSGVO Data Minimization)
CREATE INDEX idx_ai_usage_retention ON ai_usage_logs(created_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_ai_usage_profile ON ai_usage_logs(profile_id);
CREATE INDEX idx_ai_usage_date ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_type ON ai_usage_logs(generation_type);

COMMENT ON TABLE ai_usage_logs IS 'Detailed tracking of AI API usage per user';
