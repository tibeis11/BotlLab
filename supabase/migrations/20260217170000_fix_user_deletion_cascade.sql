-- Fix profiles deletion
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix brews deletion (redundant but safe)
ALTER TABLE public.brews 
DROP CONSTRAINT IF EXISTS brews_user_id_fkey,
ADD CONSTRAINT brews_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix bottles deletion
ALTER TABLE public.bottles 
DROP CONSTRAINT IF EXISTS bottles_user_id_fkey,
ADD CONSTRAINT bottles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
