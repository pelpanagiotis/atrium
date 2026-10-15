import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { archiveProjectAction, createMilestoneAction, createTaskAction, mappingAction, publishAction, updateProjectAction } from "@/app/actions";
import { TaskForm } from "@/components/task-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { getProject, listMilestones } from "@/server/projects/service";
import { listTasks } from "@/server/tasks/service";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/db/client";
import { formatWhen } from "@/lib/utils";

export const instant = false;

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading project…</p>}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: Promise<{ projectId: string }> }) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { projectId } = await params;
  const { current } = await workspaceContext(user.id);
  const project = await getProject(user.id, current.id, projectId);
  if (!project) notFound();
  const tasks = await listTasks(user.id, current.id, { projectId });
  const milestones = await listMilestones(user.id, current.id, projectId);
  const records = await withUser(user.id, (tx) => tx.execute(sql`
    select entity_type, provider_id, raw from external_records
    where workspace_id = ${current.id}::uuid and local_entity_id is null
      and entity_type = 'pull_request'
    order by updated_at desc limit 20
  `));
  const canAdmin = current.role === "owner" || current.role === "admin";
  const canWrite = canAdmin || current.role === "member";
  const mappings = await withUser(user.id, (tx) => tx.execute<{ field_mappings: { status?: Record<string, string>; priority?: Record<string, string> } }>(sql`
    select field_mappings from project_connections where project_id = ${projectId}::uuid
  `));
  const map = mappings[0]?.field_mappings;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{project.ownership_mode} project</p>
          <h1 className="text-4xl">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{project.description || "No description yet."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={project.ownership_mode === "native" ? "native" : "external"}>{project.ownership_mode}</Badge>
            {project.provider ? <Badge tone="external">{project.provider}</Badge> : null}
            {project.provider_project_url ? <a className="text-sm underline" href={project.provider_project_url}>Open in {project.provider}</a> : null}
          </div>
        </div>
        {canAdmin ? (
          <form action={archiveProjectAction}>
            <input type="hidden" name="workspaceId" value={current.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="archived" value={project.status === "active" ? "true" : "false"} />
            <Button variant="outline" type="submit">{project.status === "active" ? "Archive" : "Restore"}</Button>
          </form>
        ) : null}
      </div>
      {canAdmin ? (
        <form action={updateProjectAction} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
          <input type="hidden" name="workspaceId" value={current.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={project.name} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={project.description} className="mt-1" />
          </div>
          <Button type="submit">Save project</Button>
        </form>
      ) : null}
      {project.ownership_mode === "native" && project.integration_id && canAdmin ? (
        <form action={publishAction} className="rounded-lg border bg-card p-4 text-sm">
          <input type="hidden" name="workspaceId" value={current.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="enabled" value={project.publish_outbound ? "false" : "true"} />
          <p>Outbound publishing is {project.publish_outbound ? "on" : "off"}. Native fields stay authoritative here. Turning publishing on sends changes to the provider as an explicit sync.</p>
          <Button className="mt-3" variant="outline" type="submit">{project.publish_outbound ? "Stop publishing" : "Publish to provider"}</Button>
        </form>
      ) : null}
      {map && canAdmin ? (
        <form action={mappingAction} className="rounded-lg border bg-card p-4">
          <h2 className="text-xl">Field mappings</h2>
          <p className="mt-1 text-sm text-muted">Map Atrium statuses and priorities onto provider values. Linear status changes need a state id, not a display name.</p>
          <input type="hidden" name="workspaceId" value={current.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(["open", "in_progress", "blocked", "done", "cancelled"] as const).map((status) => (
              <label key={status} className="text-sm">{status}
                <Input name={`status_${status}`} defaultValue={map.status?.[status] ?? ""} className="mt-1" />
              </label>
            ))}
            {(["none", "low", "medium", "high", "urgent"] as const).map((priority) => (
              <label key={priority} className="text-sm">{priority}
                <Input name={`priority_${priority}`} defaultValue={map.priority?.[priority] ?? ""} className="mt-1" />
              </label>
            ))}
          </div>
          <Button className="mt-3" type="submit">Save mappings</Button>
        </form>
      ) : null}
      <section>
        <h2 className="text-2xl">Milestones</h2>
        {project.ownership_mode !== "native" ? <p className="mt-2 text-sm text-muted">Milestones for external projects stay with the provider.</p> : null}
        {milestones.length === 0 && project.ownership_mode === "native" ? <p className="mt-2 text-sm text-muted">No milestones yet.</p> : null}
        <ul className="mt-3 space-y-2">
          {milestones.map((milestone) => (
            <li key={String(milestone.id)} className="rounded-md border bg-card px-3 py-2 text-sm">
              {String(milestone.name)} · {formatWhen(milestone.due_at as Date | null)} · {String(milestone.status)}
            </li>
          ))}
        </ul>
        {canAdmin && project.ownership_mode === "native" ? (
          <form action={createMilestoneAction} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="workspaceId" value={current.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <Input name="name" placeholder="Milestone name" required />
            <Input name="dueAt" type="date" />
            <Button type="submit">Add milestone</Button>
          </form>
        ) : null}
      </section>
      <section>
        <h2 className="text-2xl">Tasks</h2>
        {tasks.length === 0 ? <p className="mt-2 text-sm text-muted">This project has no tasks yet.</p> : null}
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-muted">{task.status} · {task.priority} · {task.sync_state}</p>
              </div>
              <div className="flex gap-2">
                <Badge tone={task.provider ? "external" : "native"}>{task.provider ?? "native"}</Badge>
                {task.external_url ? <a className="underline" href={task.external_url}>Source</a> : null}
              </div>
            </li>
          ))}
        </ul>
        {canWrite ? <TaskForm workspaceId={current.id} projectId={project.id} returnTo={`/projects/${project.id}`} action={createTaskAction} /> : null}
      </section>
      {records.length > 0 ? (
        <section>
          <h2 className="text-2xl">Pull requests</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {records.map((record) => (
              <li key={String(record.provider_id)}>#{String(record.provider_id)} {String((record.raw as { title?: string }).title ?? "")}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
