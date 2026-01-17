-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('labels', 'labels', true),
  ('caps', 'caps', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can read labels
CREATE POLICY "Public Access Labels"
ON storage.objects FOR SELECT
USING ( bucket_id = 'labels' );

-- Policy: Authenticated users can upload labels
CREATE POLICY "Authenticated Upload Labels"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'labels' AND auth.role() = 'authenticated' );

-- Policy: Users can update their own labels (simplified to authenticated for MVP)
CREATE POLICY "Authenticated Update Labels"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'labels' AND auth.role() = 'authenticated' );

-- Caps Policies
CREATE POLICY "Public Access Caps"
ON storage.objects FOR SELECT
USING ( bucket_id = 'caps' );

CREATE POLICY "Authenticated Upload Caps"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'caps' AND auth.role() = 'authenticated' );
