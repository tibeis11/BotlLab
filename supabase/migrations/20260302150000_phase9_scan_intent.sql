-- ============================================================================
-- Phase 9: Scan Intent Classification + Drinker-Bestätigung
-- ============================================================================

-- 9.1 — Neue Spalten auf bottle_scans
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS scan_intent text DEFAULT NULL;
  -- Werte: 'browse', 'collection_browse', 'repeat', 'event',
  --        'social_discovery', 'single', 'confirmed', NULL (=noch nicht klassifiziert)

ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS confirmed_drinking boolean DEFAULT NULL;
  -- NULL = nicht gefragt, true = bestätigt, false = verneint

ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS drinking_probability numeric(3,2) DEFAULT NULL;
  -- 0.00–1.00 — Wahrscheinlichkeit, dass dieser Scan zu Konsum geführt hat

-- Index für Batch-Klassifikation (nur unklassifizierte Scans)
CREATE INDEX IF NOT EXISTS idx_bottle_scans_intent_null
  ON bottle_scans (created_at)
  WHERE scan_intent IS NULL;

-- ============================================================================
-- 9.10 — scan_intent_feedback Tabelle (Prediction Log für ML-Feedback-Loop)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_intent_feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               uuid NOT NULL REFERENCES bottle_scans(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- Was hat das Modell vorhergesagt?
  predicted_intent      text NOT NULL,
  predicted_probability numeric(3,2) NOT NULL,

  -- Was hat der Nutzer geantwortet?
  actual_drinking       boolean NOT NULL,

  -- Kontext-Features (für Feature-Importance-Analyse)
  context_features      jsonb NOT NULL DEFAULT '{}',

  -- Meta: Warum wurde dieser Nutzer gefragt?
  sampling_rate         numeric(3,2),
  sampling_reason       text,

  -- Klassifikation des Ergebnisses (wird beim Insert berechnet)
  prediction_correct    boolean,
  error_type            text
  -- 'true_positive', 'true_negative', 'false_positive', 'false_negative'
);

-- Index für schnelles Confusion-Matrix-Querying
CREATE INDEX IF NOT EXISTS idx_feedback_intent
  ON scan_intent_feedback (predicted_intent, actual_drinking);

-- Index für zeitliche Drift-Analyse
CREATE INDEX IF NOT EXISTS idx_feedback_time
  ON scan_intent_feedback (created_at DESC);

-- Kein doppeltes Feedback pro Scan
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_scan
  ON scan_intent_feedback (scan_id);

-- RLS für scan_intent_feedback (nur service_role darf schreiben, kein direkter Client-Zugriff)
ALTER TABLE scan_intent_feedback ENABLE ROW LEVEL SECURITY;

-- Admin lesen
CREATE POLICY "Admin can read scan_intent_feedback"
  ON scan_intent_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.profile_id = auth.uid()
        AND admin_users.is_active = TRUE
    )
  );

-- Service-role INSERT/UPDATE (für Server Actions)
CREATE POLICY "Service role can manage scan_intent_feedback"
  ON scan_intent_feedback
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Cron: Scan-Intent-Klassifikation (alle 15 Minuten)
-- ============================================================================

SELECT cron.schedule(
  'classify-scan-intent',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url    := current_setting('app.settings.service_url', true) || '/api/analytics/classify-scan-intent',
    body   := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    )
  );
  $$
);
