import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  DEFAULT_WORKSPACE_CONTEXTS,
  isValidContextSlug,
  slugifyContextLabel,
  type WorkspaceContextDef,
} from "@/lib/workspace-contexts";
import { normalizeWorkspaceIcon } from "@/lib/workspace-icons";
import { sha256, randomToken } from "../crypto/secrets";
import { withUser, type Tx } from "../db/client";
import { requireAction } from "../authz/membership";
import type { WorkspaceRole } from "../authz/permissions";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  icon: string | null;
  role: WorkspaceRole;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "workspace"}-${randomUUID().slice(0, 8)}`;
}

async function ensureDefaultContexts(tx: Tx): Promise<void> {
  for (const context of DEFAULT_WORKSPACE_CONTEXTS) {
    await tx.execute(sql`
      insert into workspace_contexts (user_id, slug, label, icon, position)
      values (
        current_setting('app.current_user_id', true),
        ${context.slug},
        ${context.label},
        ${context.icon},
        ${context.position}
      )
      on conflict (user_id, slug) do nothing
    `);
  }
}

async function requireKnownContext(tx: Tx, kind: string): Promise<string> {
  const slug = kind.trim().toLowerCase();
  if (!isValidContextSlug(slug)) {
    throw new Error("Choose a valid workspace context");
  }
  await ensureDefaultContexts(tx);
  const found = await tx.execute<{ slug: string }>(sql`
    select slug from workspace_contexts
    where user_id = current_setting('app.current_user_id', true)
      and slug = ${slug}
    limit 1
  `);
  if (!found[0]) throw new Error("Unknown workspace context");
  return slug;
}

export async function listWorkspaceContexts(userId: string): Promise<WorkspaceContextDef[]> {
  return withUser(userId, async (tx) => {
    await ensureDefaultContexts(tx);
    const rows = await tx.execute<{
      id: string;
      slug: string;
      label: string;
      icon: string | null;
      position: number;
    }>(sql`
      select id, slug, label, icon, position
      from workspace_contexts
      where user_id = current_setting('app.current_user_id', true)
      order by position, label
    `);
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      label: row.label,
      icon: row.icon ?? null,
      position: row.position,
    }));
  });
}

export async function createWorkspaceContext(
  userId: string,
  input: { label: string; icon?: string | null },
): Promise<WorkspaceContextDef> {
  const label = input.label.trim();
  if (label.length < 1 || label.length > 40) {
    throw new Error("Context name must be between 1 and 40 characters");
  }
  const slug = slugifyContextLabel(label);
  if (!isValidContextSlug(slug)) {
    throw new Error("Context name must include letters or numbers");
  }
  const icon = normalizeWorkspaceIcon(input.icon);
  return withUser(userId, async (tx) => {
    await ensureDefaultContexts(tx);
    const count = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from workspace_contexts
      where user_id = current_setting('app.current_user_id', true)
    `);
    if (Number(count[0]?.count ?? 0) >= 20) {
      throw new Error("Context limit reached (20)");
    }
    const maxPos = await tx.execute<{ max: number | null }>(sql`
      select max(position)::int as max from workspace_contexts
      where user_id = current_setting('app.current_user_id', true)
    `);
    const position = Number(maxPos[0]?.max ?? -1) + 1;
    try {
      const inserted = await tx.execute<{
        id: string;
        slug: string;
        label: string;
        icon: string | null;
        position: number;
      }>(sql`
        insert into workspace_contexts (user_id, slug, label, icon, position)
        values (
          current_setting('app.current_user_id', true),
          ${slug},
          ${label},
          ${icon},
          ${position}
        )
        returning id, slug, label, icon, position
      `);
      const row = inserted[0];
      if (!row) throw new Error("Context was not created");
      return {
        id: row.id,
        slug: row.slug,
        label: row.label,
        icon: row.icon ?? null,
        position: row.position,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unique|duplicate/i.test(message)) {
        throw new Error("A context with that name already exists");
      }
      throw error;
    }
  });
}

export async function deleteWorkspaceContext(userId: string, contextId: string): Promise<void> {
  await withUser(userId, async (tx) => {
    const context = await tx.execute<{ id: string; slug: string }>(sql`
      select id, slug from workspace_contexts
      where id = ${contextId}::uuid
        and user_id = current_setting('app.current_user_id', true)
      limit 1
    `);
    const row = context[0];
    if (!row) throw new Error("Context not found");

    const remaining = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from workspace_contexts
      where user_id = current_setting('app.current_user_id', true)
    `);
    if (Number(remaining[0]?.count ?? 0) <= 1) {
      throw new Error("Keep at least one context");
    }

    const inUse = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count
      from workspaces w
      join workspace_members m on m.workspace_id = w.id
      where m.user_id = current_setting('app.current_user_id', true)
        and w.kind = ${row.slug}
    `);
    if (Number(inUse[0]?.count ?? 0) > 0) {
      throw new Error("Reassign workspaces using this context before removing it");
    }

    await tx.execute(sql`
      delete from workspace_contexts
      where id = ${row.id}::uuid
        and user_id = current_setting('app.current_user_id', true)
    `);
  });
}

