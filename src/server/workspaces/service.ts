import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { sha256, randomToken } from "../crypto/secrets";
import { withUser, type Tx } from "../db/client";
import { requireAction } from "../authz/membership";
import type { WorkspaceRole } from "../authz/permissions";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  kind: "personal" | "work";
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

export async function listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  return withUser(userId, async (tx) => {
    const result = await tx.execute<{
      id: string;
      name: string;
      slug: string;
      kind: "personal" | "work";
      role: WorkspaceRole;
    }>(sql`
      select w.id, w.name, w.slug, w.kind, m.role
      from workspaces w
      join workspace_members m on m.workspace_id = w.id
      where m.user_id = current_setting('app.current_user_id', true)
      order by w.kind, w.name
    `);
    return result.map((row) => ({ ...row }));
  });
}

export async function ensurePersonalWorkspace(userId: string, name: string): Promise<void> {
  const label = `${name.trim() || "Personal"}'s workspace`;
  await withUser(userId, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId})::bigint)`);
    const existing = await tx.execute<{ id: string }>(sql`
      select workspace_id as id from workspace_members
      where user_id = current_setting('app.current_user_id', true)
      limit 1
    `);
    if (existing.length > 0) return;
    await tx.execute(sql`select create_workspace(${label}, ${slugify(label)}, 'personal')`);
  });
}

export async function createWorkspace(
  userId: string,
  input: { name: string; kind: "personal" | "work" },
): Promise<string> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new Error("Workspace name must be between 2 and 80 characters");
  }
  if (input.kind !== "personal" && input.kind !== "work") {
    throw new Error("Workspace kind must be personal or work");
  }
  return withUser(userId, async (tx) => {
    const count = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count from workspace_members
      where user_id = current_setting('app.current_user_id', true) and role = 'owner'
    `);
    if (Number(count[0]?.count ?? 0) >= 20) {
      throw new Error("Workspace limit reached (20 owned workspaces)");
    }
    const created = await tx.execute<{ id: string }>(sql`
      select create_workspace(${name}, ${slugify(name)}, ${input.kind}) as id
    `);
    const id = created[0]?.id;
    if (!id) throw new Error("Workspace was not created");
    return id;
  });
}

export async function updateWorkspace(userId: string, workspaceId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    throw new Error("Workspace name must be between 2 and 80 characters");
  }
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "workspace.update");
    const updated = await tx.execute(sql`
      update workspaces set name = ${trimmed} where id = ${workspaceId}::uuid returning id
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
