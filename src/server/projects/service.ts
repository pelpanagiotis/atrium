import { sql } from "drizzle-orm";
import { writeAudit } from "../audit";
import { requireAction } from "../authz/membership";
import { withUser } from "../db/client";

export type ProjectRecord = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  ownership_mode: "native" | "external" | "hybrid";
  archived_at: Date | null;
  created_at: Date;
  provider: string | null;
  provider_project_name: string | null;
  provider_project_url: string | null;
  provider_project_id: string | null;
  integration_id: string | null;
  publish_outbound: boolean | null;
};

export async function listProjects(
  userId: string,
  workspaceId: string,
  filter: { status?: "active" | "archived" | "all"; query?: string } = {},
): Promise<ProjectRecord[]> {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    const status = filter.status ?? "active";
    const query = filter.query?.trim() ?? "";
    return tx.execute<ProjectRecord>(sql`
      select p.id, p.workspace_id, p.name, p.description, p.status, p.ownership_mode,
             p.archived_at, p.created_at,
             i.provider, c.provider_project_name, c.provider_project_url, c.provider_project_id,
             c.integration_id, c.publish_outbound
      from projects p
      left join project_connections c on c.project_id = p.id
      left join integrations i on i.id = c.integration_id
      where p.workspace_id = ${workspaceId}::uuid
        and (${status} = 'all' or p.status = ${status})
        and (${query} = '' or p.name ilike ${"%" + query + "%"})
      order by p.name
    `);
  });
}

export async function getProject(userId: string, workspaceId: string, projectId: string): Promise<ProjectRecord | null> {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    const rows = await tx.execute<ProjectRecord>(sql`
      select p.id, p.workspace_id, p.name, p.description, p.status, p.ownership_mode,
             p.archived_at, p.created_at,
             i.provider, c.provider_project_name, c.provider_project_url, c.provider_project_id,
             c.integration_id, c.publish_outbound
      from projects p
      left join project_connections c on c.project_id = p.id
      left join integrations i on i.id = c.integration_id
      where p.workspace_id = ${workspaceId}::uuid and p.id = ${projectId}::uuid
    `);
    return rows[0] ?? null;
  });
}

export async function createNativeProject(
  userId: string,
  workspaceId: string,
  input: { name: string; description?: string },
): Promise<string> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) throw new Error("Project name must be between 2 and 120 characters");
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "project.create");
    const rows = await tx.execute<{ id: string }>(sql`
      insert into projects (workspace_id, name, description, ownership_mode, created_by)
      values (${workspaceId}::uuid, ${name}, ${input.description?.trim() ?? ""}, 'native', current_setting('app.current_user_id', true))
      returning id
    `);
    const id = rows[0]?.id;
    if (!id) throw new Error("Project was not created");
    await writeAudit(tx, { workspaceId, action: "project.created", entityType: "project", entityId: id, metadata: { ownership: "native" } });
    return id;
  });
}

export async function updateProject(
  userId: string,
  workspaceId: string,
  projectId: string,
  input: { name?: string; description?: string },
): Promise<void> {
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "project.update");
    const name = input.name?.trim();
    if (name !== undefined && (name.length < 2 || name.length > 120)) {
      throw new Error("Project name must be between 2 and 120 characters");
    }
    const rows = await tx.execute(sql`
      update projects
      set name = coalesce(${name ?? null}, name),
          description = coalesce(${input.description ?? null}, description)
      where id = ${projectId}::uuid and workspace_id = ${workspaceId}::uuid
      returning id
    `);
    if (!rows[0]) throw new Error("Project not found");
    await writeAudit(tx, { workspaceId, action: "project.updated", entityType: "project", entityId: projectId });
  });
}

export async function archiveProject(userId: string, workspaceId: string, projectId: string, archived: boolean) {
  await withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "project.archive");
    const rows = await tx.execute(sql`
      update projects
      set status = ${archived ? "archived" : "active"},
          archived_at = case when ${archived} then now() else null end
      where id = ${projectId}::uuid and workspace_id = ${workspaceId}::uuid
      returning id
    `);
    if (!rows[0]) throw new Error("Project not found");
    await writeAudit(tx, {
      workspaceId,
      action: archived ? "project.archived" : "project.restored",
      entityType: "project",
      entityId: projectId,
    });
  });
}

export async function listMilestones(userId: string, workspaceId: string, projectId: string) {
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "task.read");
    return tx.execute(sql`
      select id, name, description, due_at, status
      from milestones
      where workspace_id = ${workspaceId}::uuid and project_id = ${projectId}::uuid
      order by due_at nulls last, name
    `);
  });
}

export async function createMilestone(
  userId: string,
  workspaceId: string,
  projectId: string,
  input: { name: string; dueAt?: string | null; description?: string },
) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Milestone name must be at least 2 characters");
  return withUser(userId, async (tx) => {
    await requireAction(tx, workspaceId, "milestone.write");
    const project = await tx.execute<{ ownership_mode: string }>(sql`
      select ownership_mode from projects where id = ${projectId}::uuid and workspace_id = ${workspaceId}::uuid
    `);
    if (!project[0]) throw new Error("Project not found");
    if (project[0].ownership_mode !== "native") {
      throw new Error("Milestones are stored on native projects. External milestones stay with the provider.");
    }
    const rows = await tx.execute<{ id: string }>(sql`
      insert into milestones (workspace_id, project_id, name, description, due_at)
      values (
        ${workspaceId}::uuid,
        ${projectId}::uuid,
        ${name},
        ${input.description?.trim() ?? ""},
        ${input.dueAt ? new Date(input.dueAt).toISOString() : null}
      )
      returning id
    `);
    return rows[0]?.id;
  });
}
