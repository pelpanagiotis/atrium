"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RemoteProject = {
  providerId: string;
  name: string;
  key: string | null;
  url: string | null;
};

function namespaceOf(project: RemoteProject): string {
  const path = project.name.includes("/") ? project.name : project.providerId;
  const slash = path.indexOf("/");
  return slash === -1 ? path : path.slice(0, slash);
}

export function LinkProjectForm({
  workspaceId,
  integrationId,
  projects,
  provider,
  accountLabel,
  action,
}: {
  workspaceId: string;
  integrationId: string;
  projects: RemoteProject[];
  provider: string;
  accountLabel?: string | null;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("all");

  const namespaces = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      const ns = namespaceOf(project);
      counts.set(ns, (counts.get(ns) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [projects]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (namespace !== "all" && namespaceOf(project) !== namespace) return false;
      if (!needle) return true;
      return (
        project.name.toLowerCase().includes(needle)
        || project.providerId.toLowerCase().includes(needle)
        || (project.key?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [projects, namespace, query]);

  const [selectedId, setSelectedId] = useState(filtered[0]?.providerId ?? "");
  const selected = filtered.find((project) => project.providerId === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!filtered.some((project) => project.providerId === selectedId)) {
      setSelectedId(filtered[0]?.providerId ?? "");
    }
  }, [filtered, selectedId]);

  const namespaceLabel = provider === "github" ? "Owner / org" : provider === "gitlab" ? "Group / namespace" : "Namespace";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="integrationId" value={integrationId} />
      <input type="hidden" name="name" value={selected?.name ?? ""} />
      <input type="hidden" name="key" value={selected?.key ?? ""} />
      <input type="hidden" name="url" value={selected?.url ?? ""} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search projects</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="h-10 w-full rounded-md border bg-card py-1 pl-9 pr-3 text-sm outline-none ring-ring focus-visible:ring-2"
          />
        </label>
        <label className="min-w-[12rem]">
          <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-muted">{namespaceLabel}</span>
          <select
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
            className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none ring-ring focus-visible:ring-2"
            aria-label={namespaceLabel}
          >
            <option value="all">All ({projects.length})</option>
            {namespaces.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
                {accountLabel && item.name === accountLabel ? " (you)" : ""}
                {` · ${item.count}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {namespaces.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setNamespace("all")}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition",
              namespace === "all" ? "bg-foreground text-background" : "bg-card text-muted hover:text-foreground",
            )}
          >
            All
          </button>
          {namespaces.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setNamespace(item.name)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition",
                namespace === item.name ? "bg-foreground text-background" : "bg-card text-muted hover:text-foreground",
              )}
            >
              {item.name}
              {accountLabel && item.name === accountLabel ? " · you" : ""}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card px-4 py-8 text-sm text-muted">
          No projects match this filter. Widen the {namespaceLabel.toLowerCase()} or clear the search.
        </p>
      ) : (
        <ul className="max-h-[28rem] divide-y overflow-auto rounded-lg border bg-card">
          {filtered.map((project) => {
            const checked = selected?.providerId === project.providerId;
            return (
              <li key={project.providerId} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="providerProjectId"
                    value={project.providerId}
                    required
                    checked={checked}
                    onChange={() => setSelectedId(project.providerId)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{project.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {namespaceOf(project)}
                      {project.key ? ` · ${project.key}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted">
        Showing {filtered.length} of {projects.length} projects
        {namespace !== "all" ? ` in ${namespace}` : ""}.
      </p>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button disabled={pending || !selected} type="submit">
        {pending ? "Linking…" : "Create external project"}
      </Button>
    </form>
  );
}
