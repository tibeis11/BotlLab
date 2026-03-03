-- ============================================================================
-- Phase 8: Wetter-Korrelation
-- 8.2 — Wetter-Spalten auf bottle_scans
-- 8.4 — pg_cron: stündlicher Weather-Fetch-Job
-- ============================================================================

-- ── bottle_scans: neue Wetter-Spalten ────────────────────────────────────────
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS weather_temp_c      numeric(4,1),
  ADD COLUMN IF NOT EXISTS weather_condition   text,     -- 'sunny', 'partly_cloudy', 'foggy', 'rainy', 'snowy', 'stormy', 'unavailable'
  ADD COLUMN IF NOT EXISTS weather_category    text,     -- 'hot' >25°C, 'warm' 15-25°C, 'cool' 5-15°C, 'cold' <5°C
  ADD COLUMN IF NOT EXISTS weather_is_outdoor  boolean,  -- heuristik: temp > 15°C AND kein Regen
  ADD COLUMN IF NOT EXISTS weather_fetched_at  timestamptz;  -- NULL = noch nicht versucht

-- Index: unverarbeitete Scans mit bekannten Koordinaten schnell finden
CREATE INDEX IF NOT EXISTS bottle_scans_weather_pending_idx
  ON bottle_scans (created_at)
  WHERE weather_fetched_at IS NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL;

-- ── pg_cron: stündlicher Job ──────────────────────────────────────────────────
SELECT cron.schedule(
  'fetch-scan-weather',
  '15 * * * *',   -- jede Stunde, Minute 15 (versetzt zu anderen Jobs)
  $$
  SELECT extensions.http_post(
    url     := current_setting('app.site_url', true) || '/api/analytics/fetch-weather',
    body    := '{}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || coalesce(current_setting('app.cron_secret', true), '') || '"}'
  )
  $$
);
