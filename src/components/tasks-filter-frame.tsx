"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition, type ReactNode } from "react";
import { ResultsLoader } from "@/components/results-loader";
import { TaskFilters } from "@/components/task-filters";

type ProjectOption = { id: string; name: string };

export function TasksFilterFrame({
  projects,
  children,
}: {
  projects: ProjectOption[];
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
    }),
    [searchParams],
  );

  return (
    <div className="space-y-6">
      <TaskFilters
        projects={projects}
        values={values}
        pending={pending}
        onNavigate={(href) => {
          startTransition(() => {
            router.replace(href, { scroll: false });
          });
        }}
      />
      <div className="relative min-h-72" aria-busy={pending}>
        {pending ? <ResultsLoader label="Updating tasks" /> : children}
      </div>
    </div>
  );
}
