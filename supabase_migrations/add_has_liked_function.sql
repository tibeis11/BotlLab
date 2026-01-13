-- Function to check if current user liked a brew (Computed Field style)
-- Takes the specific row type 'brews' as argument.
-- In JS client: .select('*, user_has_liked')

create or replace function user_has_liked(brew_row brews)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 
    from public.likes 
    where brew_id = brew_row.id
    and user_id = auth.uid()
  );
$$;

-- Grant execute permissions
grant execute on function user_has_liked(brews) to public;
grant execute on function user_has_liked(brews) to anon;
grant execute on function user_has_liked(brews) to authenticated;
