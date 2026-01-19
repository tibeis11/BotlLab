-- Fix: Remove duplicate likes and enforce uniqueness
-- This solves the issue where users couldn't unlike if they had multiple like records

-- 1. Remove duplicates, keeping the most recent one (highest ID assumption or just one of them)
DELETE FROM likes a USING likes b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND a.brew_id = b.brew_id;

-- 2. Add Unique Constraint
ALTER TABLE likes
ADD CONSTRAINT likes_user_brew_unique UNIQUE (user_id, brew_id);

-- 3. Also fix the toggleBrewLike action logic implicitly by ensuring DB integrity
-- But just in case, let's recalculate likes_count for all brews to matches the reality
-- This is an expensive operation, but ensures consistency
UPDATE brews b
SET likes_count = (
    SELECT count(*)
    FROM likes l
    WHERE l.brew_id = b.id
);
