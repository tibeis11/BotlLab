-- Fix: handle_new_like_notification fails when brew has no owner (user_id is null)
-- This caused the "null value in column user_id of relation notifications" error.

CREATE OR REPLACE FUNCTION public.handle_new_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    brew_owner_id uuid;
    brew_name text;
BEGIN
    -- 1. Get the owner of the brew
    SELECT user_id, name INTO brew_owner_id, brew_name
    FROM public.brews
    WHERE id = NEW.brew_id;

    -- 2. Determine if we should notify
    -- Constraint: Do NOT notify if user likes their own brew
    -- Fix: Also check if brew_owner_id IS NOT NULL
    IF brew_owner_id IS NOT NULL AND brew_owner_id IS DISTINCT FROM NEW.user_id THEN
        
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            type,
            data
        ) VALUES (
            brew_owner_id,
            NEW.user_id,
            'brew_like',
            jsonb_build_object(
                'brew_id', NEW.brew_id,
                'brew_name', brew_name
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;
