"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronDown, CircleDashed, FolderKanban, Layers, Search } from "lucide-react";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon } from "@/components/task-meta-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

export type FilterValues = {
  q?: string;
  status?: string;
  priority?: string;
  project?: string;
  source?: string;
  view?: string;
  dueBefore?: string;
  dueAfter?: string;
};

type PickerOption = {
  value: string;
  label: string;
  icon: ReactNode;
};

export function buildTasksHref(values: FilterValues): string {
  const params = new URLSearchParams();
  if (values.view) params.set("view", values.view);
  if (values.q?.trim()) params.set("q", values.q.trim());
  if (values.status) params.set("status", values.status);
  if (values.priority) params.set("priority", values.priority);
  if (values.project) params.set("project", values.project);
  if (values.source) params.set("source", values.source);
  if (values.dueBefore) params.set("dueBefore", values.dueBefore);
  if (values.dueAfter) params.set("dueAfter", values.dueAfter);
  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

const STATUS_OPTIONS: PickerOption[] = [
  { value: "", label: "Any status", icon: <Layers className="size-4 text-muted" aria-hidden="true" /> },
  { value: "open", label: "Open", icon: <StatusIcon status="open" /> },
  { value: "in_progress", label: "In progress", icon: <StatusIcon status="in_progress" /> },
  { value: "blocked", label: "Blocked", icon: <StatusIcon status="blocked" /> },
  { value: "done", label: "Done", icon: <StatusIcon status="done" /> },
  { value: "cancelled", label: "Cancelled", icon: <StatusIcon status="cancelled" /> },
];

const PRIORITY_OPTIONS: PickerOption[] = [
  { value: "", label: "Any priority", icon: <Layers className="size-4 text-muted" aria-hidden="true" /> },
  { value: "attention", label: "Needs attention", icon: <PriorityIcon priority="attention" /> },
  { value: "urgent", label: "Urgent", icon: <PriorityIcon priority="urgent" /> },
  { value: "high", label: "High", icon: <PriorityIcon priority="high" /> },
  { value: "medium", label: "Medium", icon: <PriorityIcon priority="medium" /> },
  { value: "low", label: "Low", icon: <PriorityIcon priority="low" /> },
];

const SOURCE_OPTIONS: PickerOption[] = [
  { value: "", label: "Any source", icon: <Layers className="size-4 text-muted" aria-hidden="true" /> },
  { value: "atrium", label: "Atrium", icon: <ProviderIcon provider="native" /> },
  { value: "linear", label: providerLabel("linear"), icon: <ProviderIcon provider="linear" /> },
  { value: "jira", label: providerLabel("jira"), icon: <ProviderIcon provider="jira" /> },
  { value: "github", label: providerLabel("github"), icon: <ProviderIcon provider="github" /> },
  { value: "gitlab", label: providerLabel("gitlab"), icon: <ProviderIcon provider="gitlab" /> },
];

function FilterPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          "inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm outline-none",
          "transition hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="inline-flex shrink-0 items-center justify-center">{selected.icon}</span>
        <span className="min-w-0 flex-1 truncate">{selected.label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value || "any"}
              onSelect={() => onChange(option.value)}
              className={cn(active && "bg-accent")}
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center">{option.icon}</span>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {active ? <Check className="size-3.5 shrink-0 text-foreground" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskViewToggle({
  values,
  onNavigate,
}: {
  values: FilterValues;
  onNavigate: (href: string) => void;
}) {
  const board = values.view === "board";
  return (
    <nav className="flex items-center gap-1 rounded-md border bg-card p-0.5 text-sm" aria-label="Task views">
      <button
        type="button"
        aria-pressed={!board}
        onClick={() => onNavigate(buildTasksHref({ ...values, view: undefined }))}
        className={cn(
          "rounded px-2.5 py-1.5 transition",
          !board
            ? "bg-foreground text-background"
            : "text-muted hover:bg-accent hover:text-foreground",
        )}
      >
        List
      </button>
      <button
        type="button"
        aria-pressed={board}
        onClick={() => onNavigate(buildTasksHref({ ...values, view: "board" }))}
        className={cn(
          "rounded px-2.5 py-1.5 transition",
          board
            ? "bg-foreground text-background"
            : "text-muted hover:bg-accent hover:text-foreground",
        )}
      >
        Board
      </button>
    </nav>
  );
}

const SEARCH_DEBOUNCE_MS = 300;

export function TaskSearch({
  values,
  pending = false,
  onNavigate,
  className,
}: {
  values: FilterValues;
  pending?: boolean;
  onNavigate: (href: string) => void;
  className?: string;
}) {
  const [q, setQ] = useState(values.q ?? "");
  const [prevQ, setPrevQ] = useState(values.q);
  if (values.q !== prevQ) {
    setPrevQ(values.q);
    setQ(values.q ?? "");
  }

  useEffect(() => {
    const next = q.trim();
    const current = (values.q ?? "").trim();
    if (next === current) return;
    const timer = window.setTimeout(() => {
      onNavigate(buildTasksHref({ ...values, q: next || undefined }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, values, onNavigate]);

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNavigate(buildTasksHref({ ...values, q: q.trim() || undefined }));
  }

  return (
    <form
      onSubmit={onSearchSubmit}
      className={cn("relative w-full", pending && "opacity-70", className)}
      aria-busy={pending}
    >
      <label className="relative block">
        <span className="sr-only">Search tasks</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search"
          className="h-10 w-full rounded-md border bg-card py-1 pl-9 pr-3 text-sm outline-none ring-ring focus-visible:ring-2"
          aria-label="Search tasks"
        />
      </label>
    </form>
  );
}

export function TaskFilters({
  projects,
  values,
  pending = false,
  onNavigate,
}: {
  projects: ProjectOption[];
  values: FilterValues;
  pending?: boolean;
  onNavigate: (href: string) => void;
}) {
  const status = values.status ?? "";
  const priority = values.priority ?? "";
  const project = values.project ?? "";
  const source = values.source ?? "";

  const projectOptions: PickerOption[] = [
    { value: "", label: "Any project", icon: <FolderKanban className="size-4 text-muted" aria-hidden="true" /> },
    ...projects.map((item) => ({
      value: item.id,
      label: item.name,
      icon: <CircleDashed className="size-4 text-teal-600" aria-hidden="true" />,
    })),
  ];

  function navigate(next: Partial<FilterValues>) {
    onNavigate(
      buildTasksHref({
        ...values,
        status,
        priority,
        project,
        source,
        ...next,
      }),
    );
  }

  return (
    <div
      className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-5", pending && "opacity-70")}
      aria-busy={pending}
    >
      <TaskSearch
        values={values}
        pending={pending}
        onNavigate={onNavigate}
        className="sm:col-span-2 lg:col-span-1"
      />
      <FilterPicker label="Status" value={status} options={STATUS_OPTIONS} onChange={(value) => navigate({ status: value })} />
      <FilterPicker label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={(value) => navigate({ priority: value })} />
      <FilterPicker label="Project" value={project} options={projectOptions} onChange={(value) => navigate({ project: value })} />
      <FilterPicker label="Source" value={source} options={SOURCE_OPTIONS} onChange={(value) => navigate({ source: value })} />
    </div>
  );
}
