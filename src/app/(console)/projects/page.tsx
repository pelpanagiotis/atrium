import { Suspense } from "react";
import { ScreenLoader } from "@/components/screen-loader";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Archive, CircleDot, Layers } from "lucide-react";
import { createProjectAction } from "@/app/actions";
import { ProjectCard } from "@/components/project-card";
import { ProjectForm } from "@/components/project-form";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { listProjects } from "@/server/projects/service";
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
  const projects = await listProjects(user.id, current.id, { status, query: params.q });
  const canWrite = current.role === "owner" || current.role === "admin";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Projects</h1>
          <p className="mt-1 text-sm text-muted">Every project belongs to {current.name}. Native projects are canonical here. External projects mirror a provider.</p>
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
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8">
          <h2 className="text-2xl">No projects in this view</h2>
          <p className="mt-2 text-sm text-muted">Create a native project, or connect a provider and link one of its projects.</p>
          {canWrite ? (
            <div className="mt-4">
              <ProjectForm workspaceId={current.id} action={createProjectAction} />
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} workspaceId={current.id} project={project} canWrite={canWrite} />
          ))}
        </ul>
      )}
      {!canWrite ? (
        <p className="text-sm text-muted">Viewers and members can read projects. Owners and admins create them.</p>
      ) : null}
    </div>
  );
}
