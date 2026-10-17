export type WorkspaceContextDef = {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  position: number;
};

export const DEFAULT_WORKSPACE_CONTEXTS = [
  { slug: "personal", label: "Personal", icon: "🏠", position: 0 },
  { slug: "work", label: "Work", icon: "🏢", position: 1 },
] as const;

export function slugifyContextLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug;
}

export function isValidContextSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 1 && slug.length <= 40;
}

export function contextLabel(contexts: WorkspaceContextDef[], slug: string): string {
  const match = contexts.find((context) => context.slug === slug);
  if (match) return match.label;
  if (!slug) return "Context";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function contextIcon(contexts: WorkspaceContextDef[], slug: string): string | null {
  return contexts.find((context) => context.slug === slug)?.icon ?? null;
}
