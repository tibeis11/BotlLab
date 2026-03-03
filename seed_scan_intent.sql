-- ============================================================================
-- Phase 9.11 — Seed: scan_intent_feedback + bottle_scans intent data
-- Generates ≥200 realistic feedback entries across all intent categories
-- Run after migration 20260302150000_phase9_scan_intent.sql
-- ============================================================================

-- First: Update some existing bottle_scans with scan_intent + drinking_probability
-- (so the ScanIntentChart and classification system have data to work with)
DO $$
DECLARE
  scan_row RECORD;
  scan_count INT := 0;
  intent TEXT;
  prob NUMERIC(3,2);
  rand_val DOUBLE PRECISION;
BEGIN
  FOR scan_row IN
    SELECT id, session_hash, viewer_user_id, created_at
    FROM bottle_scans
    WHERE scan_intent IS NULL
    ORDER BY created_at DESC
    LIMIT 500
  LOOP
    rand_val := random();

    -- Distribute intents realistically
    IF rand_val < 0.10 THEN
      intent := 'browse';
      prob := 0.10 + (random() * 0.10)::NUMERIC(3,2); -- 0.10–0.20
    ELSIF rand_val < 0.15 THEN
      intent := 'collection_browse';
      prob := 0.03 + (random() * 0.05)::NUMERIC(3,2); -- 0.03–0.08
    ELSIF rand_val < 0.25 THEN
      intent := 'repeat';
      prob := 0.75 + (random() * 0.20)::NUMERIC(3,2); -- 0.75–0.95
    ELSIF rand_val < 0.32 THEN
      intent := 'social_discovery';
      prob := 0.20 + (random() * 0.25)::NUMERIC(3,2); -- 0.20–0.45
    ELSIF rand_val < 0.37 THEN
      intent := 'event';
      prob := 0.55 + (random() * 0.30)::NUMERIC(3,2); -- 0.55–0.85
    ELSIF rand_val < 0.42 THEN
      intent := 'confirmed';
      prob := 1.00;
    ELSE
      intent := 'single';
      prob := 0.40 + (random() * 0.25)::NUMERIC(3,2); -- 0.40–0.65
    END IF;

    -- Some confirmed scans
    UPDATE bottle_scans SET
      scan_intent = intent,
      drinking_probability = prob,
      confirmed_drinking = CASE
        WHEN intent = 'confirmed' THEN TRUE
        WHEN intent = 'repeat' AND random() > 0.3 THEN TRUE
        WHEN intent = 'single' AND random() > 0.6 THEN TRUE
        WHEN intent = 'social_discovery' AND random() > 0.7 THEN TRUE
        WHEN intent = 'event' AND random() > 0.4 THEN TRUE
        ELSE NULL
      END
    WHERE id = scan_row.id;

    scan_count := scan_count + 1;
  END LOOP;

  RAISE NOTICE 'Updated % bottle_scans with scan_intent', scan_count;
END $$;

-- Now: Generate ≥250 scan_intent_feedback entries
-- These correspond to users who responded to the DrinkingConfirmationPrompt
DO $$
DECLARE
  scan_row RECORD;
  feedback_count INT := 0;
  predicted_intent TEXT;
  predicted_prob NUMERIC(3,2);
  actual_drinking BOOLEAN;
  prediction_correct BOOLEAN;
  err_type TEXT;
  engagement_time INT;
  scroll_depth NUMERIC(3,2);
  sampling_reason TEXT;
  sampling_rate NUMERIC(3,2);
  trigger_type TEXT;
  triggers TEXT[] := ARRAY['scroll_ratings', 'dwell_30s', 'after_rating', 'exit_intent'];
  reasons TEXT[] := ARRAY['uncertainty', 'cold_start', 'base_rate'];
