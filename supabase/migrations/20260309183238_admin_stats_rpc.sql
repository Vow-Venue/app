-- Admin dashboard RPC functions (SECURITY DEFINER to bypass RLS)

-- ── get_admin_stats ─────────────────────────────────────────────────────────
-- Returns a single JSON object with all platform metrics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_total_users bigint;
  v_signups_7d bigint;
  v_signups_30d bigint;
  v_total_weddings bigint;
  v_weddings_30d bigint;
  v_pro_seats bigint;
  v_total_guests bigint;
  v_total_vendors bigint;
  v_total_messages bigint;
  v_inactive_users bigint;
  v_daily_weddings json;
BEGIN
  -- User counts from auth.users
  SELECT count(*) INTO v_total_users FROM auth.users;
  SELECT count(*) INTO v_signups_7d FROM auth.users WHERE created_at >= now() - interval '7 days';
  SELECT count(*) INTO v_signups_30d FROM auth.users WHERE created_at >= now() - interval '30 days';

  -- Wedding counts
  SELECT count(*) INTO v_total_weddings FROM weddings;
  SELECT count(*) INTO v_weddings_30d FROM weddings WHERE created_at >= now() - interval '30 days';

  -- Pro seats = distinct users who own at least one pro wedding
  SELECT count(DISTINCT user_id) INTO v_pro_seats FROM weddings WHERE plan = 'pro';

  -- Usage counts
  SELECT count(*) INTO v_total_guests FROM guests;
  SELECT count(*) INTO v_total_vendors FROM vendors;
  SELECT count(*) INTO v_total_messages FROM messages;

  -- Inactive users (signed up but own zero weddings)
  SELECT count(*) INTO v_inactive_users
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM weddings w WHERE w.user_id = u.id);

  -- Daily wedding creation last 30 days
  SELECT coalesce(json_agg(row_to_json(d)), '[]'::json)
  INTO v_daily_weddings
  FROM (
    SELECT created_at::date AS date, count(*) AS count
    FROM weddings
    WHERE created_at >= now() - interval '30 days'
    GROUP BY created_at::date
    ORDER BY created_at::date
  ) d;

  -- Build result
  result := json_build_object(
    'total_users', v_total_users,
    'signups_7d', v_signups_7d,
    'signups_30d', v_signups_30d,
    'total_weddings', v_total_weddings,
    'weddings_30d', v_weddings_30d,
    'pro_seats', v_pro_seats,
    'free_users', v_total_users - v_pro_seats,
    'mrr', v_pro_seats * 39,
    'arr', v_pro_seats * 39 * 12,
    'conversion_rate', CASE WHEN v_total_users > 0 THEN round((v_pro_seats::numeric / v_total_users) * 100, 1) ELSE 0 END,
    'inactive_users', v_inactive_users,
    'avg_weddings_per_user', CASE WHEN v_total_users > 0 THEN round(v_total_weddings::numeric / v_total_users, 2) ELSE 0 END,
    'total_guests', v_total_guests,
    'total_vendors', v_total_vendors,
    'total_messages', v_total_messages,
    'daily_weddings', v_daily_weddings
  );

  RETURN result;
END;
$$;

-- ── get_recent_signups ──────────────────────────────────────────────────────
-- Returns recent signups with wedding count and plan status
CREATE OR REPLACE FUNCTION get_recent_signups(limit_count int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  wedding_count bigint,
  plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    coalesce(ws.cnt, 0) AS wedding_count,
    CASE WHEN EXISTS (
      SELECT 1 FROM weddings w2 WHERE w2.user_id = u.id AND w2.plan = 'pro'
    ) THEN 'pro' ELSE 'free' END AS plan
  FROM auth.users u
  LEFT JOIN (
    SELECT w.user_id, count(*) AS cnt
    FROM weddings w
    GROUP BY w.user_id
  ) ws ON ws.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Grant anon access so these can be called without authentication
GRANT EXECUTE ON FUNCTION get_admin_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_recent_signups(int) TO anon;
