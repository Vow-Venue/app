-- RPC: get_user_detail — returns wedding details for a specific user (admin use)
CREATE OR REPLACE FUNCTION get_user_detail(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  partner1 text,
  partner2 text,
  wedding_date date,
  guest_count bigint,
  task_count bigint,
  vendor_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.partner1,
    w.partner2,
    w.wedding_date,
    (SELECT count(*) FROM guests g WHERE g.wedding_id = w.id) AS guest_count,
    (SELECT count(*) FROM tasks t WHERE t.wedding_id = w.id) AS task_count,
    (SELECT count(*) FROM vendors v WHERE v.wedding_id = w.id) AS vendor_count
  FROM weddings w
  JOIN wedding_members wm ON wm.wedding_id = w.id
  WHERE wm.user_id = target_user_id
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
