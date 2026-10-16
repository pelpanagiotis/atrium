import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import { EmptyResults } from "@/components/empty-results";
import { ResultsLoader } from "@/components/results-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ListFilter } from "lucide-react";
import { bulkTaskAction, createTaskAction } from "@/app/actions";
import { TaskBoard } from "@/components/task-board";
import { TaskForm } from "@/components/task-form";
import { TaskList } from "@/components/task-list";
import { TasksFilterFrame } from "@/components/tasks-filter-frame";
import { TASK_BULK_FORM_ID } from "@/components/task-bulk-actions";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listProjects } from "@/server/projects/service";
import { listTasks } from "@/server/tasks/service";

export const instant = false;

type TasksSearchParams = {
  status?: string;
  priority?: string;
  project?: string;
  source?: string;
  q?: string;
  view?: string;
  dueBefore?: string;
  dueAfter?: string;
};

export default function TasksPage({
  searchParams,
}: {
  searchParams: Promise<TasksSearchParams>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<ScreenLoader className="min-h-0 flex-1" />}>
        <TasksShell>
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<ResultsLoader label="Updating tasks" />}>
              <TasksResults searchParams={searchParams} />
            </Suspense>
          </div>
        </TasksShell>
      </Suspense>
    </div>
  );
}

async function TasksShell({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const projects = await listProjects(user.id, current.id, { status: "active" });
  const canWrite = current.role !== "viewer";
  const projectOptions = projects.map((project) => ({ id: project.id, name: project.name }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<ResultsLoader label="Loading filters" />}>
        <TasksFilterFrame
          projects={projectOptions}
          canWrite={canWrite}
          heading={
            <>
              <h1 className="text-4xl">Tasks</h1>
              <p className="mt-1 text-sm text-muted">
                Native tasks are edited here. Provider tasks show their source and only offer actions that provider supports.
              </p>
            </>
          }
          actions={
            canWrite && projects[0] ? (
              <TaskForm
                workspaceId={current.id}
                projectId={projects[0].id}
                projects={projectOptions}
                returnTo="/tasks"
                action={createTaskAction}
              />
            ) : null
          }
        >
          {children}
        </TasksFilterFrame>
      </Suspense>
    </div>
  );
}

async function TasksResults({
  searchParams,
}: {
  searchParams: Promise<TasksSearchParams>;
}) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const { current } = await workspaceContext(user.id);
  const canWrite = current.role !== "viewer";
  const tasks = await listTasks(user.id, current.id, {
    status: params.status,
    priority: params.priority,
    projectId: params.project,
    source: params.source,
    query: params.q,
    dueBefore: params.dueBefore,
    dueAfter: params.dueAfter,
  });

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <EmptyResults
          icon={ListFilter}
          title="No tasks match"
          description="Create one on a native project, or widen the filters."
        />
      </div>
    );
  }

  if (params.view === "board") {
    return <TaskBoard workspaceId={current.id} tasks={tasks} />;
  }

  return (
    <form id={TASK_BULK_FORM_ID} action={bulkTaskAction} className="flex min-h-0 flex-1 flex-col gap-3">
      <input type="hidden" name="workspaceId" value={current.id} />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <TaskList
          canWrite={canWrite}
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueAt: task.due_at,
            projectName: task.project_name,
            assigneeLabel: task.assignee_label,
            provider: task.provider,
            externalUrl: task.external_url,
            syncState: task.sync_state,
          }))}
        />
      </div>
      {!canWrite ? (
        <p className="text-sm text-muted">Your role can view tasks. Members and above can edit them.</p>
      ) : null}
    </form>
  );
}