export async function listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  return withUser(userId, async (tx) => {
    await ensureDefaultContexts(tx);
    const result = await tx.execute<{
      id: string;
      name: string;
      slug: string;
      kind: string;
      icon: string | null;
      role: WorkspaceRole;
    }>(sql`
      select w.id, w.name, w.slug, w.kind, w.icon, m.role
      from workspaces w
      join workspace_members m on m.workspace_id = w.id
      where m.user_id = current_setting('app.current_user_id', true)
      order by w.kind, w.name
    `);
    return result.map((row) => ({ ...row, icon: row.icon ?? null }));
  });
}

export async function ensurePersonalWorkspace(userId: string, name: string): Promise<void> {
  const label = `${name.trim() || "Personal"}'s workspace`;
  await withUser(userId, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId})::bigint)`);
    await ensureDefaultContexts(tx);
    const existing = await tx.execute<{ id: string }>(sql`
      select workspace_id as id from workspace_members
      where user_id = current_setting('app.current_user_id', true)
      limit 1
    `);
    if (existing.length > 0) return;
    await tx.execute(sql`select create_workspace(${label}, ${slugify(label)}, 'personal', null)`);
  });
}

export async function createWorkspace(
  userId: string,
  input: { name: string; kind: string; icon?: string | null },
): Promise<string> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new Error("Workspace name must be between 2 and 80 characters");
  }
  const icon = normalizeWorkspaceIcon(input.icon);
  return withUser(userId, async (tx) => {
    const kind = await requireKnownContext(tx, input.kind);
    const count = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from workspace_members
      where user_id = current_setting('app.current_user_id', true) and role = 'owner'
    `);
    if (Number(count[0]?.count ?? 0) >= 20) {
      throw new Error("Workspace limit reached (20 owned workspaces)");
    }
    const created = await tx.execute<{ id: string }>(sql`
      select create_workspace(${name}, ${slugify(name)}, ${kind}, ${icon}) as id
    `);
    const id = created[0]?.id;
    if (!id) throw new Error("Workspace was not created");
    return id;
  });
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  input: { name: string; kind: string; icon?: string | null },
): Promise<void> {
  const trimmed = input.name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    throw new Error("Workspace name must be between 2 and 80 characters");
  }
  const icon = normalizeWorkspaceIcon(input.icon);
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "workspace.update");
    const kind = await requireKnownContext(tx, input.kind);
    const updated = await tx.execute(sql`
      update workspaces
      set name = ${trimmed}, kind = ${kind}, icon = ${icon}, updated_at = now()
      where id = ${workspaceId}::uuid
      returning id
    `);
    if (!updated[0]) throw new Error("Workspace not found");
  });
}

export async function updateWorkspaceKind(userId: string, workspaceId: string, kind: string): Promise<void> {
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "workspace.update");
    const next = await requireKnownContext(tx, kind);
    const updated = await tx.execute(sql`
      update workspaces
      set kind = ${next}, updated_at = now()
      where id = ${workspaceId}::uuid
      returning id
    `);
    if (!updated[0]) throw new Error("Workspace not found");
  });
}

export async function listMembers(userId: string, workspaceId: string) {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    return tx.execute<{ id: string; user_id: string; role: WorkspaceRole; name: string; email: string }>(sql`
      select m.id, m.user_id, m.role, u.name, u.email
      from workspace_members m
      join "user" u on u.id = m.user_id
      where m.workspace_id = ${workspaceId}::uuid
      order by u.name
    `);
  });
}

export async function inviteMember(
  userId: string,
  workspaceId: string,
  input: { email: string; role: "admin" | "member" | "viewer" },
): Promise<{ invitationId: string; token: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");
  const token = randomToken(32);
  const invitationId = await withUser(userId, async (tx) => {
    const action = input.role === "admin" ? "member.invite_admin" : "member.invite";
    await requireAction(tx, workspaceId, action);
    const created = await tx.execute<{ id: string }>(sql`
      select create_invitation(
        ${workspaceId}::uuid,
        ${email},
        ${input.role},
        ${sha256(token)},
        now() + interval '7 days'
      ) as id
    `);
    return created[0]?.id;
  });
  if (!invitationId) throw new Error("Invitation was not created");
  return { invitationId, token };
}

export async function acceptInvitation(userId: string, token: string): Promise<string> {
  return withUser(userId, async (tx) => {
    const result = await tx.execute<{ id: string }>(sql`
      select accept_invitation(${sha256(token)}) as id
    `);
    const id = result[0]?.id;
    if (!id) throw new Error("Invitation not found");
    return id;
  });
}

export async function setMemberRole(userId: string, workspaceId: string, memberId: string, role: WorkspaceRole) {
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "member.set_role");
    await tx.execute(sql`select set_member_role(${memberId}::uuid, ${role})`);
  });
}

export async function removeMember(userId: string, workspaceId: string, memberId: string) {
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "member.remove");
    await tx.execute(sql`select remove_member(${memberId}::uuid)`);
  });
}

export async function listInvitations(userId: string, workspaceId: string) {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "member.invite");
    return tx.execute(sql`
      select id, email, role, expires_at, accepted_at, revoked_at, created_at
      from workspace_invitations
      where workspace_id = ${workspaceId}::uuid
      order by created_at desc
    `);
  });
}

export type { Tx };
