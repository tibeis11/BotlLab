
-- New table: likes
create table if not exists likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  -- Foreign Keys
  brew_id uuid references brews(id) on delete cascade,

  -- Constraints
  constraint likes_entity_check check (brew_id is not null),
  constraint unique_user_brew_like unique (user_id, brew_id)
);

-- RLS
alter table likes enable row level security;

create policy "Likes are viewable by everyone"
  on likes for select using (true);

create policy "Users can insert their own likes"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on likes for delete
  using (auth.uid() = user_id);

-- Indexes
create index likes_user_id_idx on likes(user_id);
create index likes_brew_id_idx on likes(brew_id);
