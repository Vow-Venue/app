-- ============================================================================
-- Role-Based Permissions Migration
-- Restricts write operations to owner/planner roles only.
-- Preserves: RSVP public insert/update, collaborator upsert for invite
-- redemption, and message INSERT for all members.
-- ============================================================================

-- ── 1. CHECK constraint on wedding_members.role ─────────────────────────────

-- Clean up any invalid roles first
UPDATE wedding_members SET role = 'viewer'
WHERE role NOT IN ('owner','planner','couple','family','vendor','viewer');

ALTER TABLE wedding_members
  DROP CONSTRAINT IF EXISTS wedding_members_role_check;

ALTER TABLE wedding_members
  ADD CONSTRAINT wedding_members_role_check
  CHECK (role IN ('owner','planner','couple','family','vendor','viewer'));

-- ── 2. Helper function: is_editor(wedding_id) ──────────────────────────────

CREATE OR REPLACE FUNCTION is_editor(w_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM wedding_members
    WHERE wedding_id = w_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'planner')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 3. Replace write policies on guests ─────────────────────────────────────
-- Keep RSVP insert/update policies untouched (public RSVP flow)

DROP POLICY IF EXISTS "guests_insert_member" ON guests;
DROP POLICY IF EXISTS "guests_update_member" ON guests;
DROP POLICY IF EXISTS "guests_delete_member" ON guests;

CREATE POLICY "guests_insert_editor" ON guests FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "guests_update_editor" ON guests FOR UPDATE
  USING (is_editor(wedding_id));

CREATE POLICY "guests_delete_editor" ON guests FOR DELETE
  USING (is_editor(wedding_id));

-- ── 4. Replace write policies on tasks ──────────────────────────────────────

DROP POLICY IF EXISTS "tasks_insert_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_member" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_member" ON tasks;

CREATE POLICY "tasks_insert_editor" ON tasks FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "tasks_update_editor" ON tasks FOR UPDATE
  USING (is_editor(wedding_id));

CREATE POLICY "tasks_delete_editor" ON tasks FOR DELETE
  USING (is_editor(wedding_id));

-- ── 5. Replace write policies on vendors ────────────────────────────────────

DROP POLICY IF EXISTS "vendors_insert_member" ON vendors;
DROP POLICY IF EXISTS "vendors_update_member" ON vendors;
DROP POLICY IF EXISTS "vendors_delete_member" ON vendors;

CREATE POLICY "vendors_insert_editor" ON vendors FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "vendors_update_editor" ON vendors FOR UPDATE
  USING (is_editor(wedding_id));

CREATE POLICY "vendors_delete_editor" ON vendors FOR DELETE
  USING (is_editor(wedding_id));

-- ── 6. Replace write policies on invoices ───────────────────────────────────

DROP POLICY IF EXISTS "invoices_insert_member" ON invoices;
DROP POLICY IF EXISTS "invoices_update_member" ON invoices;
DROP POLICY IF EXISTS "invoices_delete_member" ON invoices;

CREATE POLICY "invoices_insert_editor" ON invoices FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "invoices_update_editor" ON invoices FOR UPDATE
  USING (is_editor(wedding_id));

CREATE POLICY "invoices_delete_editor" ON invoices FOR DELETE
  USING (is_editor(wedding_id));

-- ── 7. Replace write policies on seating_tables ─────────────────────────────

DROP POLICY IF EXISTS "tables_insert_member" ON seating_tables;
DROP POLICY IF EXISTS "tables_update_member" ON seating_tables;
DROP POLICY IF EXISTS "tables_delete_member" ON seating_tables;

CREATE POLICY "tables_insert_editor" ON seating_tables FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "tables_update_editor" ON seating_tables FOR UPDATE
  USING (is_editor(wedding_id));

CREATE POLICY "tables_delete_editor" ON seating_tables FOR DELETE
  USING (is_editor(wedding_id));

-- ── 8. Replace write policies on notes ──────────────────────────────────────

DROP POLICY IF EXISTS "notes_insert" ON notes;
DROP POLICY IF EXISTS "notes_update" ON notes;
DROP POLICY IF EXISTS "notes_delete" ON notes;

CREATE POLICY "notes_insert_editor" ON notes FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "notes_update_editor" ON notes FOR UPDATE
  USING (is_editor(wedding_id));

CREATE POLICY "notes_delete_editor" ON notes FOR DELETE
  USING (is_editor(wedding_id));

-- ── 9. Replace write policies on collaborators ──────────────────────────────
-- Keep collabs_update_member (needed for invite redemption upsert)

DROP POLICY IF EXISTS "collabs_insert_member" ON collaborators;
DROP POLICY IF EXISTS "collabs_delete_member" ON collaborators;

CREATE POLICY "collabs_insert_editor" ON collaborators FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "collabs_delete_editor" ON collaborators FOR DELETE
  USING (is_editor(wedding_id));

-- ── 10. Replace write policies on channels ──────────────────────────────────

DROP POLICY IF EXISTS "channels_insert_member" ON channels;
DROP POLICY IF EXISTS "channels_delete_member" ON channels;

CREATE POLICY "channels_insert_editor" ON channels FOR INSERT
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "channels_delete_editor" ON channels FOR DELETE
  USING (is_editor(wedding_id));

-- ── 11. Messages: keep INSERT for all members (everyone can send) ───────────
-- No changes needed — messages_insert_member stays as-is.
-- The "Users manage own messages" policy covers owner writes.
