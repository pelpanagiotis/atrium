import { sha256 } from "../crypto/secrets";

export const CANONICAL_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "dueAt",
  "assignee",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export type CanonicalSnapshot = Record<CanonicalField, string | null>;

export function emptySnapshot(): CanonicalSnapshot {
  return {
    title: null,
    description: null,
    status: null,
    priority: null,
    dueAt: null,
    assignee: null,
  };
}

export function fingerprintSnapshot(snapshot: CanonicalSnapshot): string {
  const normalized: CanonicalSnapshot = {
    title: snapshot.title?.trim() ?? null,
    description: snapshot.description?.trim() ?? null,
    status: snapshot.status,
    priority: snapshot.priority,
    dueAt: snapshot.dueAt,
    assignee: snapshot.assignee,
  };
  return sha256(JSON.stringify(normalized));
}

export function changedFields(local: CanonicalSnapshot, remote: CanonicalSnapshot): CanonicalField[] {
  return CANONICAL_FIELDS.filter((field) => (local[field] ?? null) !== (remote[field] ?? null));
}
