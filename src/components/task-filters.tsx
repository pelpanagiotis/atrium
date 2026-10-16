"use client";

import type { ChangeEvent } from "react";
import { Select } from "@/components/ui/field";

type ProjectOption = { id: string; name: string };

export function TaskFilters({
  projects,
  values,
}: {
  projects: ProjectOption[];
  values: {
    q?: string;
    status?: string;
    priority?: string;
    project?: string;
    source?: string;
    view?: string;
  };
}) {
  function submitOnChange(event: ChangeEvent<HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" action="/tasks" method="get">
      {values.view ? <input type="hidden" name="view" value={values.view} /> : null}
      <input
        name="q"
        defaultValue={values.q}
        placeholder="Search"
        className="h-10 rounded-md border bg-card px-3 text-sm sm:col-span-2 lg:col-span-1"
        aria-label="Search tasks"
      />
      <Select name="status" defaultValue={values.status ?? ""} aria-label="Status filter" onChange={submitOnChange}>
        <option value="">Any status</option>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
        <option value="cancelled">Cancelled</option>
      </Select>
      <Select name="priority" defaultValue={values.priority ?? ""} aria-label="Priority filter" onChange={submitOnChange}>
        <option value="">Any priority</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>
      <Select name="project" defaultValue={values.project ?? ""} aria-label="Project filter" onChange={submitOnChange}>
        <option value="">Any project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <Select name="source" defaultValue={values.source ?? ""} aria-label="Source filter" onChange={submitOnChange}>
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
