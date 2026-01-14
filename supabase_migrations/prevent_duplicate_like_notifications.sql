-- Fix: Prevent Duplicate Notifications
-- Ensures that repeated liking/unliking of the same brew does not spam the owner with multiple notifications.

create or replace function public.handle_new_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    brew_owner_id uuid;
    brew_name text;
begin
    -- 1. Get the owner of the brew
    select user_id, name into brew_owner_id, brew_name
    from public.brews
    where id = new.brew_id;

    -- 2. Determine if we should notify
    -- Constraint A: Do NOT notify if user likes their own brew
    if brew_owner_id is distinct from new.user_id then
        
        -- Constraint B: (NEW) Do NOT notify if a notification for this brew/user pair already exists
        -- This handles the case where a user repeatedly likes/unlikes. The first notification remains.
        if exists (
            select 1 
            from public.notifications 
            where user_id = brew_owner_id 
              and actor_id = new.user_id 
              and type = 'brew_like' 
              and (data->>'brew_id')::uuid = new.brew_id
        ) then
            -- Notification already exists, do nothing.
            return new;
        end if;

        -- Insert Notification
        insert into public.notifications (
            user_id,
            actor_id,
            type,
            data
        ) values (
            brew_owner_id,
            new.user_id,
            'brew_like',
            jsonb_build_object(
                'brew_id', new.brew_id,
                'brew_name', brew_name
            )
        );
        
    end if;

    return new;
end;
$$;
