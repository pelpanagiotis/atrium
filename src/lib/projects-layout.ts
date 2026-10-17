export const PROJECT_STAT_IDS = [
  "active",
  "archived",
  "native",
  "external",
  "attention",
  "inProgress",
  "blocked",
  "doneWeek",
] as const;

export type ProjectStatId = (typeof PROJECT_STAT_IDS)[number];

export const PROJECT_INSIGHT_IDS = ["statusMix", "busiest"] as const;
export type ProjectInsightId = (typeof PROJECT_INSIGHT_IDS)[number];

export const PROJECT_SECTION_IDS = ["stats", "insights", "portfolio"] as const;
export type ProjectSectionId = (typeof PROJECT_SECTION_IDS)[number];

export type LayoutItem<T extends string> = {
  id: T;
  hidden?: boolean;
};

export type ProjectsLayout = {
  sections: LayoutItem<ProjectSectionId>[];
  stats: LayoutItem<ProjectStatId>[];
  insights: LayoutItem<ProjectInsightId>[];
};

export const DEFAULT_PROJECTS_LAYOUT: ProjectsLayout = {
  sections: [
    { id: "stats" },
    { id: "insights" },
    { id: "portfolio" },
  ],
  stats: PROJECT_STAT_IDS.map((id) => ({ id })),
  insights: PROJECT_INSIGHT_IDS.map((id) => ({ id })),
};

export const PROJECT_SECTION_LABELS: Record<ProjectSectionId, string> = {
  stats: "Overview tiles",
  insights: "Insights",
  portfolio: "Portfolio",
};

export const PROJECT_STAT_LABELS: Record<ProjectStatId, string> = {
  active: "Active projects",
  archived: "Archived",
  native: "Native",
  external: "External",
  attention: "Needs attention",
  inProgress: "In progress",
  blocked: "Blocked",
  doneWeek: "Done this week",
};

export const PROJECT_INSIGHT_LABELS: Record<ProjectInsightId, string> = {
  statusMix: "Status mix",
  busiest: "Busiest projects",
};

function normalizeItems<T extends string>(
  items: LayoutItem<T>[] | undefined,
  catalog: readonly T[],
): LayoutItem<T>[] {
  const known = new Set(catalog);
  const seen = new Set<T>();
  const next: LayoutItem<T>[] = [];
  for (const item of items ?? []) {
    if (!known.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push({ id: item.id, hidden: item.hidden ? true : undefined });
  }
  for (const id of catalog) {
    if (seen.has(id)) continue;
    next.push({ id });
  }
  return next;
}

export function parseProjectsLayout(raw: unknown): ProjectsLayout {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_PROJECTS_LAYOUT);
  const value = raw as Partial<ProjectsLayout>;
  return {
    sections: normalizeItems(value.sections, PROJECT_SECTION_IDS),
    stats: normalizeItems(value.stats, PROJECT_STAT_IDS),
    insights: normalizeItems(value.insights, PROJECT_INSIGHT_IDS),
  };
}

export function parseProjectsLayoutCookie(raw: string | undefined | null): ProjectsLayout | null {
  if (!raw?.trim()) return null;
  try {
    return parseProjectsLayout(JSON.parse(decodeURIComponent(raw)));
  } catch {
    try {
      return parseProjectsLayout(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}

export function visibleItems<T extends string>(items: LayoutItem<T>[]): T[] {
  return items.filter((item) => !item.hidden).map((item) => item.id);
}

export function moveLayoutItem<T extends string>(
  items: LayoutItem<T>[],
  id: T,
  toIndex: number,
): LayoutItem<T>[] {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return items;
  const next = [...items];
  const [row] = next.splice(from, 1);
  if (!row) return items;
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, row);
  return next;
}

export function toggleLayoutItem<T extends string>(
  items: LayoutItem<T>[],
  id: T,
  hidden: boolean,
): LayoutItem<T>[] {
  return items.map((item) => (item.id === id ? { ...item, hidden: hidden || undefined } : item));
}

export function restoreLayoutItem<T extends string>(
  items: LayoutItem<T>[],
  id: T,
): LayoutItem<T>[] {
  return items.map((item) => (item.id === id ? { id: item.id } : item));
}
