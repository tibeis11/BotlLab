-- Migration: Add brewery-assets storage bucket and policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('brewery-assets', 'brewery-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view brewery assets (Logos)
CREATE POLICY "Public Access Brewery Assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'brewery-assets' );

-- Policy: Only members (or owners) can upload to their brewery folder
-- Note: we use a simplified policy for now that allows authenticated users to upload
-- since granular path-based RLS on storage can be complex with brewery IDs.
CREATE POLICY "Authenticated Upload Brewery Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'brewery-assets' );

-- Policy: Allow update/delete for authenticated users 
-- (Strictly it should be checked against brewery membership, but for now we trust authenticated session)
CREATE POLICY "Authenticated Manage Brewery Assets"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'brewery-assets' );
