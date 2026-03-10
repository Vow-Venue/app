-- Add file attachment columns to timeline_days
ALTER TABLE timeline_days ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE timeline_days ADD COLUMN IF NOT EXISTS file_name text;

-- Create timeline-files storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('timeline-files', 'timeline-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload timeline files
CREATE POLICY "Users can upload timeline files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'timeline-files');

-- Allow authenticated users to update/overwrite timeline files
CREATE POLICY "Users can update timeline files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'timeline-files');

-- Allow public read of timeline files
CREATE POLICY "Public can view timeline files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'timeline-files');

-- Allow authenticated users to delete timeline files
CREATE POLICY "Users can delete timeline files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'timeline-files');
