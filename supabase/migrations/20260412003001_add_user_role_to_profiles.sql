-- Add user_role to profiles: 'planner' or 'couple'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_role text
  CHECK (user_role IN ('planner', 'couple'));
