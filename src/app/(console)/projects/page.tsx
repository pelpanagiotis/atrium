import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Archive, CircleDot, Layers } from "lucide-react";
import { createProjectAction } from "@/app/actions";
import { ProjectCard } from "@/components/project-card";
import {
  ProjectStatCard,
  ProjectStatusBreakdown,
} from "@/components/project-dashboard";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { getProjectsAnalytics, listProjects } from "@/server/projects/service";
import { projectDisplayName } from "@/lib/project-display";
import { cn } from "@/lib/utils";

export const instant = false;

export default function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <ProjectsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProjectsContent({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const params = await searchParams;
  const status = params.status === "archived" || params.status === "all" ? params.status : "active";
  // eslint-disable-next-line react-hooks/purity -- connection() already opted this request out of prerender
  const now = Date.now();
  const [projects, analytics] = await Promise.all([
    listProjects(user.id, current.id, { status, query: params.q }),
    getProjectsAnalytics(user.id, current.id, { status }, now),
  ]);
  const canWrite = current.role === "owner" || current.role === "admin";
  const scopeLabel =
    status === "archived" ? "archived projects" : status === "all" ? "all projects" : "active projects";
  const taskStats = analytics.tasks;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Every project belongs to {current.name}. Native projects are canonical here. External projects mirror a
            provider.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex items-center gap-1 rounded-md border bg-card p-0.5 text-sm" aria-label="Project status">
            {(
              [
                { href: "/projects", value: "active", label: "Active", icon: CircleDot },
                { href: "/projects?status=archived", value: "archived", label: "Archived", icon: Archive },
                { href: "/projects?status=all", value: "all", label: "All", icon: Layers },
              ] as const
            ).map(({ href, value, label, icon: Icon }) => {
              const active = status === value;
              return (
                <Link
                  key={value}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
          {canWrite ? <ProjectForm workspaceId={current.id} action={createProjectAction} /> : null}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProjectStatCard
          href="/projects"
          label="Active projects"
          value={analytics.portfolio.active}
          hint="Currently in the workspace"
        />
        <ProjectStatCard
          href="/projects?status=archived"
          label="Archived"
          value={analytics.portfolio.archived}
          hint="Parked or completed projects"
        />
        <ProjectStatCard
          href="/projects?status=all"
          label="Native"
          value={analytics.portfolio.native}
          hint="Canonical in Atrium"
        />
        <ProjectStatCard
          href="/projects?status=all"
          label="External"
          value={analytics.portfolio.external + analytics.portfolio.hybrid}
          hint="Mirrored from a provider"
        />
        <ProjectStatCard
          href="/tasks?priority=attention"
          label="Needs attention"
          value={taskStats.attention}
          hint={`Across ${scopeLabel}`}
        />
        <ProjectStatCard
          href="/tasks?status=in_progress"
          label="In progress"
          value={taskStats.inProgress}
          hint="Actively being worked"
        />
        <ProjectStatCard
          href="/tasks?status=blocked"
          label="Blocked"
          value={taskStats.blocked}
          hint="Waiting on a dependency"
        />
        <ProjectStatCard
          href="/tasks?status=done"
          label="Done this week"
          value={taskStats.doneWeek}
          hint="Closed in the last seven days"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ProjectStatusBreakdown
          stats={taskStats}
          caption={`${taskStats.total} tasks across ${scopeLabel}`}
        />
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl">Busiest projects</h2>
              <p className="text-xs text-muted">Most open work in this view</p>
            </div>
            <p className="text-sm tabular-nums text-muted">{taskStats.completion}% done</p>
          </div>
          {analytics.busiest.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No open work in {scopeLabel}.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {analytics.busiest.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2.5 text-sm transition hover:border-foreground/20 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{projectDisplayName(project)}</p>
                      <p className="text-xs text-muted">
                        {project.open_count} open · {project.attention_count} attention · {project.total_count} total
                      </p>
                    </div>
                    <Badge tone={project.ownership_mode === "native" ? "native" : "external"}>
                      {project.ownership_mode}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <section className="space-y-4" aria-labelledby="project-portfolio-heading">
        <div className="border-b border-border/80 pb-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Portfolio</p>
          <h2 id="project-portfolio-heading" className="mt-1 text-2xl">
            Project list
          </h2>
          <p className="mt-1 text-sm text-muted">
            {projects.length === 0
              ? `No ${scopeLabel} yet.`
              : `${projects.length} ${scopeLabel} in ${current.name}.`}
          </p>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8">
            <h3 className="text-2xl">No projects in this view</h3>
            <p className="mt-2 text-sm text-muted">
              Create a native project, or connect a provider and link one of its projects.
            </p>
            {canWrite ? (
              <div className="mt-4">
                <ProjectForm workspaceId={current.id} action={createProjectAction} />
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} workspaceId={current.id} project={project} canWrite={canWrite} />
            ))}
          </ul>
        )}
      </section>

      {!canWrite ? (
        <p className="text-sm text-muted">Viewers and members can read projects. Owners and admins create them.</p>
      ) : null}
    </div>
  );
}
