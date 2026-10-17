import Link from "next/link";
import { ProjectNicknameDialog } from "@/components/project-nickname-dialog";
import { OpenInProviderButton, providerLabel } from "@/components/provider-icon";
import { Badge } from "@/components/ui/badge";
import { projectDisplayName } from "@/lib/project-display";

type ProjectCardProject = {
  id: string;
  name: string;
  nickname: string | null;
  description: string | null;
  ownership_mode: "native" | "external" | "hybrid";
  provider: string | null;
  provider_project_name: string | null;
  provider_project_url: string | null;
};

export function ProjectCard({
  workspaceId,
  project,
  canWrite,
}: {
  workspaceId: string;
  project: ProjectCardProject;
  canWrite: boolean;
}) {
  const title = projectDisplayName(project);
  const showOriginal = Boolean(project.nickname?.trim()) && project.nickname?.trim() !== project.name;

  return (
    <li className="group relative rounded-lg border bg-card p-4 transition hover:border-foreground/20 hover:bg-accent/30">
      <Link
        href={`/projects/${project.id}`}
        className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${title} dashboard`}
      />
      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-medium transition group-hover:underline">{title}</p>
            {showOriginal ? <p className="mt-0.5 truncate text-xs text-muted">{project.name}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canWrite ? (
              <span className="pointer-events-auto relative z-10">
                <ProjectNicknameDialog workspaceId={workspaceId} project={project} />
              </span>
            ) : null}
            <Badge tone={project.ownership_mode === "native" ? "native" : "external"}>{project.ownership_mode}</Badge>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{project.description || "No description yet."}</p>
        {project.provider ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted">
              {providerLabel(project.provider)} · {project.provider_project_name}
            </p>
            {project.provider_project_url ? (
              <span className="pointer-events-auto relative z-10">
                <OpenInProviderButton provider={project.provider} href={project.provider_project_url} />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
