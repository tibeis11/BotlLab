-- Phase 6: Cron-Job for automated weekly / monthly analytics reports
-- Requires: pg_cron and pg_net extensions

-- Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: dispatches a single brewery report via HTTP POST
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_analytics_report_for_brewery(
  p_brewery_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_url  text;
  v_secret    text;
BEGIN
  v_site_url := current_setting('app.site_url',  true);
  v_secret   := current_setting('app.cron_secret', true);

  PERFORM extensions.http_post(
    url     := v_site_url || '/api/reports/dispatch',
    body    := json_build_object('brewery_id', p_brewery_id)::text,
    headers := json_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || coalesce(v_secret, '')
               )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Main dispatcher: iterates all settings that are due today
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_pending_analytics_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT s.brewery_id
    FROM   analytics_report_settings s
    WHERE  s.enabled = true
      AND  s.email   IS NOT NULL
      -- weekly: fire on the correct weekday (send_day: 0 = Sunday … 6 = Saturday)
      AND  (
             (s.frequency = 'weekly'  AND EXTRACT(DOW  FROM CURRENT_DATE)::int = s.send_day)
          OR (s.frequency = 'monthly' AND EXTRACT(DAY  FROM CURRENT_DATE)::int = s.send_day)
      )
      -- skip if already sent today (de-duplicate)
      AND  NOT EXISTS (
             SELECT 1
             FROM   analytics_report_logs l
             WHERE  l.brewery_id    = s.brewery_id
               AND  l.status        = 'sent'
               AND  l.period_end::date = CURRENT_DATE
           )
  LOOP
    PERFORM public.dispatch_analytics_report_for_brewery(r.brewery_id);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Schedule: every day at 07:00 UTC
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'dispatch-analytics-reports',
  '0 7 * * *',
  'SELECT public.dispatch_pending_analytics_reports()'
);
