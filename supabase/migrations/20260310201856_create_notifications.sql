-- ── Notifications table ───────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wedding_id  UUID        REFERENCES weddings(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  link_tab    TEXT,
  ref_id      TEXT,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx    ON notifications(user_id);
CREATE INDEX notifications_wedding_idx ON notifications(wedding_id);
CREATE INDEX notifications_created_idx ON notifications(created_at DESC);

-- Partial unique index for dedup: one notification per user per source event
CREATE UNIQUE INDEX notifications_dedup_idx
  ON notifications(user_id, ref_id)
  WHERE ref_id IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif_insert" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notif_delete" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ── Trigger: new message → notify channel members ───────────────────────────
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  v_wedding_id UUID;
  v_channel_name TEXT;
BEGIN
  IF NEW.sender_id = 'system' THEN RETURN NEW; END IF;

  SELECT c.wedding_id, c.name INTO v_wedding_id, v_channel_name
  FROM channels c WHERE c.id = NEW.channel_id;

  IF v_wedding_id IS NULL THEN RETURN NEW; END IF;

  FOR r IN
    SELECT cm.user_id
    FROM channel_members cm
    WHERE cm.channel_id = NEW.channel_id
      AND cm.user_id::text <> NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, wedding_id, type, message, link_tab, ref_id)
    VALUES (
      r.user_id,
      v_wedding_id,
      'message',
      NEW.sender_name || ' in #' || v_channel_name,
      'messaging',
      'msg-' || NEW.id::text
    )
    ON CONFLICT (user_id, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- ── Trigger: guest RSVP change → notify owners/planners ─────────────────────
CREATE OR REPLACE FUNCTION notify_guest_rsvp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.rsvp = OLD.rsvp THEN RETURN NEW; END IF;
  IF NEW.rsvp NOT IN ('yes', 'no') THEN RETURN NEW; END IF;

  FOR r IN
    SELECT wm.user_id
    FROM wedding_members wm
    WHERE wm.wedding_id = NEW.wedding_id
      AND wm.role IN ('owner', 'planner')
  LOOP
    INSERT INTO notifications (user_id, wedding_id, type, message, link_tab, ref_id)
    VALUES (
      r.user_id,
      NEW.wedding_id,
      'rsvp',
      NEW.name || ' RSVP''d ' || UPPER(NEW.rsvp),
      'guests',
      'rsvp-' || NEW.id::text || '-' || NEW.rsvp
    )
    ON CONFLICT (user_id, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_guest_rsvp
  AFTER UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION notify_guest_rsvp();
