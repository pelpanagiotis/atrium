-- Atrium core schema, row-level security, and sync queue.
-- Applied by scripts/migrate.ts as the migrator role.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Auth tables (Better Auth). No RLS: the auth library reads sessions before
-- a workspace context exists. Domain tables below are protected.
-- ---------------------------------------------------------------------------

CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_id_idx ON session (user_id);

CREATE TABLE account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_user_id_idx ON account (user_id);

CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification (identifier);

-- ---------------------------------------------------------------------------
-- Workspaces
-- ---------------------------------------------------------------------------

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('personal', 'work')),
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX workspace_members_user_idx ON workspace_members (user_id);

CREATE TABLE workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token_hash text NOT NULL UNIQUE,
  invited_by text NOT NULL REFERENCES "user"(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email, token_hash)
);
CREATE INDEX workspace_invitations_workspace_idx ON workspace_invitations (workspace_id, email);

-- ---------------------------------------------------------------------------
-- Projects, milestones, tasks
-- ---------------------------------------------------------------------------

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  -- hybrid is reserved and rejected by the application.
  ownership_mode text NOT NULL CHECK (ownership_mode IN ('native', 'external', 'hybrid')),
  created_by text NOT NULL REFERENCES "user"(id),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_workspace_status_idx ON projects (workspace_id, status);
CREATE INDEX projects_name_trgm ON projects USING gin (name gin_trgm_ops);

CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX milestones_project_idx ON milestones (project_id);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority text NOT NULL CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  assignee_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  assignee_provider_id text,
  assignee_label text,
  provider text CHECK (provider IN ('linear', 'jira', 'github', 'fake')),
  external_url text,
  sync_state text NOT NULL DEFAULT 'synced' CHECK (sync_state IN ('pending', 'synced', 'error', 'tombstone')),
  sync_error text,
  version integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  created_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_workspace_status_idx ON tasks (workspace_id, status) WHERE deleted_at IS NULL;
CREATE INDEX tasks_workspace_due_idx ON tasks (workspace_id, due_at) WHERE deleted_at IS NULL;
CREATE INDEX tasks_project_idx ON tasks (project_id);
CREATE INDEX tasks_assignee_idx ON tasks (assignee_user_id);
CREATE INDEX tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Integrations and external identity
-- ---------------------------------------------------------------------------

CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('linear', 'jira', 'github', 'fake')),
  status text NOT NULL CHECK (status IN ('connected', 'error', 'revoked')),
  display_name text NOT NULL,
  external_account_id text,
  -- Encrypted JSON credential blob. Null after revocation.
  credential_ciphertext text,
  scopes text[] NOT NULL DEFAULT '{}',
  connected_by text NOT NULL REFERENCES "user"(id),
  last_validated_at timestamptz,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX integrations_workspace_idx ON integrations (workspace_id, provider);

CREATE TABLE project_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_project_id text NOT NULL,
  provider_project_key text,
  provider_project_name text NOT NULL,
  provider_project_url text,
  field_mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Native projects only push when this is explicitly enabled.
  publish_outbound boolean NOT NULL DEFAULT false,
  sync_inbound boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, provider_project_id)
);
CREATE INDEX project_connections_workspace_idx ON project_connections (workspace_id);

CREATE TABLE external_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('issue', 'pull_request', 'project', 'comment', 'other')),
  provider_id text NOT NULL,
  local_entity_type text,
  local_entity_id uuid,
  provider_updated_at timestamptz,
  fingerprint text,
  last_outbound_fingerprint text,
  last_outbound_operation_id text,
  recent_outbound_fingerprints text[] NOT NULL DEFAULT '{}',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, entity_type, provider_id)
);
CREATE INDEX external_records_local_idx ON external_records (local_entity_type, local_entity_id);

CREATE TABLE sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  entity_type text NOT NULL,
  provider_id text,
  operation_id text,
  fingerprint text,
  status text NOT NULL CHECK (status IN ('pending', 'processed', 'skipped', 'failed', 'dead')),
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX sync_events_workspace_idx ON sync_events (workspace_id, created_at DESC);
CREATE UNIQUE INDEX sync_events_operation_fingerprint_idx
  ON sync_events (operation_id, fingerprint)
  WHERE operation_id IS NOT NULL AND fingerprint IS NOT NULL;

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  operation_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_pending_idx ON outbox_events (status, next_attempt_at);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_pending_idx ON jobs (status, run_at);

