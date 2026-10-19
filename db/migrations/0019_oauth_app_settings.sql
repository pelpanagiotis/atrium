-- OAuth app credentials per workspace. Values here take priority over the
-- server's *_CLIENT_ID / *_CLIENT_SECRET environment variables. The secret is
-- stored encrypted with CREDENTIAL_ENCRYPTION_KEY. Only owners and admins can
-- read or change a workspace's rows.
CREATE TABLE IF NOT EXISTS oauth_app_settings (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('linear', 'jira', 'github', 'gitlab', 'gitea')),
  client_id text NOT NULL CHECK (char_length(client_id) BETWEEN 1 AND 300),
  client_secret_ciphertext text NOT NULL,
  site_url text CHECK (site_url IS NULL OR char_length(site_url) <= 300),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, provider)
);

ALTER TABLE oauth_app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_app_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY oauth_app_settings_admin ON oauth_app_settings FOR ALL
  USING (has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin']));

GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_app_settings TO atrium_app;
