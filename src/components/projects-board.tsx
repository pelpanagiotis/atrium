"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Eye, EyeOff, GripVertical, LayoutDashboard, RotateCcw } from "lucide-react";
import { projectsLayoutAction, type ActionState } from "@/app/actions";
import { ProjectCard } from "@/components/project-card";
import {
  ProjectStatCard,
  ProjectStatusBreakdown,
  type ProjectDashboardStats,
} from "@/components/project-dashboard";
import { ProjectForm } from "@/components/project-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectDisplayName } from "@/lib/project-display";
import {
  DEFAULT_PROJECTS_LAYOUT,
  moveLayoutItem,
  PROJECT_INSIGHT_LABELS,
  PROJECT_SECTION_LABELS,
  PROJECT_STAT_LABELS,
  restoreLayoutItem,
  toggleLayoutItem,
  type ProjectInsightId,
  type ProjectSectionId,
  type ProjectStatId,
  type ProjectsLayout,
  visibleItems,
} from "@/lib/projects-layout";
import { cn } from "@/lib/utils";

type CreateProjectAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

type ProjectRow = {
  id: string;
  name: string;
  nickname: string | null;
  description: string | null;
  ownership_mode: "native" | "external" | "hybrid";
  provider: string | null;
  provider_project_name: string | null;
  provider_project_url: string | null;
};

type BusyProject = {
  id: string;
  name: string;
  nickname: string | null;
  ownership_mode: "native" | "external" | "hybrid";
  open_count: number;
  attention_count: number;
  total_count: number;
};

type StatValue = {
  href: string;
  value: number;
  hint: string;
};

