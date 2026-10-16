"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

type FilterValues = {
  q?: string;
  status?: string;
  priority?: string;
  project?: string;
  source?: string;
  view?: string;
};

function buildTasksHref(values: FilterValues): string {
  const params = new URLSearchParams();
  if (values.view) params.set("view", values.view);
  if (values.q?.trim()) params.set("q", values.q.trim());
  if (values.status) params.set("status", values.status);
  if (values.priority) params.set("priority", values.priority);
  if (values.project) params.set("project", values.project);
  if (values.source) params.set("source", values.source);
  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

export function TaskFilters({
  projects,
  values,
}: {
  projects: ProjectOption[];
  values: FilterValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(values.q ?? "");
  const [status, setStatus] = useState(values.status ?? "");
  const [priority, setPriority] = useState(values.priority ?? "");
  const [project, setProject] = useState(values.project ?? "");
  const [source, setSource] = useState(values.source ?? "");

  useEffect(() => {
    setQ(values.q ?? "");
    setStatus(values.status ?? "");
    setPriority(values.priority ?? "");
    setProject(values.project ?? "");
    setSource(values.source ?? "");
  }, [values.q, values.status, values.priority, values.project, values.source]);

  function navigate(next: FilterValues) {
    startTransition(() => {
      router.replace(buildTasksHref(next), { scroll: false });
    });
  }

  function onSelectChange(
    key: "status" | "priority" | "project" | "source",
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const value = event.target.value;
    const next = {
      q,
      status,
      priority,
      project,
      source,
      view: values.view,
      [key]: value,
    };
    if (key === "status") setStatus(value);
    if (key === "priority") setPriority(value);
    if (key === "project") setProject(value);
    if (key === "source") setSource(value);
    navigate(next);
  }

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q, status, priority, project, source, view: values.view });
  }

  return (
    <form
      className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-5", pending && "opacity-70")}
      onSubmit={onSearchSubmit}
      aria-busy={pending}
    >
      <input
        name="q"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search"
        className="h-10 rounded-md border bg-card px-3 text-sm sm:col-span-2 lg:col-span-1"
        aria-label="Search tasks"
      />
      <Select
        name="status"
        value={status}
        aria-label="Status filter"
        onChange={(event) => onSelectChange("status", event)}
      >
        <option value="">Any status</option>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
        <option value="cancelled">Cancelled</option>
      </Select>
      <Select
        name="priority"
        value={priority}
        aria-label="Priority filter"
        onChange={(event) => onSelectChange("priority", event)}
      >
        <option value="">Any priority</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>
      <Select
        name="project"
        value={project}
        aria-label="Project filter"
        onChange={(event) => onSelectChange("project", event)}
      >
        <option value="">Any project</option>
        {projects.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      <Select
        name="source"
        value={source}
        aria-label="Source filter"
        onChange={(event) => onSelectChange("source", event)}
      >
        <option value="">Any source</option>
        <option value="atrium">Atrium</option>
        <option value="linear">Linear</option>
        <option value="jira">Jira</option>
        <option value="github">GitHub</option>
        <option value="fake">Fake provider</option>
      </Select>
    </form>
  );
}
