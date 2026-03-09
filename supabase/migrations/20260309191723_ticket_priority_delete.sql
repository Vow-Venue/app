-- Add priority column to support_tickets
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('normal', 'urgent'));

-- Must drop + recreate because return type changed (added priority column)
DROP FUNCTION IF EXISTS get_support_tickets(int);

CREATE OR REPLACE FUNCTION get_support_tickets(limit_count int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  subject text,
  message text,
  status text,
  priority text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.user_id, t.email, t.subject, t.message, t.status, t.priority, t.created_at
  FROM support_tickets t
  ORDER BY t.created_at DESC
  LIMIT limit_count;
END;
$$;

-- RPC to update ticket priority
CREATE OR REPLACE FUNCTION update_ticket_priority(ticket_id uuid, new_priority text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_tickets SET priority = new_priority WHERE id = ticket_id;
END;
$$;

-- RPC to delete a ticket
CREATE OR REPLACE FUNCTION delete_ticket(ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM support_tickets WHERE id = ticket_id;
END;
$$;

-- Grant anon access (re-grant get_support_tickets since we dropped+recreated it)
GRANT EXECUTE ON FUNCTION get_support_tickets(int) TO anon;
GRANT EXECUTE ON FUNCTION update_ticket_priority(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION delete_ticket(uuid) TO anon;
