-- Fix RLS policies for label_templates to include 'owner' role

-- Drop existing policies (legacy names)
drop policy if exists "Team admins and brewers can insert templates" on label_templates;
drop policy if exists "Team admins and brewers can update templates" on label_templates;
drop policy if exists "Team admins can delete templates" on label_templates;

-- Drop new policies if they already exist (idempotency)
drop policy if exists "Team admins, owners and brewers can insert templates" on label_templates;
drop policy if exists "Team admins, owners and brewers can update templates" on label_templates;
drop policy if exists "Team admins and owners can delete templates" on label_templates;

-- Recreate with owner access
create policy "Team admins, owners and brewers can insert templates"
  on label_templates for insert
  with check (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
      and brewery_members.role in ('admin', 'brewer', 'owner')
    )
  );

create policy "Team admins, owners and brewers can update templates"
  on label_templates for update
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
      and brewery_members.role in ('admin', 'brewer', 'owner')
    )
  );

create policy "Team admins and owners can delete templates"
  on label_templates for delete
  using (
    exists (
      select 1 from brewery_members
      where brewery_members.brewery_id = label_templates.brewery_id
      and brewery_members.user_id = auth.uid()
      and brewery_members.role in ('admin', 'owner')
    )
  );
