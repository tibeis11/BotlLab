INSERT INTO private_system.secrets (key, value)
VALUES
  ('APP_URL',     'https://botllab.de'), 
  ('CRON_SECRET', ',n)yL7uvcuq?BNdMY!NP')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;