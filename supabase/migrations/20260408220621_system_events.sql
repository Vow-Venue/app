-- System events table for tracking edge function activity
CREATE TABLE IF NOT EXISTS system_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,  -- 'stripe_webhook', 'resend_email'
  detail text,               -- optional context (e.g. event name, recipient)
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert (edge functions use service_role key)
CREATE POLICY "service_role_insert" ON system_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Anon can read (admin dashboard reads via RPC, but direct read is fine too)
CREATE POLICY "anon_read" ON system_events
  FOR SELECT TO anon USING (true);

-- Index for fast lookups by event_type
CREATE INDEX idx_system_events_type_created ON system_events (event_type, created_at DESC);

-- Update get_system_health to include stripe and resend timestamps
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_last_login timestamptz;
  v_last_ticket timestamptz;
  v_last_stripe timestamptz;
  v_last_resend timestamptz;
BEGIN
  SELECT max(last_sign_in_at) INTO v_last_login FROM auth.users;
  SELECT max(created_at) INTO v_last_ticket FROM support_tickets;
  SELECT max(created_at) INTO v_last_stripe FROM system_events WHERE event_type = 'stripe_webhook';
  SELECT max(created_at) INTO v_last_resend FROM system_events WHERE event_type = 'resend_email';

  result := json_build_object(
    'db_ok', true,
    'last_login', v_last_login,
    'last_ticket', v_last_ticket,
    'last_stripe_webhook', v_last_stripe,
    'last_resend_email', v_last_resend
  );
  RETURN result;
END;
$$;
