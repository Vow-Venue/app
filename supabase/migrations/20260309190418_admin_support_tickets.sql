-- ── Support tickets table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tickets
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Admin RPC: get all tickets (bypasses RLS) ───────────────────────────────
CREATE OR REPLACE FUNCTION get_support_tickets(limit_count int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  subject text,
  message text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.user_id, t.email, t.subject, t.message, t.status, t.created_at
  FROM support_tickets t
  ORDER BY t.created_at DESC
  LIMIT limit_count;
END;
$$;

-- ── Admin RPC: update ticket status ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_ticket_status(ticket_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_tickets SET status = new_status WHERE id = ticket_id;
END;
$$;

-- ── Admin RPC: get storage stats (wedding-covers bucket) ────────────────────
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_file_count bigint;
  v_total_bytes bigint;
BEGIN
  SELECT count(*), coalesce(sum((metadata->>'size')::bigint), 0)
  INTO v_file_count, v_total_bytes
  FROM storage.objects
  WHERE bucket_id = 'wedding-covers';

  result := json_build_object(
    'file_count', v_file_count,
    'total_bytes', v_total_bytes,
    'total_mb', round(v_total_bytes::numeric / (1024 * 1024), 2)
  );
  RETURN result;
END;
$$;

-- ── Admin RPC: get system health indicators ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_db_ok boolean;
  v_last_login timestamptz;
  v_last_ticket timestamptz;
BEGIN
  -- DB check (if we got here, DB is alive)
  v_db_ok := true;

  -- Last user login
  SELECT max(last_sign_in_at) INTO v_last_login FROM auth.users;

  -- Last support ticket (proxy for app activity)
  SELECT max(created_at) INTO v_last_ticket FROM support_tickets;

  result := json_build_object(
    'db_ok', v_db_ok,
    'last_login', v_last_login,
    'last_ticket', v_last_ticket
  );
  RETURN result;
END;
$$;

-- Grant anon access so admin dashboard can call without auth session
GRANT EXECUTE ON FUNCTION get_support_tickets(int) TO anon;
GRANT EXECUTE ON FUNCTION update_ticket_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION get_storage_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_system_health() TO anon;
