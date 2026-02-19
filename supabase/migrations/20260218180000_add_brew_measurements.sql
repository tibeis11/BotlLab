create table if not exists public.brew_measurements (
  id uuid primary key default gen_random_uuid(),
  brew_id uuid not null references public.brews(id) on delete cascade,
  measured_at timestamptz not null default now(),
  gravity numeric, -- SG (1.xxx) or Plato
  temperature numeric, -- Celsius
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- RLS
alter table public.brew_measurements enable row level security;

create policy "Users can view measurements for brews they can view"
  on public.brew_measurements for select
  using (
    exists (
      select 1 from public.brews
      where brews.id = brew_measurements.brew_id
      and (brews.is_public = true or brews.user_id = auth.uid())
    )
    or
    exists (
      select 1 from public.brewery_members bm
      join public.brews b on b.brewery_id = bm.brewery_id
      where b.id = brew_measurements.brew_id
      and bm.user_id = auth.uid()
    )
  );

create policy "Users can insert measurements for their own brews or team brews"
  on public.brew_measurements for insert
  with check (
    exists (
      select 1 from public.brews
      where brews.id = brew_measurements.brew_id
      and (brews.user_id = auth.uid())
    )
    or
    exists (
      select 1 from public.brewery_members bm
      join public.brews b on b.brewery_id = bm.brewery_id
      where b.id = brew_measurements.brew_id
      and bm.user_id = auth.uid()
    )
  );

create policy "Users can delete measurements for their own brews or team brews"
  on public.brew_measurements for delete
  using (
    exists (
      select 1 from public.brews
      where brews.id = brew_measurements.brew_id
      and (brews.user_id = auth.uid())
    )
    or
    exists (
      select 1 from public.brewery_members bm
      join public.brews b on b.brewery_id = bm.brewery_id
      where b.id = brew_measurements.brew_id
      and bm.user_id = auth.uid()
    )
  );
