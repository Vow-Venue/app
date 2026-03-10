-- Guidance blocks table for couple welcome packets
CREATE TABLE guidance_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text','file','image','header')),
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX guidance_blocks_wedding_idx ON guidance_blocks(wedding_id);

ALTER TABLE guidance_blocks ENABLE ROW LEVEL SECURITY;

-- All wedding members can read
CREATE POLICY "guidance_blocks_select" ON guidance_blocks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM wedding_members
    WHERE wedding_members.wedding_id = guidance_blocks.wedding_id
    AND wedding_members.user_id = auth.uid()
  ));

-- Only editors (owner/planner) can write
CREATE POLICY "guidance_blocks_insert" ON guidance_blocks FOR INSERT TO authenticated
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "guidance_blocks_update" ON guidance_blocks FOR UPDATE TO authenticated
  USING (is_editor(wedding_id));

CREATE POLICY "guidance_blocks_delete" ON guidance_blocks FOR DELETE TO authenticated
  USING (is_editor(wedding_id));

-- Storage bucket for guidance file/image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('guidance-files', 'guidance-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "guidance_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guidance-files');

CREATE POLICY "guidance_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'guidance-files');

CREATE POLICY "guidance_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'guidance-files');

CREATE POLICY "guidance_files_select" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'guidance-files');
