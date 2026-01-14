-- Notification System
-- Implements a central notifications table and triggers for social interactions (Likes).

-- 1. Create Notifications Table
create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now() not null,
    
    -- Recipient: The user who receives the notification
    user_id uuid references auth.users(id) on delete cascade not null,
    
    -- Actor: The user who caused the notification (e.g. the liker)
    -- Referencing profiles allows us to easily join display_name/avatar
    actor_id uuid references public.profiles(id) on delete set null,
    
    -- Type: 'brew_like', 'follow', 'system_msg', etc.
    type text not null,
    
    -- Payload: Flexible data (e.g. { "brew_id": "...", "brew_name": "..." })
    data jsonb default '{}'::jsonb,
    
    -- State
    is_read boolean default false not null
);

-- Index for fast inbox queries
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- 2. RLS Security Policies
alter table public.notifications enable row level security;

-- Policy: Users can see their own notifications
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using ( auth.uid() = user_id );

-- Policy: Users can update (mark as read) their own notifications
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- 3. Trigger Function: Notify on Like
-- This function runs AFTER INSERT on the 'likes' table.
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
    -- Constraint: Do NOT notify if user likes their own brew
    if brew_owner_id is distinct from new.user_id then
        
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

-- 4. Attach Trigger to Likes Table
drop trigger if exists on_like_notify on public.likes;

create trigger on_like_notify
after insert on public.likes
for each row execute function public.handle_new_like_notification();