BEGIN
  FOR scan_row IN
    SELECT id, scan_intent, drinking_probability, created_at
    FROM bottle_scans
    WHERE scan_intent IS NOT NULL
      AND scan_intent NOT IN ('browse', 'collection_browse')
      AND id NOT IN (SELECT scan_id FROM scan_intent_feedback)
    ORDER BY random()
    LIMIT 280
  LOOP
    predicted_intent := scan_row.scan_intent;
    predicted_prob := scan_row.drinking_probability;

    -- Simulate realistic user responses based on intent
    IF predicted_intent = 'confirmed' THEN
      actual_drinking := TRUE;
    ELSIF predicted_intent = 'repeat' THEN
      actual_drinking := random() < 0.88; -- 88% actually drinking
    ELSIF predicted_intent = 'single' THEN
      actual_drinking := random() < 0.52; -- 52% actually drinking
    ELSIF predicted_intent = 'social_discovery' THEN
      actual_drinking := random() < 0.35; -- 35% actually drinking
    ELSIF predicted_intent = 'event' THEN
      actual_drinking := random() < 0.72; -- 72% actually drinking
    ELSE
      actual_drinking := random() < 0.45;
    END IF;

    -- Compute prediction correctness
    IF predicted_prob >= 0.50 AND actual_drinking THEN
      prediction_correct := TRUE;
      err_type := NULL;
    ELSIF predicted_prob < 0.50 AND NOT actual_drinking THEN
      prediction_correct := TRUE;
      err_type := NULL;
    ELSIF predicted_prob >= 0.50 AND NOT actual_drinking THEN
      prediction_correct := FALSE;
      err_type := 'false_positive';
    ELSE
      prediction_correct := FALSE;
      err_type := 'false_negative';
    END IF;

    -- Simulate engagement context
    engagement_time := 5 + (random() * 120)::INT; -- 5–125 seconds
    scroll_depth := (0.1 + random() * 0.9)::NUMERIC(3,2);
    trigger_type := triggers[1 + (random() * 3)::INT];
    sampling_reason := reasons[1 + (random() * 2)::INT];
    sampling_rate := (0.05 + random() * 0.25)::NUMERIC(3,2);

    INSERT INTO scan_intent_feedback (
      scan_id,
      predicted_intent,
      predicted_probability,
      actual_drinking,
      context_features,
      sampling_rate,
      sampling_reason,
      prediction_correct,
      error_type,
      created_at
    ) VALUES (
      scan_row.id,
      predicted_intent,
      predicted_prob,
      actual_drinking,
      jsonb_build_object(
        'engagement_time_seconds', engagement_time,
        'scroll_depth', scroll_depth,
        'trigger', trigger_type,
        'has_ratings', random() > 0.6,
        'device_type', CASE
          WHEN random() > 0.7 THEN 'mobile'
          WHEN random() > 0.4 THEN 'desktop'
          ELSE 'tablet'
        END,
        'hour_of_day', (8 + (random() * 14)::INT),
        'day_of_week', (random() * 6)::INT,
        'total_user_scans', (1 + (random() * 50)::INT),
        'referrer_domain', CASE
          WHEN predicted_intent = 'social_discovery' THEN
            CASE WHEN random() > 0.5 THEN 'instagram.com' ELSE 'facebook.com' END
          ELSE NULL
        END
      ),
      sampling_rate,
      sampling_reason,
      prediction_correct,
      err_type,
      -- Spread feedback over the last 90 days
      scan_row.created_at + (random() * interval '2 hours')
    )
    ON CONFLICT (scan_id) DO NOTHING;

    feedback_count := feedback_count + 1;
  END LOOP;

  RAISE NOTICE 'Inserted % scan_intent_feedback entries', feedback_count;
END $$;

-- Verify counts
DO $$
DECLARE
  intent_count INT;
  feedback_total INT;
  per_intent TEXT;
BEGIN
  SELECT count(*) INTO intent_count FROM bottle_scans WHERE scan_intent IS NOT NULL;
  SELECT count(*) INTO feedback_total FROM scan_intent_feedback;

  RAISE NOTICE '─── Seed Summary ───';
  RAISE NOTICE 'Classified scans: %', intent_count;
  RAISE NOTICE 'Feedback entries: %', feedback_total;

  FOR per_intent IN
    SELECT format('  %s: %s feedbacks (accuracy: %s%%)',
      predicted_intent,
      count(*),
      round(100.0 * count(*) FILTER (WHERE prediction_correct) / NULLIF(count(*), 0), 1)
    )
    FROM scan_intent_feedback
    GROUP BY predicted_intent
    ORDER BY count(*) DESC
  LOOP
    RAISE NOTICE '%', per_intent;
  END LOOP;
END $$;
