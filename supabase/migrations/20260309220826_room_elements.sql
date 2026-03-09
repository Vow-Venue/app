-- ── Room Elements (non-seat decorative floor plan items) ────────────────────
CREATE TABLE IF NOT EXISTS room_elements (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid        NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'dance_floor',
  label      text        NOT NULL DEFAULT '',
  x          integer     NOT NULL DEFAULT 100,
  y          integer     NOT NULL DEFAULT 100,
  width      integer     NOT NULL DEFAULT 200,
  height     integer     NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view room_elements"
  ON room_elements FOR SELECT TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = room_elements.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can insert room_elements"
  ON room_elements FOR INSERT TO authenticated
  WITH CHECK (exists (select 1 from wedding_members wm where wm.wedding_id = room_elements.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can update room_elements"
  ON room_elements FOR UPDATE TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = room_elements.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can delete room_elements"
  ON room_elements FOR DELETE TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = room_elements.wedding_id and wm.user_id = auth.uid()));