CREATE TABLE integration_sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  resource text NOT NULL,
  cursor text,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, resource)
);

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  delivery_id text NOT NULL,
  integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  signature_valid boolean NOT NULL,
  body_sha256 text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('received', 'processed', 'rejected', 'failed', 'dead')),
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, delivery_id)
);
CREATE INDEX webhook_deliveries_status_idx ON webhook_deliveries (status, received_at);

CREATE TABLE conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  field text NOT NULL,
  local_value jsonb,
  remote_value jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolution text CHECK (resolution IN ('keep_local', 'keep_remote')),
  resolved_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX conflicts_open_field_idx ON conflicts (task_id, field) WHERE status = 'open';
CREATE INDEX conflicts_workspace_idx ON conflicts (workspace_id, status);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_workspace_idx ON audit_events (workspace_id, created_at DESC);

CREATE TABLE user_preferences (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notify_sync_errors boolean NOT NULL DEFAULT true,
  notify_assignments boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

CREATE TABLE oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL,
  state_hash text NOT NULL UNIQUE,
  code_verifier_ciphertext text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX oauth_states_user_idx ON oauth_states (user_id);

-- Deterministic remote state for the fake provider. Not a user-facing table.
CREATE TABLE fake_provider_tasks (
  id text PRIMARY KEY,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_project_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL,
  priority text NOT NULL,
  due_at timestamptz,
  assignee_provider_id text,
  archived boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX fake_provider_tasks_project_idx ON fake_provider_tasks (integration_id, provider_project_id);

CREATE TABLE fake_provider_projects (
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_project_id text NOT NULL,
  name text NOT NULL,
  key text,
  url text,
  PRIMARY KEY (integration_id, provider_project_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION forbid_workspace_move() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '');
$$;

CREATE FUNCTION is_workspace_member(p_workspace_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = p_workspace_id
      AND m.user_id = app_user_id()
  );
$$;

CREATE FUNCTION workspace_role(p_workspace_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM workspace_members m
  WHERE m.workspace_id = p_workspace_id
    AND m.user_id = app_user_id();
$$;

CREATE FUNCTION has_workspace_role(p_workspace_id uuid, p_roles text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_role(p_workspace_id) = ANY (p_roles);
$$;

CREATE FUNCTION tasks_match_project() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wid uuid;
BEGIN
  SELECT workspace_id INTO wid FROM projects WHERE id = NEW.project_id;
  IF wid IS NULL THEN
    RAISE EXCEPTION 'project not found';
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM wid THEN
    RAISE EXCEPTION 'task workspace does not match project';
  END IF;
  IF NEW.milestone_id IS NOT NULL THEN
    PERFORM 1 FROM milestones WHERE id = NEW.milestone_id AND project_id = NEW.project_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'milestone does not belong to project';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION connections_match_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  project_workspace uuid;
  integration_workspace uuid;
BEGIN
  SELECT workspace_id INTO project_workspace FROM projects WHERE id = NEW.project_id;
  SELECT workspace_id INTO integration_workspace FROM integrations WHERE id = NEW.integration_id;
  IF project_workspace IS NULL OR integration_workspace IS NULL THEN
    RAISE EXCEPTION 'connection references missing records';
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM project_workspace
     OR NEW.workspace_id IS DISTINCT FROM integration_workspace THEN
    RAISE EXCEPTION 'connection workspace mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION outbox_same_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.integration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = NEW.integration_id AND i.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'outbox integration workspace mismatch';
  END IF;
  RETURN NEW;
END;
$$;

-- Privileged writers. Each function checks the session user itself.

CREATE FUNCTION create_workspace(
  p_name text,
  p_slug text,
  p_kind text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wid uuid;
  actor text := app_user_id();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_kind NOT IN ('personal', 'work') THEN
    RAISE EXCEPTION 'Invalid workspace kind';
  END IF;
  IF char_length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Workspace name must be at least 2 characters';
  END IF;
  INSERT INTO workspaces (name, slug, kind, created_by)
  VALUES (trim(p_name), p_slug, p_kind, actor)
  RETURNING id INTO wid;
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (wid, actor, 'owner');
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (wid, actor, 'workspace.created', 'workspace', wid::text, jsonb_build_object('kind', p_kind));
  RETURN wid;
END;
$$;

CREATE FUNCTION set_member_role(p_member_id uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  target workspace_members%ROWTYPE;
  actor_role text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  SELECT * INTO target FROM workspace_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  actor_role := workspace_role(target.workspace_id);
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF actor_role = 'owner' THEN
    NULL;
  ELSIF actor_role = 'admin' AND target.role IN ('member', 'viewer') AND p_role IN ('member', 'viewer') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unauthorized: you cannot assign this role';
  END IF;
  IF target.role = 'owner' AND p_role <> 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = target.workspace_id AND role = 'owner' AND id <> target.id
    ) THEN
      RAISE EXCEPTION 'Workspace must keep an owner';
    END IF;
  END IF;
  UPDATE workspace_members SET role = p_role, updated_at = now() WHERE id = p_member_id;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (target.workspace_id, actor, 'member.role_changed', 'workspace_member', p_member_id::text,
          jsonb_build_object('userId', target.user_id, 'role', p_role));
END;
$$;

CREATE FUNCTION remove_member(p_member_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  target workspace_members%ROWTYPE;
  actor_role text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO target FROM workspace_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  actor_role := workspace_role(target.workspace_id);
  IF target.user_id = actor AND target.role <> 'owner' THEN
    NULL;
  ELSIF actor_role = 'owner' AND target.role <> 'owner' THEN
    NULL;
  ELSIF actor_role = 'admin' AND target.role IN ('member', 'viewer') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM workspace_members WHERE id = p_member_id;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (target.workspace_id, actor, 'member.removed', 'workspace_member', p_member_id::text,
          jsonb_build_object('userId', target.user_id));
END;
$$;

CREATE FUNCTION create_invitation(
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
  IF actor_role NOT IN ('owner', 'admin') THEN
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

CREATE FUNCTION accept_invitation(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  actor_email text;
  inv workspace_invitations%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT email INTO actor_email FROM "user" WHERE id = actor;
  SELECT * INTO inv FROM workspace_invitations WHERE token_hash = p_token_hash;
  IF NOT FOUND OR inv.revoked_at IS NOT NULL OR inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  IF lower(inv.email) <> lower(actor_email) THEN
    RAISE EXCEPTION 'Invitation email does not match this account';
  END IF;
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, actor, inv.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();
  UPDATE workspace_invitations SET accepted_at = now() WHERE id = inv.id;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (inv.workspace_id, actor, 'invitation.accepted', 'workspace_invitation', inv.id::text,
          jsonb_build_object('role', inv.role));
  RETURN inv.workspace_id;
END;
$$;

CREATE FUNCTION write_audit(
  p_workspace_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor text := app_user_id();
  aid uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_workspace_id IS NOT NULL AND NOT is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_workspace_id, actor, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO aid;
  RETURN aid;
END;
$$;

CREATE FUNCTION integration_webhook_material(p_id uuid)
RETURNS TABLE (
  workspace_id uuid,
  provider text,
  status text,
  credential_ciphertext text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.workspace_id, i.provider, i.status, i.credential_ciphertext
  FROM integrations i
  WHERE i.id = p_id;
$$;

CREATE FUNCTION ingest_webhook(
  p_provider text,
  p_delivery_id text,
  p_signature_valid boolean,
  p_body_sha256 text,
  p_payload jsonb,
  p_integration_id uuid,
  p_workspace_id uuid
) RETURNS TABLE (delivery uuid, inserted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF p_provider NOT IN ('linear', 'jira', 'github', 'fake') THEN
    RAISE EXCEPTION 'Unknown provider';
  END IF;
  IF char_length(p_delivery_id) < 8 OR char_length(p_delivery_id) > 200 THEN
    RAISE EXCEPTION 'Invalid delivery id';
  END IF;
  SELECT id INTO existing_id FROM webhook_deliveries
  WHERE provider = p_provider AND delivery_id = p_delivery_id;
  IF existing_id IS NOT NULL THEN
    delivery := existing_id;
    inserted := false;
    RETURN NEXT;
    RETURN;
  END IF;
  INSERT INTO webhook_deliveries (
    provider, delivery_id, integration_id, workspace_id, signature_valid, body_sha256, payload, status
  ) VALUES (
    p_provider,
    p_delivery_id,
    p_integration_id,
    p_workspace_id,
    p_signature_valid,
    p_body_sha256,
    coalesce(p_payload, '{}'::jsonb),
    CASE WHEN p_signature_valid THEN 'received' ELSE 'rejected' END
  ) RETURNING id INTO new_id;
  IF p_signature_valid THEN
    INSERT INTO jobs (workspace_id, kind, payload, status, idempotency_key)
    VALUES (
      p_workspace_id,
      'process_webhook',
      jsonb_build_object('deliveryId', new_id),
      'pending',
      'webhook:' || p_provider || ':' || p_delivery_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  delivery := new_id;
  inserted := true;
  RETURN NEXT;
END;
$$;

CREATE FUNCTION claim_jobs(p_worker text, p_limit integer)
RETURNS SETOF jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE jobs j
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker,
      attempts = CASE WHEN j.status = 'processing' THEN j.attempts + 1 ELSE j.attempts END,
      updated_at = now()
  WHERE j.id IN (
    SELECT id FROM jobs
    WHERE (status = 'pending' AND run_at <= now())
       OR (status = 'processing' AND locked_at < now() - interval '10 minutes')
    ORDER BY run_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING j.*;
END;
$$;

CREATE FUNCTION claim_outbox(p_worker text, p_limit integer)
RETURNS SETOF outbox_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE outbox_events o
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker,
      attempts = CASE WHEN o.status = 'processing' THEN o.attempts + 1 ELSE o.attempts END,
      updated_at = now()
  WHERE o.id IN (
    SELECT id FROM outbox_events
    WHERE (status = 'pending' AND next_attempt_at <= now())
       OR (status = 'processing' AND locked_at < now() - interval '10 minutes')
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING o.*;
END;
$$;

CREATE FUNCTION retry_dead_job(p_job_id uuid) RETURNS void
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
  IF job.workspace_id IS NULL OR NOT has_workspace_role(job.workspace_id, ARRAY['owner', 'admin']) THEN
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

CREATE FUNCTION retry_dead_outbox(p_outbox_id uuid) RETURNS void
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
  IF NOT has_workspace_role(ev.workspace_id, ARRAY['owner', 'admin']) THEN
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

-- Triggers

CREATE TRIGGER workspaces_touch BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER projects_touch BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER projects_no_move BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION forbid_workspace_move();
CREATE TRIGGER milestones_touch BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tasks_touch BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tasks_no_move BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION forbid_workspace_move();
CREATE TRIGGER tasks_project_check BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_match_project();
CREATE TRIGGER integrations_touch BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER integrations_no_move BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION forbid_workspace_move();
CREATE TRIGGER connections_touch BEFORE UPDATE ON project_connections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER connections_check BEFORE INSERT OR UPDATE ON project_connections
  FOR EACH ROW EXECUTE FUNCTION connections_match_workspace();
CREATE TRIGGER external_records_touch BEFORE UPDATE ON external_records
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER outbox_touch BEFORE UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER outbox_check BEFORE INSERT OR UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION outbox_same_workspace();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER members_touch BEFORE UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE project_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE external_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_records FORCE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events FORCE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states FORCE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_cursors FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY workspaces_select ON workspaces FOR SELECT
  USING (is_workspace_member(id));
CREATE POLICY workspaces_update ON workspaces FOR UPDATE
  USING (has_workspace_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(id, ARRAY['owner', 'admin']));

CREATE POLICY members_select ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY invitations_select ON workspace_invitations FOR SELECT
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY projects_select ON projects FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
CREATE POLICY projects_update ON projects FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY milestones_select ON milestones FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY milestones_write ON milestones FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
CREATE POLICY milestones_update ON milestones FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));

CREATE POLICY integrations_select ON integrations FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY integrations_insert ON integrations FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
CREATE POLICY integrations_update ON integrations FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY connections_select ON project_connections FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY connections_insert ON project_connections FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
CREATE POLICY connections_update ON project_connections FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY external_select ON external_records FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY external_insert ON external_records FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));
CREATE POLICY external_update ON external_records FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));

CREATE POLICY sync_select ON sync_events FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY sync_insert ON sync_events FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY outbox_select ON outbox_events FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY outbox_insert ON outbox_events FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));
CREATE POLICY outbox_update ON outbox_events FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY conflicts_select ON conflicts FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY conflicts_insert ON conflicts FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));
CREATE POLICY conflicts_update ON conflicts FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));

CREATE POLICY audit_select ON audit_events FOR SELECT
  USING (workspace_id IS NOT NULL AND has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY cursors_select ON integration_sync_cursors FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY cursors_write ON integration_sync_cursors FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
CREATE POLICY cursors_update ON integration_sync_cursors FOR UPDATE
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

CREATE POLICY jobs_select ON jobs FOR SELECT
  USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY preferences_all ON user_preferences FOR ALL
  USING (user_id = app_user_id())
  WITH CHECK (user_id = app_user_id());

CREATE POLICY oauth_select ON oauth_states FOR SELECT
  USING (user_id = app_user_id());
CREATE POLICY oauth_insert ON oauth_states FOR INSERT
  WITH CHECK (user_id = app_user_id() AND has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
CREATE POLICY oauth_delete ON oauth_states FOR DELETE
  USING (user_id = app_user_id());

-- ---------------------------------------------------------------------------
-- Grants. The app role cannot bypass RLS. The worker role can.
-- Direct INSERT into workspaces and memberships is not granted.
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO atrium_app, atrium_worker;

GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification TO atrium_app, atrium_worker;
GRANT SELECT, UPDATE ON workspaces TO atrium_app;
GRANT SELECT ON workspace_members, workspace_invitations TO atrium_app;
GRANT SELECT, INSERT, UPDATE ON projects, milestones, tasks, integrations, project_connections,
  external_records, sync_events, conflicts, integration_sync_cursors TO atrium_app;
GRANT SELECT, INSERT ON outbox_events TO atrium_app;
GRANT SELECT ON jobs, audit_events TO atrium_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences, oauth_states, rate_limit_buckets TO atrium_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO atrium_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO atrium_app, atrium_worker;

REVOKE ALL ON FUNCTION create_workspace(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_member_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION remove_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_invitation(uuid, text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION accept_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION write_audit(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration_webhook_material(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION ingest_webhook(text, text, boolean, text, jsonb, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_jobs(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_outbox(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION retry_dead_job(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION retry_dead_outbox(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_workspace_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION workspace_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION has_workspace_role(uuid, text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_workspace(text, text, text) TO atrium_app;
GRANT EXECUTE ON FUNCTION set_member_role(uuid, text) TO atrium_app;
GRANT EXECUTE ON FUNCTION remove_member(uuid) TO atrium_app;
GRANT EXECUTE ON FUNCTION create_invitation(uuid, text, text, text, timestamptz) TO atrium_app;
GRANT EXECUTE ON FUNCTION accept_invitation(text) TO atrium_app;
GRANT EXECUTE ON FUNCTION write_audit(uuid, text, text, text, jsonb) TO atrium_app;
GRANT EXECUTE ON FUNCTION integration_webhook_material(uuid) TO atrium_app;
GRANT EXECUTE ON FUNCTION ingest_webhook(text, text, boolean, text, jsonb, uuid, uuid) TO atrium_app;
GRANT EXECUTE ON FUNCTION retry_dead_job(uuid) TO atrium_app;
GRANT EXECUTE ON FUNCTION retry_dead_outbox(uuid) TO atrium_app;
GRANT EXECUTE ON FUNCTION is_workspace_member(uuid) TO atrium_app, atrium_worker;
GRANT EXECUTE ON FUNCTION workspace_role(uuid) TO atrium_app, atrium_worker;
GRANT EXECUTE ON FUNCTION has_workspace_role(uuid, text[]) TO atrium_app, atrium_worker;
GRANT EXECUTE ON FUNCTION claim_jobs(text, integer) TO atrium_worker;
GRANT EXECUTE ON FUNCTION claim_outbox(text, integer) TO atrium_worker;

-- Fake provider rows are workspace-scoped through their integration.
ALTER TABLE fake_provider_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fake_provider_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE fake_provider_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fake_provider_projects FORCE ROW LEVEL SECURITY;

CREATE POLICY fake_tasks_select ON fake_provider_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = fake_provider_tasks.integration_id
      AND is_workspace_member(i.workspace_id)
  ));
CREATE POLICY fake_tasks_write ON fake_provider_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = fake_provider_tasks.integration_id
      AND has_workspace_role(i.workspace_id, ARRAY['owner', 'admin', 'member'])
  ));
CREATE POLICY fake_tasks_update ON fake_provider_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = fake_provider_tasks.integration_id
      AND has_workspace_role(i.workspace_id, ARRAY['owner', 'admin', 'member'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = fake_provider_tasks.integration_id
      AND has_workspace_role(i.workspace_id, ARRAY['owner', 'admin', 'member'])
  ));

CREATE POLICY fake_projects_select ON fake_provider_projects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = fake_provider_projects.integration_id
      AND is_workspace_member(i.workspace_id)
  ));
CREATE POLICY fake_projects_write ON fake_provider_projects FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.id = fake_provider_projects.integration_id
      AND has_workspace_role(i.workspace_id, ARRAY['owner', 'admin'])
  ));

GRANT SELECT, INSERT, UPDATE ON fake_provider_tasks, fake_provider_projects TO atrium_app;
