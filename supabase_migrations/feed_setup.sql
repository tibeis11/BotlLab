-- Erstelle die Feed-Tabelle
create table if not exists brewery_feed (
  id uuid default gen_random_uuid() primary key,
  brewery_id uuid references breweries(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  type text not null, -- 'POST', 'BREW_CREATED', 'BREW_UPDATED', 'MEMBER_JOINED', 'ACHIEVEMENT'
  content jsonb not null default '{}', -- Zum Speichern von Nachrichten oder Referenz-IDs
  created_at timestamptz default now() not null
);

-- RLS aktivieren
alter table brewery_feed enable row level security;

-- Policy: Jeder Member der Brauerei darf den Feed sehen
create policy "Team members can view feed"
  on brewery_feed for select
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = brewery_feed.brewery_id
      and brewery_members.user_id = auth.uid()
    )
  );

-- Policy: Jeder Member darf posten
create policy "Team members can insert feed items"
  on brewery_feed for insert
  with check (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = brewery_feed.brewery_id
      and brewery_members.user_id = auth.uid()
    )
  );

-- Optional: Realtime aktivieren für live updates
alter publication supabase_realtime add table brewery_feed;
