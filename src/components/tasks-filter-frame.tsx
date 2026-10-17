"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { ResultsLoader } from "@/components/results-loader";
import { TaskBulkActions } from "@/components/task-bulk-actions";
import { TaskFilters, TaskViewToggle } from "@/components/task-filters";

type ProjectOption = { id: string; name: string };

export function TasksFilterFrame({
  projects,
  heading,
  actions,
  canWrite = false,
  children,
}: {
  projects: ProjectOption[];
  heading: ReactNode;
  actions?: ReactNode;
  canWrite?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const values = useMemo(
    () => ({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      project: searchParams.get("project") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      view: searchParams.get("view") ?? undefined,
      dueBefore: searchParams.get("dueBefore") ?? undefined,
      dueAfter: searchParams.get("dueAfter") ?? undefined,
    }),
    [searchParams],
  );

  function onNavigate(href: string) {
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3" data-reveal="">
        <div className="min-w-0 max-w-2xl">{heading}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 pt-1">
          <TaskViewToggle values={values} onNavigate={onNavigate} />
          {actions}
        </div>
      </div>
      <div className="shrink-0 space-y-3" data-reveal="">
        <TaskFilters
          projects={projects}
          values={values}
          pending={pending}
          onNavigate={onNavigate}
        />
      </div>
      {canWrite && values.view !== "board" ? (
        <div data-reveal="">
          <TaskBulkActions />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col" aria-busy={pending} data-reveal="">
        {pending ? <ResultsLoader label="Updating tasks" /> : children}
      </div>
    </div>
  );
}
