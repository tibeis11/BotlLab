-- Add column to track the last active squad for a user
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "active_brewery_id" uuid REFERENCES "public"."breweries"("id") ON DELETE SET NULL;

-- Create function to update this easily
create or replace function update_active_brewery(brewery_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set active_brewery_id = update_active_brewery.brewery_id
  where id = auth.uid();
end;
$$;
