-- User-managed workspace contexts (personal, work, and custom).
-- workspaces.kind stores the context slug.

ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_kind_check;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_kind_slug CHECK (
    kind ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(kind) BETWEEN 1 AND 40
  );

CREATE TABLE workspace_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  icon text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_contexts_slug_ok CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 1 AND 40
  ),
  CONSTRAINT workspace_contexts_label_len CHECK (char_length(btrim(label)) BETWEEN 1 AND 40),
  CONSTRAINT workspace_contexts_icon_len CHECK (icon IS NULL OR char_length(icon) BETWEEN 1 AND 16),
  CONSTRAINT workspace_contexts_user_slug UNIQUE (user_id, slug)
);

CREATE INDEX workspace_contexts_user_idx ON workspace_contexts (user_id, position, label);

CREATE TRIGGER workspace_contexts_touch BEFORE UPDATE ON workspace_contexts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE workspace_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_contexts FORCE ROW LEVEL SECURITY;

CREATE POLICY workspace_contexts_select ON workspace_contexts FOR SELECT
  USING (user_id = app_user_id());
CREATE POLICY workspace_contexts_insert ON workspace_contexts FOR INSERT
  WITH CHECK (user_id = app_user_id());
CREATE POLICY workspace_contexts_update ON workspace_contexts FOR UPDATE
  USING (user_id = app_user_id())
  WITH CHECK (user_id = app_user_id());
CREATE POLICY workspace_contexts_delete ON workspace_contexts FOR DELETE
  USING (user_id = app_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_contexts TO atrium_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_contexts TO atrium_worker;

-- Seed default contexts for every existing user.
INSERT INTO workspace_contexts (user_id, slug, label, icon, position)
SELECT u.id, 'personal', 'Personal', '🏠', 0
FROM "user" u
ON CONFLICT (user_id, slug) DO NOTHING;

INSERT INTO workspace_contexts (user_id, slug, label, icon, position)
SELECT u.id, 'work', 'Work', '🏢', 1
FROM "user" u
ON CONFLICT (user_id, slug) DO NOTHING;

CREATE OR REPLACE FUNCTION create_workspace(
  p_name text,
  p_slug text,
  p_kind text,
  p_icon text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wid uuid;
  actor text := app_user_id();
  chosen text := nullif(btrim(p_icon), '');
  kind_slug text := lower(btrim(p_kind));
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF kind_slug IS NULL OR kind_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR char_length(kind_slug) > 40 THEN
    RAISE EXCEPTION 'Invalid workspace context';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM workspace_contexts c
    WHERE c.user_id = actor AND c.slug = kind_slug
  ) THEN
    RAISE EXCEPTION 'Unknown workspace context';
  END IF;
  IF char_length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Workspace name must be at least 2 characters';
  END IF;
  IF chosen IS NOT NULL AND char_length(chosen) > 16 THEN
    RAISE EXCEPTION 'Workspace icon is too long';
  END IF;
  INSERT INTO workspaces (name, slug, kind, icon, created_by)
  VALUES (trim(p_name), p_slug, kind_slug, chosen, actor)
  RETURNING id INTO wid;
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (wid, actor, 'owner');
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (wid, actor, 'workspace.created', 'workspace', wid::text, jsonb_build_object('kind', kind_slug, 'icon', chosen));
  RETURN wid;
END;
$$;
