-- ============================================================================
-- RLS Security Fixes
-- 1. collaborators UPDATE: replace OR true with is_editor
-- 2. invite_tokens SELECT/UPDATE: scope to owner/planner, add RPC for redemption
-- 3. guests UPDATE: replace RSVP "true" with rsvp_slug scoped check
-- 4. timeline_days/events, room_elements: restrict writes to is_editor()
-- ============================================================================

-- ── 1. Fix collaborators UPDATE (was OR true) ───────────────────────────────
-- The old policy allowed ANY authenticated user to update ANY collaborator row.
-- New: only editors can update collaborators. Invite redemption now uses an RPC.

DROP POLICY IF EXISTS "collabs_update_member" ON collaborators;

CREATE POLICY "collabs_update_editor" ON collaborators FOR UPDATE
  USING (is_editor(wedding_id));

-- ── 2. Fix invite_tokens SELECT/UPDATE (were both USING true) ───────────────
-- Old: any authenticated user could read/modify all tokens in the system.
-- New: only wedding owner/planner can view/manage tokens directly.
-- Invite redemption goes through a SECURITY DEFINER RPC instead.

DROP POLICY IF EXISTS "invite_tokens_select" ON invite_tokens;
DROP POLICY IF EXISTS "invite_tokens_update" ON invite_tokens;

CREATE POLICY "invite_tokens_select_editor" ON invite_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wedding_members wm
      WHERE wm.wedding_id = invite_tokens.wedding_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'planner')
    )
  );

CREATE POLICY "invite_tokens_update_editor" ON invite_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wedding_members wm
      WHERE wm.wedding_id = invite_tokens.wedding_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'planner')
    )
  );

-- Also add a DELETE policy (was missing — token cleanup needs it)
CREATE POLICY "invite_tokens_delete_editor" ON invite_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wedding_members wm
      WHERE wm.wedding_id = invite_tokens.wedding_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'planner')
    )
  );

-- RPC: Secure invite redemption (SECURITY DEFINER bypasses RLS)
-- Looks up token, validates, marks used, creates collaborator + wedding_member rows.
CREATE OR REPLACE FUNCTION redeem_invite(token_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tok record;
  mapped_role text;
BEGIN
  -- Look up unused token
  SELECT * INTO tok FROM invite_tokens
  WHERE token = token_value AND used = false
  LIMIT 1;

  IF tok IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid');
  END IF;

  -- Check 48h expiry
  IF tok.created_at + interval '48 hours' < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- Mark token used
  UPDATE invite_tokens SET used = true WHERE id = tok.id;

  -- Map collaborator role to wedding_member role
  mapped_role := CASE
    WHEN lower(tok.role) LIKE '%planner%' THEN 'planner'
    WHEN lower(tok.role) IN ('bride', 'groom', 'couple') THEN 'couple'
    WHEN lower(tok.role) = 'family' THEN 'family'
    WHEN lower(tok.role) LIKE '%vendor%' THEN 'vendor'
    ELSE 'viewer'
  END;

  -- Upsert collaborator row
  INSERT INTO collaborators (wedding_id, user_id, name, email, role, access)
  VALUES (tok.wedding_id, auth.uid(), tok.name, tok.email, tok.role, tok.access)
  ON CONFLICT (wedding_id, email)
  DO UPDATE SET user_id = auth.uid(), name = EXCLUDED.name, role = EXCLUDED.role, access = EXCLUDED.access;

  -- Upsert wedding_member row
  INSERT INTO wedding_members (wedding_id, user_id, role)
  VALUES (tok.wedding_id, auth.uid(), mapped_role)
  ON CONFLICT (wedding_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;

  RETURN jsonb_build_object(
    'wedding_id', tok.wedding_id,
    'name', tok.name,
    'email', tok.email,
    'role', tok.role,
    'access', tok.access
  );
END;
$$;

-- ── 3. Fix RSVP guest update (was USING true) ──────────────────────────────
-- Old: any user could update any guest row in any wedding.
-- New: only guests in weddings with an active RSVP slug can be updated publicly.

DROP POLICY IF EXISTS "RSVP update guest" ON guests;

CREATE POLICY "rsvp_update_guest" ON guests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weddings w
      WHERE w.id = guests.wedding_id
        AND w.rsvp_slug IS NOT NULL
    )
  );

-- ── 4. timeline_days: restrict writes to editors ────────────────────────────

DROP POLICY IF EXISTS "Members can insert timeline_days" ON timeline_days;
DROP POLICY IF EXISTS "Members can update timeline_days" ON timeline_days;
DROP POLICY IF EXISTS "Members can delete timeline_days" ON timeline_days;

CREATE POLICY "timeline_days_insert_editor" ON timeline_days FOR INSERT TO authenticated
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "timeline_days_update_editor" ON timeline_days FOR UPDATE TO authenticated
  USING (is_editor(wedding_id));

CREATE POLICY "timeline_days_delete_editor" ON timeline_days FOR DELETE TO authenticated
  USING (is_editor(wedding_id));

-- ── 5. timeline_events: restrict writes to editors ──────────────────────────

DROP POLICY IF EXISTS "Members can insert timeline_events" ON timeline_events;
DROP POLICY IF EXISTS "Members can update timeline_events" ON timeline_events;
DROP POLICY IF EXISTS "Members can delete timeline_events" ON timeline_events;

CREATE POLICY "timeline_events_insert_editor" ON timeline_events FOR INSERT TO authenticated
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "timeline_events_update_editor" ON timeline_events FOR UPDATE TO authenticated
  USING (is_editor(wedding_id));

CREATE POLICY "timeline_events_delete_editor" ON timeline_events FOR DELETE TO authenticated
  USING (is_editor(wedding_id));

-- ── 6. room_elements: restrict writes to editors ────────────────────────────

DROP POLICY IF EXISTS "Members can insert room_elements" ON room_elements;
DROP POLICY IF EXISTS "Members can update room_elements" ON room_elements;
DROP POLICY IF EXISTS "Members can delete room_elements" ON room_elements;

CREATE POLICY "room_elements_insert_editor" ON room_elements FOR INSERT TO authenticated
  WITH CHECK (is_editor(wedding_id));

CREATE POLICY "room_elements_update_editor" ON room_elements FOR UPDATE TO authenticated
  USING (is_editor(wedding_id));

CREATE POLICY "room_elements_delete_editor" ON room_elements FOR DELETE TO authenticated
  USING (is_editor(wedding_id));
