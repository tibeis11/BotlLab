-- Fix missing foreign key constraint for brewery_members -> profiles

-- 1. Sicherstellen, dass user_id UUID ist (falls es das nicht schon ist)
-- ALTER TABLE brewery_members ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- 2. FK erstellen
ALTER TABLE brewery_members
ADD CONSTRAINT brewery_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Überprüfung
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'brewery_members' AND kcu.column_name = 'user_id';