export function ProjectsBoard({
  initialLayout,
  workspaceId,
  workspaceName,
  scopeLabel,
  canWrite,
  createAction,
  portfolio,
  taskStats,
  busiest,
  projects,
}: {
  initialLayout: ProjectsLayout;
  workspaceId: string;
  workspaceName: string;
  scopeLabel: string;
  canWrite: boolean;
  createAction: CreateProjectAction;
  portfolio: {
    active: number;
    archived: number;
    native: number;
    external: number;
    hybrid: number;
  };
  taskStats: ProjectDashboardStats;
  busiest: BusyProject[];
  projects: ProjectRow[];
}) {
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState(initialLayout);
  const [pending, startTransition] = useTransition();
  const [drag, setDrag] = useState<{ kind: "section" | "stat" | "insight"; id: string } | null>(null);

  const statsCatalog: Record<ProjectStatId, StatValue> = {
    active: { href: "/projects", value: portfolio.active, hint: "Currently in the workspace" },
    archived: { href: "/projects?status=archived", value: portfolio.archived, hint: "Parked or completed projects" },
    native: { href: "/projects?status=all", value: portfolio.native, hint: "Canonical in Atrium" },
    external: {
      href: "/projects?status=all",
      value: portfolio.external + portfolio.hybrid,
      hint: "Mirrored from a provider",
    },
    attention: { href: "/tasks?priority=attention", value: taskStats.attention, hint: `Across ${scopeLabel}` },
    inProgress: { href: "/tasks?status=in_progress", value: taskStats.inProgress, hint: "Actively being worked" },
    blocked: { href: "/tasks?status=blocked", value: taskStats.blocked, hint: "Waiting on a dependency" },
    doneWeek: { href: "/tasks?status=done", value: taskStats.doneWeek, hint: "Closed in the last seven days" },
  };

  function persist(next: ProjectsLayout) {
    setLayout(next);
    startTransition(async () => {
      await projectsLayoutAction(next);
    });
  }

  function resetLayout() {
    persist(structuredClone(DEFAULT_PROJECTS_LAYOUT));
  }

  function onDropSection(targetId: ProjectSectionId) {
    if (!drag || drag.kind !== "section") return;
    const toIndex = layout.sections.findIndex((item) => item.id === targetId);
    if (toIndex < 0) return;
    persist({ ...layout, sections: moveLayoutItem(layout.sections, drag.id as ProjectSectionId, toIndex) });
    setDrag(null);
  }

  function onDropStat(targetId: ProjectStatId) {
    if (!drag || drag.kind !== "stat") return;
    const toIndex = layout.stats.findIndex((item) => item.id === targetId);
    if (toIndex < 0) return;
    persist({ ...layout, stats: moveLayoutItem(layout.stats, drag.id as ProjectStatId, toIndex) });
    setDrag(null);
  }

  function onDropInsight(targetId: ProjectInsightId) {
    if (!drag || drag.kind !== "insight") return;
    const toIndex = layout.insights.findIndex((item) => item.id === targetId);
    if (toIndex < 0) return;
    persist({ ...layout, insights: moveLayoutItem(layout.insights, drag.id as ProjectInsightId, toIndex) });
    setDrag(null);
  }

  const visibleSections = editing
    ? layout.sections
    : layout.sections.filter((item) => !item.hidden);
  const visibleStats = editing ? layout.stats : layout.stats.filter((item) => !item.hidden);
  const visibleInsights = editing
    ? layout.insights
    : layout.insights.filter((item) => !item.hidden);

  const hiddenStats = layout.stats.filter((item) => item.hidden);
  const hiddenInsights = layout.insights.filter((item) => item.hidden);
  const hiddenSections = layout.sections.filter((item) => item.hidden);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {editing
            ? "Drag sections and tiles to reorder. Hide anything you do not need."
            : "Customize the board layout to match how you scan projects."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={resetLayout} disabled={pending}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset
              </Button>
              <Button type="button" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                Done
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <LayoutDashboard className="size-3.5" aria-hidden="true" />
              Customize
            </Button>
          )}
        </div>
      </div>

      {editing && (hiddenSections.length > 0 || hiddenStats.length > 0 || hiddenInsights.length > 0) ? (
        <div className="rounded-lg border border-dashed bg-card/60 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Hidden</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {hiddenSections.map((item) => (
              <button
                key={`section-${item.id}`}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs transition hover:bg-accent"
                onClick={() =>
                  persist({
                    ...layout,
                    sections: restoreLayoutItem(layout.sections, item.id),
                  })
                }
              >
                <Eye className="size-3.5" aria-hidden="true" />
                {PROJECT_SECTION_LABELS[item.id]}
              </button>
            ))}
            {hiddenStats.map((item) => (
              <button
                key={`stat-${item.id}`}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs transition hover:bg-accent"
                onClick={() =>
                  persist({
                    ...layout,
                    stats: restoreLayoutItem(layout.stats, item.id),
                  })
                }
              >
                <Eye className="size-3.5" aria-hidden="true" />
                {PROJECT_STAT_LABELS[item.id]}
              </button>
            ))}
            {hiddenInsights.map((item) => (
              <button
                key={`insight-${item.id}`}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs transition hover:bg-accent"
                onClick={() =>
                  persist({
                    ...layout,
                    insights: restoreLayoutItem(layout.insights, item.id),
                  })
                }
              >
                <Eye className="size-3.5" aria-hidden="true" />
                {PROJECT_INSIGHT_LABELS[item.id]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {visibleSections.map((section) => {
        const hidden = Boolean(section.hidden);
        if (section.id === "stats") {
          return (
            <EditableBlock
              key={section.id}
              editing={editing}
              hidden={hidden}
              label={PROJECT_SECTION_LABELS.stats}
              dragging={drag?.kind === "section" && drag.id === section.id}
              onDragStart={() => setDrag({ kind: "section", id: section.id })}
              onDragEnd={() => setDrag(null)}
              onDrop={() => onDropSection(section.id)}
              onToggleHidden={() =>
                persist({
                  ...layout,
                  sections: toggleLayoutItem(layout.sections, section.id, !hidden),
                })
              }
            >
              {visibleStats.length === 0 && !editing ? null : (
                <section
                  className={cn(
                    "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                    hidden && editing && "opacity-50",
                  )}
                >
                  {visibleStats.map((stat) => {
                    const meta = statsCatalog[stat.id];
                    const tileHidden = Boolean(stat.hidden);
                    if (editing) {
                      return (
                        <EditableTile
                          key={stat.id}
                          label={PROJECT_STAT_LABELS[stat.id]}
                          hidden={tileHidden}
                          dragging={drag?.kind === "stat" && drag.id === stat.id}
                          onDragStart={() => setDrag({ kind: "stat", id: stat.id })}
                          onDragEnd={() => setDrag(null)}
                          onDrop={() => onDropStat(stat.id)}
                          onToggleHidden={() =>
                            persist({
                              ...layout,
                              stats: toggleLayoutItem(layout.stats, stat.id, !tileHidden),
                            })
                          }
                        >
                          <div className={cn(tileHidden && "opacity-50")}>
                            <ProjectStatCard
                              href={meta.href}
                              label={PROJECT_STAT_LABELS[stat.id]}
                              value={meta.value}
                              hint={meta.hint}
                            />
                          </div>
                        </EditableTile>
                      );
                    }
                    return (
                      <ProjectStatCard
                        key={stat.id}
                        href={meta.href}
                        label={PROJECT_STAT_LABELS[stat.id]}
                        value={meta.value}
                        hint={meta.hint}
                      />
                    );
                  })}
                </section>
              )}
            </EditableBlock>
          );
        }

        if (section.id === "insights") {
          const insightNodes: Record<ProjectInsightId, ReactNode> = {
            statusMix: (
              <ProjectStatusBreakdown
                stats={taskStats}
                caption={`${taskStats.total} tasks across ${scopeLabel}`}
              />
            ),
            busiest: (
              <section className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl">Busiest projects</h2>
                    <p className="text-xs text-muted">Most open work in this view</p>
                  </div>
                  <p className="text-sm tabular-nums text-muted">{taskStats.completion}% done</p>
                </div>
                {busiest.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">No open work in {scopeLabel}.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {busiest.map((project) => (
                      <li key={project.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2.5 text-sm transition hover:border-foreground/20 hover:bg-accent/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{projectDisplayName(project)}</p>
                            <p className="text-xs text-muted">
                              {project.open_count} open · {project.attention_count} attention ·{" "}
                              {project.total_count} total
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
            ),
          };

          const shown = visibleInsights.filter((item) => editing || !item.hidden);
          if (shown.length === 0 && !editing) return null;

          return (
            <EditableBlock
              key={section.id}
              editing={editing}
              hidden={hidden}
              label={PROJECT_SECTION_LABELS.insights}
              dragging={drag?.kind === "section" && drag.id === section.id}
              onDragStart={() => setDrag({ kind: "section", id: section.id })}
              onDragEnd={() => setDrag(null)}
              onDrop={() => onDropSection(section.id)}
              onToggleHidden={() =>
                persist({
                  ...layout,
                  sections: toggleLayoutItem(layout.sections, section.id, !hidden),
                })
              }
            >
              <section
                className={cn(
                  "grid gap-4",
                  shown.filter((item) => !item.hidden).length > 1
                    ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
                    : "lg:grid-cols-1",
                  hidden && editing && "opacity-50",
                )}
              >
                {shown.map((insight) => {
                  const tileHidden = Boolean(insight.hidden);
                  if (editing) {
                    return (
                      <EditableTile
                        key={insight.id}
                        label={PROJECT_INSIGHT_LABELS[insight.id]}
                        hidden={tileHidden}
                        dragging={drag?.kind === "insight" && drag.id === insight.id}
                        onDragStart={() => setDrag({ kind: "insight", id: insight.id })}
                        onDragEnd={() => setDrag(null)}
                        onDrop={() => onDropInsight(insight.id)}
                        onToggleHidden={() =>
                          persist({
                            ...layout,
                            insights: toggleLayoutItem(layout.insights, insight.id, !tileHidden),
                          })
                        }
                      >
                        <div className={cn(tileHidden && "opacity-50")}>{insightNodes[insight.id]}</div>
                      </EditableTile>
                    );
                  }
                  return <div key={insight.id}>{insightNodes[insight.id]}</div>;
                })}
              </section>
            </EditableBlock>
          );
        }

        // portfolio
        return (
          <EditableBlock
            key={section.id}
            editing={editing}
            hidden={hidden}
            label={PROJECT_SECTION_LABELS.portfolio}
            dragging={drag?.kind === "section" && drag.id === section.id}
            onDragStart={() => setDrag({ kind: "section", id: section.id })}
            onDragEnd={() => setDrag(null)}
            onDrop={() => onDropSection(section.id)}
            onToggleHidden={() =>
              persist({
                ...layout,
                sections: toggleLayoutItem(layout.sections, section.id, !hidden),
              })
            }
          >
            <section
              className={cn("mb-10 space-y-4 pb-6", hidden && editing && "opacity-50")}
              aria-labelledby="project-portfolio-heading"
            >
              <div className="border-b border-border/80 pb-3">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Portfolio</p>
                <h2 id="project-portfolio-heading" className="mt-1 text-2xl">
                  Project list
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {projects.length === 0
                    ? `No ${scopeLabel} yet.`
                    : `${projects.length} ${scopeLabel} in ${workspaceName}.`}
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
                      <ProjectForm workspaceId={workspaceId} action={createAction} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      workspaceId={workspaceId}
                      project={project}
                      canWrite={canWrite}
                    />
                  ))}
                </ul>
              )}
            </section>
          </EditableBlock>
        );
      })}

      {!canWrite ? (
        <p className="text-sm text-muted">Viewers and members can read projects. Owners and admins create them.</p>
      ) : null}

      {!editing && visibleItems(layout.sections).length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-lg font-medium">Every section is hidden</p>
          <p className="mt-1 text-sm text-muted">Open Customize to bring pieces of the board back.</p>
          <Button type="button" className="mt-4" onClick={() => setEditing(true)}>
            Customize
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EditableBlock({
  editing,
  hidden,
  label,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onToggleHidden,
  children,
}: {
  editing: boolean;
  hidden: boolean;
  label: string;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onToggleHidden: () => void;
  children: ReactNode;
}) {
  if (!editing) return <>{children}</>;
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed p-2 transition",
        dragging ? "border-primary bg-accent/40" : "border-border/80",
        hidden && "opacity-60",
      )}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="inline-flex cursor-grab items-center gap-1.5 text-xs font-medium text-muted active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
          {label}
        </button>
        <button
          type="button"
          onClick={onToggleHidden}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-accent hover:text-foreground"
        >
          {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {hidden ? "Show" : "Hide"}
        </button>
      </div>
      {children}
    </div>
  );
}

function EditableTile({
  label,
  hidden,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onToggleHidden,
  children,
}: {
  label: string;
  hidden: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onToggleHidden: () => void;
  children: ReactNode;
}) {
  const handleRef = useRef<HTMLButtonElement>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    // Keep HTML5 drag for tiles; pointer down is only for accessibility focus.
    handleRef.current?.focus();
    void event;
  }

  return (
    <div
      className={cn(
        "relative rounded-lg transition",
        dragging && "ring-2 ring-primary",
        hidden && "opacity-50",
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop();
      }}
    >
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
        <button
          ref={handleRef}
          type="button"
          draggable
          onPointerDown={onPointerDown}
          onDragStart={(event) => {
            event.stopPropagation();
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className="inline-flex size-7 cursor-grab items-center justify-center rounded-md border bg-card/95 text-muted shadow-sm active:cursor-grabbing"
          aria-label={`Drag ${label}`}
          title={`Drag ${label}`}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToggleHidden}
          className="inline-flex size-7 items-center justify-center rounded-md border bg-card/95 text-muted shadow-sm"
          aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
          title={hidden ? `Show ${label}` : `Hide ${label}`}
        >
          {hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
      </div>
      {children}
    </div>
  );
}
