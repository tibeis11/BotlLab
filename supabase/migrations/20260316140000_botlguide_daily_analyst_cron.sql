-- ============================================================================
-- BotlGuide Daily Analyst: Cron Job
-- Created: 2026-03-16
-- Purpose: Schedule daily AI insight generation for premium breweries at 07:00
-- ============================================================================

SELECT cron.schedule(
  'botlguide-daily-analyst',
  '0 7 * * *', -- Daily at 07:00
  $$
  SELECT net.http_post(
    url := (SELECT value FROM private_system.secrets WHERE key = 'EDGE_FUNCTION_BASE_URL') || '/functions/v1/botlguide-daily-analyst',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM private_system.secrets WHERE key = 'SERVICE_ROLE_KEY')
    ),
    body:='{}'::jsonb
  ) as request_id;
  $$
);
