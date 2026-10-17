-- MCP personal access tokens. AI clients authenticate with a bearer token.
CREATE TABLE mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read', 'write']::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_tokens_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT mcp_tokens_scopes_ok CHECK (scopes <@ ARRAY['read', 'write']::text[] AND cardinality(scopes) > 0)
);

CREATE INDEX mcp_tokens_user_idx ON mcp_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX mcp_tokens_workspace_idx ON mcp_tokens (workspace_id) WHERE revoked_at IS NULL;

ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tokens FORCE ROW LEVEL SECURITY;

CREATE POLICY mcp_tokens_select ON mcp_tokens FOR SELECT
  USING (user_id = app_user_id());
CREATE POLICY mcp_tokens_insert ON mcp_tokens FOR INSERT
  WITH CHECK (user_id = app_user_id());
CREATE POLICY mcp_tokens_update ON mcp_tokens FOR UPDATE
  USING (user_id = app_user_id())
  WITH CHECK (user_id = app_user_id());

GRANT SELECT, INSERT, UPDATE ON mcp_tokens TO atrium_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON mcp_tokens TO atrium_worker;

-- Lookup by hash before the session user is known (bearer auth).
CREATE OR REPLACE FUNCTION lookup_mcp_token(p_hash text)
RETURNS TABLE (
  id uuid,
  user_id text,
  workspace_id uuid,
  name text,
  scopes text[],
  expires_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.user_id, t.workspace_id, t.name, t.scopes, t.expires_at, t.revoked_at
  FROM mcp_tokens t
  WHERE t.token_hash = p_hash
    AND t.revoked_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION touch_mcp_token(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE mcp_tokens SET last_used_at = now() WHERE id = p_id AND revoked_at IS NULL;
$$;

REVOKE ALL ON FUNCTION lookup_mcp_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION touch_mcp_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_mcp_token(text) TO atrium_app, atrium_worker;
GRANT EXECUTE ON FUNCTION touch_mcp_token(uuid) TO atrium_app, atrium_worker;
