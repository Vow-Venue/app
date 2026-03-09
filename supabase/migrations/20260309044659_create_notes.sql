-- Notes table for wedding planning notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  visibility VARCHAR(20) DEFAULT 'shared',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX notes_wedding_id_idx ON notes(wedding_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wedding_members
      WHERE wedding_members.wedding_id = notes.wedding_id
      AND wedding_members.user_id = auth.uid()
    )
  );

CREATE POLICY notes_insert ON notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_members
      WHERE wedding_members.wedding_id = notes.wedding_id
      AND wedding_members.user_id = auth.uid()
    )
  );

CREATE POLICY notes_update ON notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM wedding_members
      WHERE wedding_members.wedding_id = notes.wedding_id
      AND wedding_members.user_id = auth.uid()
    )
  );

CREATE POLICY notes_delete ON notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM wedding_members
      WHERE wedding_members.wedding_id = notes.wedding_id
      AND wedding_members.user_id = auth.uid()
    )
  );
