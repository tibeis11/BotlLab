-- Fix: referenziere public.profiles statt auth.users für einfachere Joins via API
alter table brewery_feed 
  drop constraint brewery_feed_user_id_fkey,
  add constraint brewery_feed_user_id_fkey 
  foreign key (user_id) 
  references profiles(id) 
  on delete set null;

-- Neu laden des Schema-Caches erzwingen (manchmal nötig)
notify pgrst, 'reload config';
