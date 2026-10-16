import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { bulkTaskAction, createTaskAction } from "@/app/actions";
import { ProviderIcon } from "@/components/provider-icon";
import { TaskBoard } from "@/components/task-board";
import { TaskForm } from "@/components/task-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listProjects } from "@/server/projects/service";
import { listTasks } from "@/server/tasks/service";
import { formatWhen } from "@/lib/utils";

export const instant = false;

type TasksSearchParams = {
  status?: string;
  priority?: string;
  project?: string;
  source?: string;
  q?: string;
  view?: string;
};

export default function TasksPage({
  searchParams,
}: {
  searchParams: Promise<TasksSearchParams>;
}) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <TasksContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TasksContent({
  searchParams,
}: {
  searchParams: Promise<TasksSearchParams>;
}) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const { current } = await workspaceContext(user.id);
  const tasks = await listTasks(user.id, current.id, {
    status: params.status,
    priority: params.priority,
    projectId: params.project,
    source: params.source,
    query: params.q,
  });
  const projects = await listProjects(user.id, current.id, { status: "active" });
  const canWrite = current.role !== "viewer";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Tasks</h1>
          <p className="mt-1 text-sm text-muted">Native tasks are edited here. Provider tasks show their source and only offer actions that provider supports.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/tasks">List</Link>
          <Link href="/tasks?view=board">Board</Link>
        </div>
      </div>
      <form className="grid gap-2 md:grid-cols-5" action="/tasks">
        {params.view ? <input type="hidden" name="view" value={params.view} /> : null}
        <input name="q" defaultValue={params.q} placeholder="Search" className="h-10 rounded-md border bg-card px-3 text-sm" />
        <Select name="status" defaultValue={params.status ?? ""} aria-label="Status filter">
          <option value="">Any status</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select name="priority" defaultValue={params.priority ?? ""} aria-label="Priority filter">
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <Select name="project" defaultValue={params.project ?? ""} aria-label="Project filter">
          <option value="">Any project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </Select>
        <Select name="source" defaultValue={params.source ?? ""} aria-label="Source filter">
          <option value="">Any source</option>
          <option value="atrium">Atrium</option>
          <option value="linear">Linear</option>
          <option value="jira">Jira</option>
          <option value="github">GitHub</option>
          <option value="fake">Fake provider</option>
        </Select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8">
          <h2 className="text-2xl">No tasks match</h2>
          <p className="mt-2 text-sm text-muted">Create one on a native project, or widen the filters.</p>
        </div>
      ) : params.view === "board" ? (
        <TaskBoard workspaceId={current.id} tasks={tasks} />
      ) : (
        <form action={bulkTaskAction}>
          <input type="hidden" name="workspaceId" value={current.id} />
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3"> </th>
                  <th className="p-3">Task</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Due</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-0">
                    <td className="p-3">{canWrite ? <input type="checkbox" name="ids" value={task.id} aria-label={`Select ${task.title}`} /> : null}</td>
                    <td className="p-3">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted">{task.project_name}{task.assignee_label ? ` · ${task.assignee_label}` : ""}</p>
                    </td>
                    <td className="p-3"><Badge tone={task.status}>{task.status.replace("_", " ")}</Badge></td>
                    <td className="p-3"><Badge tone={task.priority}>{task.priority}</Badge></td>
                    <td className="p-3">{formatWhen(task.due_at)}</td>
                    <td className="p-3">
                      <Badge tone={task.sync_state}>{task.sync_state}</Badge>
                      <div className="mt-1">
                        <ProviderIcon provider={task.provider} />
                        {task.external_url ? <a className="ml-2 underline" href={task.external_url}>Open</a> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canWrite ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select name="status" aria-label="Bulk status">
                <option value="">Keep status</option>
                <option value="done">Mark done</option>
                <option value="open">Reopen</option>
                <option value="blocked">Mark blocked</option>
              </Select>
              <Select name="priority" aria-label="Bulk priority">
                <option value="">Keep priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </Select>
              <Button type="submit" variant="outline">Apply to selected</Button>
            </div>
          ) : <p className="mt-3 text-sm text-muted">Your role can view tasks. Members and above can edit them.</p>}
        </form>
      )}
      {canWrite && projects[0] ? (
        <TaskForm workspaceId={current.id} projectId={params.project || projects[0].id} returnTo="/tasks" action={createTaskAction} />
      ) : null}
    </div>
  );
}
