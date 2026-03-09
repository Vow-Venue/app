-- ── Profiles table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ── Avatars storage bucket ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload their own avatar (path: {user_id}/avatar.*)
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone can view avatars (public bucket)
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- ── Delete account RPC ──────────────────────────────────────────────────────
-- Deletes weddings the user solely owns (no other owner/planner members).
-- Preserves weddings shared with other planners (just removes the user's membership).
-- Finally deletes the user from auth.users (cascades to profiles).
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wedding_id uuid;
BEGIN
  -- For each wedding the user owns
  FOR v_wedding_id IN
    SELECT wm.wedding_id FROM wedding_members wm
    WHERE wm.user_id = v_user_id AND wm.role = 'owner'
  LOOP
    -- Check if any other owner/planner exists on this wedding
    IF NOT EXISTS (
      SELECT 1 FROM wedding_members wm2
      WHERE wm2.wedding_id = v_wedding_id
        AND wm2.user_id != v_user_id
        AND wm2.role IN ('owner', 'planner')
    ) THEN
      -- Sole owner: delete the wedding (cascades data via FKs)
      DELETE FROM weddings WHERE id = v_wedding_id;
    ELSE
      -- Shared: just remove user's membership
      DELETE FROM wedding_members WHERE wedding_id = v_wedding_id AND user_id = v_user_id;
    END IF;
  END LOOP;

  -- Remove user from any non-owned memberships
  DELETE FROM wedding_members WHERE user_id = v_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE id = v_user_id;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
