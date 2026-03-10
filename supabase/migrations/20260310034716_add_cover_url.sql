-- Add cover_url column to weddings
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS cover_url text;

-- Create wedding-covers storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-covers', 'wedding-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload covers for their weddings
CREATE POLICY "Users can upload wedding covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wedding-covers');

-- Allow authenticated users to update/overwrite their covers
CREATE POLICY "Users can update wedding covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wedding-covers');

-- Allow public read of wedding covers
CREATE POLICY "Public can view wedding covers"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'wedding-covers');
