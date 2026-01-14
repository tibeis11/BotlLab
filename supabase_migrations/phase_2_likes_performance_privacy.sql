-- Phase 2: Likes System Performance & Privacy Upgrade (Corrected v2)

-- 1. Add likes_count column to brews table (Idempotent check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brews' AND column_name = 'likes_count') THEN
        ALTER TABLE "public"."brews" ADD COLUMN "likes_count" integer NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 2. Backfill existing counts
WITH counts AS (
    SELECT brew_id, COUNT(*) as cnt
    FROM likes
    GROUP BY brew_id
)
UPDATE brews
SET likes_count = counts.cnt
FROM counts
WHERE brews.id = counts.brew_id;

-- 3. Function to handle likes count update (Security Fix: Set search_path)
CREATE OR REPLACE FUNCTION handle_likes_count()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE brews
        SET likes_count = likes_count + 1
        WHERE id = NEW.brew_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE brews
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.brew_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 4. Trigger for likes count
DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION handle_likes_count();

-- 5. Harden RLS Policies (Privacy)
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON "public"."likes";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."likes";
DROP POLICY IF EXISTS "Users can view own likes" ON "public"."likes";

CREATE POLICY "Users can view own likes"
ON "public"."likes"
FOR SELECT
TO authenticated
USING ( (select auth.uid()) = user_id );

