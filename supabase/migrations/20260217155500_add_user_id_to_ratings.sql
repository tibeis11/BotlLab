-- Add user_id column to ratings table if it doesn't exist
ALTER TABLE public.ratings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings(user_id);

-- Update RLS policies (optional but recommended)
-- Allow users to update their own ratings (if we want that)
-- CREATE POLICY "Users can update their own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = user_id);
