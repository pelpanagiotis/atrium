import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ScreenLoader } from "@/components/screen-loader";
import { OpenInProviderButton, ProviderIcon, providerLabel } from "@/components/provider-icon";
import { TaskDetailForm } from "@/components/task-detail-form";
import { PriorityIcon, StatusIcon, SyncStateIcon, syncStateLabel } from "@/components/task-meta-icons";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { getTask } from "@/server/tasks/service";
import { formatWhen } from "@/lib/utils";

export const instant = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <TaskDetailContent params={params} />
    </Suspense>
  );
}

async function TaskDetailContent({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { taskId } = await params;
  if (!UUID_RE.test(taskId)) notFound();

  const { workspaces } = await workspaceContext(user.id);
  const task = await getTask(user.id, taskId);
  if (!task) notFound();

  const membership = workspaces.find((workspace) => workspace.id === task.workspace_id);
  const canWrite = membership ? membership.role !== "viewer" : false;
  const sourceLabel = providerLabel(task.provider);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to tasks
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <ProviderIcon provider={task.provider} />
              <p className="text-xs text-muted">
                {sourceLabel}
                {task.external_url ? " · synced into Atrium" : " · native in Atrium"}
              </p>
            </div>
            <h1 className="text-4xl leading-tight">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={task.status}>
                <StatusIcon status={task.status} className="size-3.5" />
                {task.status.replace("_", " ")}
              </Badge>
              <Badge tone={task.priority}>
                <PriorityIcon priority={task.priority} className="size-3.5" />
                {task.priority}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <SyncStateIcon state={task.sync_state} className="size-3.5" />
                {syncStateLabel(task.sync_state)}
              </span>
            </div>
          </div>
          {task.external_url ? (
            <OpenInProviderButton provider={task.provider} href={task.external_url} />
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Project</dt>
          <dd className="mt-0.5">
            <Link href={`/projects/${task.project_id}`} className="underline underline-offset-2">
              {task.project_name}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Assignee</dt>
          <dd className="mt-0.5">{task.assignee_label || "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Due</dt>
          <dd className="mt-0.5">{formatWhen(task.due_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Updated</dt>
          <dd className="mt-0.5">{formatWhen(task.updated_at)}</dd>
        </div>
      </dl>

      {task.sync_error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Sync error: {task.sync_error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl">{canWrite ? "Edit task" : "Details"}</h2>
        <TaskDetailForm
          workspaceId={task.workspace_id}
          taskId={task.id}
          version={task.version}
          title={task.title}
          description={task.description}
          status={task.status}
          priority={task.priority}
          dueAt={task.due_at}
          canWrite={canWrite}
        />
      </section>
    </div>
  );
}
