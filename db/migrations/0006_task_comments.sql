-- Native task comments (Atrium-owned) and fake-provider comments for tests.

CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 10000)
);
CREATE INDEX task_comments_task_idx ON task_comments (task_id, created_at);
CREATE INDEX task_comments_workspace_idx ON task_comments (workspace_id);

CREATE TRIGGER task_comments_touch BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY task_comments_select ON task_comments FOR SELECT
  USING (is_workspace_member(workspace_id));
CREATE POLICY task_comments_insert ON task_comments FOR INSERT
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']));

CREATE TABLE fake_provider_comments (
  id text PRIMARY KEY,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider_project_id text NOT NULL,
  provider_task_id text NOT NULL,
  body text NOT NULL,
  author_label text NOT NULL DEFAULT 'Fake user',
  author_provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fake_provider_comments_task_idx
  ON fake_provider_comments (integration_id, provider_task_id, created_at);

ALTER TABLE fake_provider_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fake_provider_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY fake_comments_select ON fake_provider_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      WHERE i.id = fake_provider_comments.integration_id
        AND is_workspace_member(i.workspace_id)
    )
  );
CREATE POLICY fake_comments_write ON fake_provider_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM integrations i
      WHERE i.id = fake_provider_comments.integration_id
        AND has_workspace_role(i.workspace_id, ARRAY['owner', 'admin', 'member'])
    )
  );

GRANT SELECT, INSERT ON task_comments TO atrium_app;
GRANT SELECT, INSERT ON fake_provider_comments TO atrium_app;
