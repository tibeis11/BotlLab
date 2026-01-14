-- Fix Relationship between notifications and profiles
-- Sometimes inline references aren't picked up correctly or cached stale-y.

-- 1. Explicitly drop and recreate the foreign key to ensure it is registered correctly.
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_actor_id_fkey
  FOREIGN KEY (actor_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 2. Force PostgREST schema cache reload
-- This is critical for the API to recognizing the new relationship immediately.
NOTIFY pgrst, 'reload schema';
