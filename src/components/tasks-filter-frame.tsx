"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { ResultsLoader } from "@/components/results-loader";
import { TaskFilters, TaskSearch } from "@/components/task-filters";

type ProjectOption = { id: string; name: string };

export function TasksFilterFrame({
  projects,
  heading,
  actions,
  children,
}: {
  projects: ProjectOption[];
  heading: ReactNode;
  actions?: ReactNode;
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">{heading}</div>
        <div className="flex flex-wrap items-center gap-3">
          <TaskSearch values={values} pending={pending} onNavigate={onNavigate} />
          {actions}
        </div>
      </div>
      <div className="shrink-0">
        <TaskFilters
          projects={projects}
          values={values}
          pending={pending}
          onNavigate={onNavigate}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col" aria-busy={pending}>
        {pending ? <ResultsLoader label="Updating tasks" /> : children}
      </div>
    </div>
  );
}
