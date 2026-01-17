create table if not exists brewery_saved_brews (
  id uuid default gen_random_uuid() primary key,
  brewery_id uuid references breweries(id) on delete cascade not null,
  brew_id uuid references brews(id) on delete cascade not null,
  saved_at timestamptz default now() not null,
  created_by uuid references auth.users(id) on delete set null,
  unique(brewery_id, brew_id)
);

-- RLS Policies
alter table brewery_saved_brews enable row level security;

-- Users can view saved brews if they are members of the brewery
create policy "Users can view saved brews of their team"
  on brewery_saved_brews for select
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = brewery_saved_brews.brewery_id
      and brewery_members.user_id = auth.uid()
    )
  );

-- Users can insert (save) brews if they are members of the brewery
create policy "Users can save brews to their team"
  on brewery_saved_brews for insert
  with check (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = brewery_saved_brews.brewery_id
      and brewery_members.user_id = auth.uid()
    )
  );

-- Users can delete (unsave) brews if they are members of the brewery
create policy "Users can remove saved brews from their team"
  on brewery_saved_brews for delete
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = brewery_saved_brews.brewery_id
      and brewery_members.user_id = auth.uid()
    )
  );
