create table if not exists label_templates (
  id uuid primary key default gen_random_uuid(),
  brewery_id uuid references breweries(id) on delete cascade not null,
  name text not null,
  description text,
  format_id text not null default '6137', -- Reference to LABEL_FORMATS key
  config jsonb not null default '{}'::jsonb, -- Stores the LabelDesign object
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table label_templates enable row level security;

-- Policies
create policy "Team members can view templates"
  on label_templates for select
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
    )
  );

create policy "Team admins and brewers can insert templates"
  on label_templates for insert
  with check (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
      and brewery_members.role in ('admin', 'brewer')
    )
  );

create policy "Team admins and brewers can update templates"
  on label_templates for update
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
      and brewery_members.role in ('admin', 'brewer')
    )
  );

create policy "Team admins can delete templates"
  on label_templates for delete
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
      and brewery_members.role = 'admin'
    )
  );
