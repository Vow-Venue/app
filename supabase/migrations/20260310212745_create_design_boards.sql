-- ── design_boards table ──────────────────────────────────────────────────────
CREATE TABLE design_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX design_boards_wedding_idx ON design_boards(wedding_id);

ALTER TABLE design_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_boards_select" ON design_boards FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM wedding_members
    WHERE wedding_members.wedding_id = design_boards.wedding_id
    AND wedding_members.user_id = auth.uid()
  ));

CREATE POLICY "design_boards_insert" ON design_boards FOR INSERT TO authenticated
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "design_boards_update" ON design_boards FOR UPDATE TO authenticated
  USING (is_editor(wedding_id));

CREATE POLICY "design_boards_delete" ON design_boards FOR DELETE TO authenticated
  USING (is_editor(wedding_id));

-- ── design_photos table ──────────────────────────────────────────────────────
CREATE TABLE design_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES design_boards(id) ON DELETE CASCADE,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX design_photos_board_idx ON design_photos(board_id);
CREATE INDEX design_photos_wedding_idx ON design_photos(wedding_id);

ALTER TABLE design_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_photos_select" ON design_photos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM wedding_members
    WHERE wedding_members.wedding_id = design_photos.wedding_id
    AND wedding_members.user_id = auth.uid()
  ));

CREATE POLICY "design_photos_insert" ON design_photos FOR INSERT TO authenticated
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "design_photos_update" ON design_photos FOR UPDATE TO authenticated
  USING (is_editor(wedding_id));

CREATE POLICY "design_photos_delete" ON design_photos FOR DELETE TO authenticated
  USING (is_editor(wedding_id));

-- ── Storage bucket ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-boards', 'design-boards', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "design_boards_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'design-boards');

CREATE POLICY "design_boards_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'design-boards');

CREATE POLICY "design_boards_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'design-boards');

CREATE POLICY "design_boards_files_select" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'design-boards');
