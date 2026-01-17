-- Performance: Add indexes for foreign keys identified by linter

-- public.bottles
CREATE INDEX IF NOT EXISTS idx_bottles_brewery_id ON public.bottles(brewery_id);
CREATE INDEX IF NOT EXISTS idx_bottles_user_id ON public.bottles(user_id);

-- public.brewery_feed
CREATE INDEX IF NOT EXISTS idx_brewery_feed_brewery_id ON public.brewery_feed(brewery_id);
CREATE INDEX IF NOT EXISTS idx_brewery_feed_user_id ON public.brewery_feed(user_id);

-- public.brewery_members
CREATE INDEX IF NOT EXISTS idx_brewery_members_user_id ON public.brewery_members(user_id);

-- public.brewing_sessions
CREATE INDEX IF NOT EXISTS idx_brewing_sessions_brew_id ON public.brewing_sessions(brew_id);
CREATE INDEX IF NOT EXISTS idx_brewing_sessions_brewery_id ON public.brewing_sessions(brewery_id);

-- public.brews
CREATE INDEX IF NOT EXISTS idx_brews_brewery_id ON public.brews(brewery_id);
CREATE INDEX IF NOT EXISTS idx_brews_remix_parent_id ON public.brews(remix_parent_id);
CREATE INDEX IF NOT EXISTS idx_brews_user_id ON public.brews(user_id);

-- public.collected_caps
CREATE INDEX IF NOT EXISTS idx_collected_caps_brew_id ON public.collected_caps(brew_id);

-- public.notifications
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);

-- public.profiles
CREATE INDEX IF NOT EXISTS idx_profiles_active_brewery_id ON public.profiles(active_brewery_id);
