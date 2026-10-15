import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createProjectAction } from "@/app/actions";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listProjects } from "@/server/projects/service";

export const instant = false;

export default function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading projects…</p>}>
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
  const projects = await listProjects(user.id, current.id, { status, query: params.q });
  const canWrite = current.role === "owner" || current.role === "admin";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Projects</h1>
          <p className="mt-1 text-sm text-muted">Every project belongs to {current.name}. Native projects are canonical here. External projects mirror a provider.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/projects">Active</Link>
          <Link href="/projects?status=archived">Archived</Link>
          <Link href="/projects?status=all">All</Link>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8">
          <h2 className="text-2xl">No projects in this view</h2>
          <p className="mt-2 text-sm text-muted">Create a native project, or connect a provider and link one of its projects.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/projects/${project.id}`} className="text-lg font-medium">{project.name}</Link>
                <Badge tone={project.ownership_mode === "native" ? "native" : "external"}>{project.ownership_mode}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{project.description || "No description yet."}</p>
              {project.provider ? (
                <p className="mt-3 text-xs text-muted">
                  {project.provider} · {project.provider_project_name}
                  {project.provider_project_url ? <> · <a className="underline" href={project.provider_project_url}>Open provider</a></> : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? <ProjectForm workspaceId={current.id} action={createProjectAction} /> : <p className="text-sm text-muted">Viewers and members can read projects. Owners and admins create them.</p>}
    </div>
  );
}
