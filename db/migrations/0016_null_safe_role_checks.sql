-- workspace_role and has_workspace_role return NULL for a non-member, and
-- PL/pgSQL's IF treats NULL as false. So `IF NOT has_workspace_role(...)` and
-- `IF actor_role NOT IN (...)` skipped their RAISE for any authenticated user
-- outside the workspace: create_invitation let them invite themselves as admin
-- of any workspace, and the retry functions let them requeue another
-- workspace's dead-letter rows. Only the guard lines differ from 0001.

CREATE OR REPLACE FUNCTION create_invitation(
  p_workspace_id uuid,
  p_email text,
  p_role text,
  p_token_hash text,
  p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  actor_role text;
  iid uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  actor_role := workspace_role(p_workspace_id);
  IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF p_role NOT IN ('admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid invitation role';
  END IF;
  IF actor_role = 'admin' AND p_role = 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only an owner can invite an admin';
  END IF;
  INSERT INTO workspace_invitations (workspace_id, email, role, token_hash, invited_by, expires_at)
  VALUES (p_workspace_id, lower(trim(p_email)), p_role, p_token_hash, actor, p_expires_at)
  RETURNING id INTO iid;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_workspace_id, actor, 'invitation.created', 'workspace_invitation', iid::text,
          jsonb_build_object('email', lower(trim(p_email)), 'role', p_role));
  RETURN iid;
END;
$$;

CREATE OR REPLACE FUNCTION retry_dead_job(p_job_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  job jobs%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO job FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  IF job.workspace_id IS NULL OR has_workspace_role(job.workspace_id, ARRAY['owner', 'admin']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF job.status <> 'dead' THEN
    RAISE EXCEPTION 'Only dead-letter jobs can be retried';
  END IF;
  UPDATE jobs
  SET status = 'pending', attempts = 0, last_error = NULL, run_at = now(), locked_at = NULL, locked_by = NULL, updated_at = now()
  WHERE id = p_job_id;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (job.workspace_id, actor, 'sync.job_retried', 'job', p_job_id::text, jsonb_build_object('kind', job.kind));
END;
$$;

CREATE OR REPLACE FUNCTION retry_dead_outbox(p_outbox_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  ev outbox_events%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO ev FROM outbox_events WHERE id = p_outbox_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outbox event not found';
  END IF;
  IF has_workspace_role(ev.workspace_id, ARRAY['owner', 'admin']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF ev.status <> 'dead' THEN
    RAISE EXCEPTION 'Only dead-letter outbox events can be retried';
  END IF;
  UPDATE outbox_events
  SET status = 'pending', attempts = 0, last_error = NULL, next_attempt_at = now(), locked_at = NULL, locked_by = NULL, updated_at = now()
  WHERE id = p_outbox_id;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (ev.workspace_id, actor, 'sync.outbox_retried', 'outbox_event', p_outbox_id::text, jsonb_build_object('type', ev.type));
END;
$$;
