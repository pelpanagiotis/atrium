import { providerFetch } from "./http";
import { ProviderError } from "./types";

export type ObsidianNoteSummary = {
  path: string;
  title: string;
  folder: string;
};

export type ObsidianNote = ObsidianNoteSummary & {
  content: string;
  tags: string[];
  updatedAt: string | null;
  size: number | null;
};

type VaultListResponse = { files?: string[] } | string[];

type NoteJson = {
  path?: string;
  content?: string;
  tags?: string[];
  frontmatter?: Record<string, unknown>;
  stat?: { ctime?: number; mtime?: number; size?: number };
};

const MAX_NOTES = 500;
const MAX_DEPTH = 8;

export function normalizeObsidianSiteUrl(siteUrl: string | null | undefined): string {
  const raw = (siteUrl ?? "").trim();
  if (!raw) {
    throw new ProviderError(
      "Obsidian site URL is required. Use your VPS HTTPS hostname (port 443), for example https://obsidian.example.com",
      "validation",
      false,
    );
  }
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new ProviderError("Obsidian site URL is invalid", "validation", false);
  }
  if (url.protocol !== "https:") {
    throw new ProviderError(
      "Obsidian site URL must use https on a public hostname (put Local REST API behind a reverse proxy on port 443)",
      "validation",
      false,
    );
  }
  return url.origin;
}

function vaultPathUrl(base: string, path: string, directory = false): string {
  const segments = path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => encodeURIComponent(part));
  const joined = segments.join("/");
  if (!joined) return `${base}/vault/`;
  return `${base}/vault/${joined}${directory ? "/" : ""}`;
}

function titleFromPath(path: string): string {
  const name = path.split("/").filter(Boolean).pop() ?? path;
  return name.replace(/\.md$/i, "") || name;
}

function folderFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

function filesFromList(data: VaultListResponse): string[] {
  if (Array.isArray(data)) return data.filter((item): item is string => typeof item === "string");
  if (Array.isArray(data.files)) return data.files.filter((item): item is string => typeof item === "string");
  return [];
}

async function obsidianGet<T>(
  url: string,
  token: string,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await providerFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...headers,
    },
  });
  return (await response.json()) as T;
}

export async function validateObsidianConnection(
  token: string,
  siteUrl: string | null | undefined,
): Promise<{ accountLabel: string; externalAccountId: string }> {
  const base = normalizeObsidianSiteUrl(siteUrl);
  const trimmed = token.trim();
  if (trimmed.length < 8) {
    throw new ProviderError("Obsidian API key is too short", "validation", false);
  }
  try {
    const status = await obsidianGet<{
      status?: string;
      authenticated?: boolean;
      service?: string;
    }>(`${base}/`, trimmed);
    if (status.authenticated === false) {
      throw new ProviderError("Obsidian rejected the API key", "unauthorized", false, 401);
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(
      error instanceof Error ? error.message : "Could not reach Obsidian Local REST API",
      "unavailable",
      true,
    );
  }
  // Confirm vault access (lists root).
  await obsidianGet<VaultListResponse>(`${base}/vault/`, trimmed);
  let host = "obsidian";
  try {
    host = new URL(base).hostname;
  } catch {
    // keep fallback
  }
  return {
    accountLabel: `Obsidian · ${host}`,
    externalAccountId: host,
  };
}

async function listDirectory(
  base: string,
  token: string,
  directory: string,
): Promise<string[]> {
  const url = directory ? vaultPathUrl(base, directory, true) : `${base}/vault/`;
  const data = await obsidianGet<VaultListResponse>(url, token);
  return filesFromList(data);
}

export async function listObsidianNotes(
  token: string,
  siteUrl: string | null | undefined,
  options: { query?: string; folder?: string } = {},
): Promise<ObsidianNoteSummary[]> {
  const base = normalizeObsidianSiteUrl(siteUrl);
  const query = options.query?.trim().toLowerCase() ?? "";
  const root = (options.folder ?? "").replace(/^\/+|\/+$/g, "");
  const notes: ObsidianNoteSummary[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
  const seenDirs = new Set<string>();

  while (queue.length > 0 && notes.length < MAX_NOTES) {
    const next = queue.shift();
    if (!next) break;
    const key = next.dir || ".";
    if (seenDirs.has(key) || next.depth > MAX_DEPTH) continue;
    seenDirs.add(key);

    let entries: string[];
    try {
      entries = await listDirectory(base, token, next.dir);
    } catch (error) {
      if (error instanceof ProviderError && error.code === "not_found") continue;
      throw error;
    }

    for (const entry of entries) {
      if (notes.length >= MAX_NOTES) break;
      const name = entry.replace(/^\.\//, "");
      if (!name || name.startsWith(".")) continue;
      const absolute = next.dir ? `${next.dir}/${name.replace(/\/$/, "")}` : name.replace(/\/$/, "");
      if (name.endsWith("/")) {
        queue.push({ dir: absolute, depth: next.depth + 1 });
        continue;
      }
      if (!name.toLowerCase().endsWith(".md")) continue;
      const summary = {
        path: absolute,
        title: titleFromPath(absolute),
        folder: folderFromPath(absolute),
      };
      if (query) {
        const haystack = `${summary.title} ${summary.path}`.toLowerCase();
        if (!haystack.includes(query)) continue;
      }
      notes.push(summary);
    }
  }

  notes.sort((a, b) => a.path.localeCompare(b.path));
  return notes;
}

export async function getObsidianNote(
  token: string,
  siteUrl: string | null | undefined,
  path: string,
): Promise<ObsidianNote> {
  const base = normalizeObsidianSiteUrl(siteUrl);
  const cleaned = path.replace(/^\/+/, "").trim();
  if (!cleaned || cleaned.includes("..")) {
    throw new ProviderError("Note path is invalid", "validation", false);
  }
  if (!cleaned.toLowerCase().endsWith(".md")) {
    throw new ProviderError("Only markdown notes are supported", "validation", false);
  }
  const data = await obsidianGet<NoteJson>(vaultPathUrl(base, cleaned, false), token, {
    Accept: "application/vnd.olrapi.note+json",
  });
  const resolvedPath = typeof data.path === "string" && data.path.trim() ? data.path : cleaned;
  const mtime = data.stat?.mtime;
  return {
    path: resolvedPath,
    title: titleFromPath(resolvedPath),
    folder: folderFromPath(resolvedPath),
    content: typeof data.content === "string" ? data.content : "",
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
    updatedAt: typeof mtime === "number" ? new Date(mtime).toISOString() : null,
    size: typeof data.stat?.size === "number" ? data.stat.size : null,
  };
}
