ALTER TABLE workspaces
  ADD COLUMN icon text;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_icon_len CHECK (icon IS NULL OR char_length(icon) BETWEEN 1 AND 16);

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
  IF chosen IS NOT NULL AND char_length(chosen) > 16 THEN
    RAISE EXCEPTION 'Workspace icon is too long';
  END IF;
  INSERT INTO workspaces (name, slug, kind, icon, created_by)
  VALUES (trim(p_name), p_slug, p_kind, chosen, actor)
  RETURNING id INTO wid;
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (wid, actor, 'owner');
  INSERT INTO audit_events (workspace_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (wid, actor, 'workspace.created', 'workspace', wid::text, jsonb_build_object('kind', p_kind, 'icon', chosen));
  RETURN wid;
END;
$$;
