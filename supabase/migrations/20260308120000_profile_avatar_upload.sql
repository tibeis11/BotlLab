-- Migration: Profile Avatar Upload
-- Adds pending_avatar_url to profiles, resets tier-based avatars,
-- creates the avatars storage bucket.

-- 1. Add pending_avatar_url column
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pending_avatar_url TEXT DEFAULT NULL;

-- 2. Reset all tier-based avatar images to NULL
--    (paths like /tiers/lehrling.png, /tiers/geselle.png, etc.)
UPDATE public.profiles
SET logo_url = NULL
WHERE logo_url LIKE '/tiers/%';

-- 3. Create avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies for avatars bucket
CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated Upload Avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Users Delete Own Avatars"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
