-- ── Timeline Days ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Wedding Day',
  date date,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE timeline_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view timeline_days"
  ON timeline_days FOR SELECT TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_days.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can insert timeline_days"
  ON timeline_days FOR INSERT TO authenticated
  WITH CHECK (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_days.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can update timeline_days"
  ON timeline_days FOR UPDATE TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_days.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can delete timeline_days"
  ON timeline_days FOR DELETE TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_days.wedding_id and wm.user_id = auth.uid()));

-- ── Timeline Events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES timeline_days(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  time text NOT NULL DEFAULT '12:00',
  title text NOT NULL DEFAULT '',
  location text,
  assigned_to text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view timeline_events"
  ON timeline_events FOR SELECT TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_events.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can insert timeline_events"
  ON timeline_events FOR INSERT TO authenticated
  WITH CHECK (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_events.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can update timeline_events"
  ON timeline_events FOR UPDATE TO authenticated
  WITH CHECK (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_events.wedding_id and wm.user_id = auth.uid()));

CREATE POLICY "Members can delete timeline_events"
  ON timeline_events FOR DELETE TO authenticated
  USING (exists (select 1 from wedding_members wm where wm.wedding_id = timeline_events.wedding_id and wm.user_id = auth.uid()));
