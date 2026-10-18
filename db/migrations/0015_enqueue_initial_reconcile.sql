-- The app role stays off the job queue. Linking an external project queues its
-- first reconcile through this function instead. The kind, payload, and
-- idempotency key are fixed here because idempotency keys are global: a direct
-- INSERT grant would let one workspace claim keys that another workspace's
-- webhook or reconcile jobs rely on.

CREATE FUNCTION enqueue_initial_reconcile(p_connection_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  wid uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT workspace_id INTO wid FROM project_connections WHERE id = p_connection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project connection not found';
  END IF;
  -- has_workspace_role is NULL for non-members, so test IS NOT TRUE.
  IF has_workspace_role(wid, ARRAY['owner', 'admin']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  INSERT INTO jobs (workspace_id, kind, payload, status, idempotency_key)
  VALUES (
    wid,
    'reconcile',
    jsonb_build_object('connectionId', p_connection_id),
    'pending',
    'reconcile:' || p_connection_id::text || ':initial'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION enqueue_initial_reconcile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_initial_reconcile(uuid) TO atrium_app;
