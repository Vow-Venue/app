-- ── Org Dashboard Enhancements ──────────────────────────────────────────────

-- 1. Add studio_name to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS studio_name text;

-- 2. Add website to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website text;

-- 3. Update profiles SELECT policy to allow viewing co-member profiles
--    (needed for Team Members panel to display other planners' names/avatars)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own and co-member profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM wedding_members wm1
      JOIN wedding_members wm2 ON wm1.wedding_id = wm2.wedding_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

-- 4. Task templates table (user-owned reusable checklists)
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON task_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON task_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON task_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON task_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Template tasks table (individual tasks within a template)
CREATE TABLE IF NOT EXISTS template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  assignee_role text DEFAULT 'planner',
  offset_days int DEFAULT 0,
  priority text NOT NULL DEFAULT 'medium',
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template tasks"
  ON template_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM task_templates WHERE id = template_tasks.template_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own template tasks"
  ON template_tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM task_templates WHERE id = template_tasks.template_id AND user_id = auth.uid()));

CREATE POLICY "Users can update own template tasks"
  ON template_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM task_templates WHERE id = template_tasks.template_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own template tasks"
  ON template_tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM task_templates WHERE id = template_tasks.template_id AND user_id = auth.uid()));
