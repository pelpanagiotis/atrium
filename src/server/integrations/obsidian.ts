import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
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
const SKIP_DIR_NAMES = new Set([
  ".git",
  ".obsidian",
  ".trash",
  ".livesync",
  "node_modules",
  ".DS_Store",
]);

const SKIP_FILE_NAMES = new Set([".livesync-snapshot.json", ".DS_Store"]);

function shouldSkipNoteFile(name: string): boolean {
  if (SKIP_FILE_NAMES.has(name)) return true;
  // Excalidraw drawings are markdown wrappers, not prose notes.
  if (name.toLowerCase().endsWith(".excalidraw.md")) return true;
  return false;
}

export function isObsidianFilesystemTarget(siteUrl: string | null | undefined): boolean {
  const raw = (siteUrl ?? "").trim();
  if (!raw) return false;
  if (raw.startsWith("file://")) return true;
  if (raw.startsWith("/")) return true;
  // Explicit scheme used in docs/forms.
  if (raw.startsWith("vault:")) return true;
  return false;
}

export function parseObsidianVaultRoots(raw = process.env.OBSIDIAN_VAULT_ROOT): string[] {
  return (raw ?? "")
    .split(/[:\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function titleFromPath(notePath: string): string {
  const name = notePath.split("/").filter(Boolean).pop() ?? notePath;
  return name.replace(/\.md$/i, "") || name;
}

function folderFromPath(notePath: string): string {
  const parts = notePath.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

function filesFromList(data: VaultListResponse): string[] {
  if (Array.isArray(data)) return data.filter((item): item is string => typeof item === "string");
  if (Array.isArray(data.files)) return data.files.filter((item): item is string => typeof item === "string");
  return [];
}

export function normalizeObsidianVaultPath(siteUrl: string | null | undefined): string {
  const raw = (siteUrl ?? "").trim();
  if (!raw) {
    throw new ProviderError(
      "Vault path is required. Point at your LiveSync mirror directory, for example /root/vaults/THEVAULT",
      "validation",
      false,
    );
  }
  if (raw.startsWith("https://") || raw.startsWith("http://")) {
    throw new ProviderError("Use a filesystem vault path, not an HTTP URL", "validation", false);
  }
  let candidate = raw;
  if (candidate.startsWith("vault:")) candidate = candidate.slice("vault:".length);
  if (candidate.startsWith("file://")) {
    try {
      candidate = decodeURIComponent(new URL(candidate).pathname);
    } catch {
      throw new ProviderError("Vault path is invalid", "validation", false);
    }
  }
  if (!candidate.startsWith("/")) {
    throw new ProviderError("Vault path must be an absolute directory path", "validation", false);
  }
  if (candidate.includes("\0")) {
    throw new ProviderError("Vault path is invalid", "validation", false);
  }
  return path.resolve(candidate);
}

async function assertVaultUnderAllowlist(vaultPath: string): Promise<string> {
  const roots = parseObsidianVaultRoots();
  if (roots.length === 0) {
    throw new ProviderError(
      "Filesystem Obsidian vaults are disabled. Set OBSIDIAN_VAULT_ROOT on the Atrium host to the parent of your LiveSync mirror (for example /root/vaults)",
      "validation",
      false,
    );
  }

  let resolvedVault: string;
  try {
    resolvedVault = await realpath(vaultPath);
  } catch {
    throw new ProviderError(
      `Vault path was not found on this Atrium host: ${vaultPath}. For a vault on another VPS, deploy services/obsidian-vault-bridge there and paste its HTTPS URL instead (for example https://notes.example.com).`,
      "not_found",
      false,
      404,
    );
  }

  const vaultStat = await stat(resolvedVault);
  if (!vaultStat.isDirectory()) {
    throw new ProviderError("Vault path must be a directory", "validation", false);
  }

  for (const root of roots) {
    let resolvedRoot: string;
    try {
      resolvedRoot = await realpath(root);
    } catch {
      continue;
    }
    const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
    if (resolvedVault === resolvedRoot || resolvedVault.startsWith(prefix)) {
      return resolvedVault;
    }
  }

  throw new ProviderError(
    `Vault path must stay under OBSIDIAN_VAULT_ROOT (${roots.join(", ")})`,
    "unauthorized",
    false,
    403,
  );
}

function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatter?.[1]) {
    const block = frontmatter[1];
    const inline = block.match(/^tags:\s*\[([^\]]*)\]/m);
    if (inline?.[1]) {
      for (const part of inline[1].split(",")) {
        const tag = part.trim().replace(/^['"]|['"]$/g, "").replace(/^#/, "");
        if (tag) tags.add(tag);
      }
    }
    const list = block.match(/^tags:\s*\n((?:[ \t]*-[ \t].+\n?)*)/m);
    if (list?.[1]) {
      for (const line of list[1].split("\n")) {
        const tag = line.replace(/^[ \t]*-[ \t]*/, "").trim().replace(/^['"]|['"]$/g, "").replace(/^#/, "");
        if (tag) tags.add(tag);
      }
    }
  }
  for (const match of content.matchAll(/(^|\s)#([A-Za-z0-9/_-]+)/g)) {
    if (match[2]) tags.add(match[2]);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

async function walkFilesystemNotes(
  vaultRoot: string,
  options: { query?: string; folder?: string } = {},
): Promise<ObsidianNoteSummary[]> {
  const query = options.query?.trim().toLowerCase() ?? "";
  const folder = (options.folder ?? "").replace(/^\/+|\/+$/g, "");
  const startDir = folder ? path.join(vaultRoot, ...folder.split("/")) : vaultRoot;
  const notes: ObsidianNoteSummary[] = [];
  const queue: Array<{ abs: string; rel: string; depth: number }> = [{ abs: startDir, rel: folder, depth: 0 }];
  const seen = new Set<string>();

  while (queue.length > 0 && notes.length < MAX_NOTES) {
    const next = queue.shift();
    if (!next) break;
    if (seen.has(next.abs) || next.depth > MAX_DEPTH) continue;
    seen.add(next.abs);

    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = await readdir(next.abs, { withFileTypes: true, encoding: "utf8" });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (notes.length >= MAX_NOTES) break;
      const name = String(entry.name);
      if (name.startsWith(".") || SKIP_DIR_NAMES.has(name)) continue;
      const abs = path.join(next.abs, name);
      const rel = next.rel ? `${next.rel}/${name}` : name;
      if (entry.isDirectory()) {
        queue.push({ abs, rel, depth: next.depth + 1 });
        continue;
      }
      if (!entry.isFile() || !name.toLowerCase().endsWith(".md") || shouldSkipNoteFile(name)) continue;
      const summary = {
        path: rel,
        title: titleFromPath(rel),
        folder: folderFromPath(rel),
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

async function readFilesystemNote(vaultRoot: string, notePath: string): Promise<ObsidianNote> {
  const cleaned = notePath.replace(/^\/+/, "").trim();
  if (!cleaned || cleaned.includes("..") || path.isAbsolute(cleaned)) {
    throw new ProviderError("Note path is invalid", "validation", false);
  }
  if (!cleaned.toLowerCase().endsWith(".md")) {
    throw new ProviderError("Only markdown notes are supported", "validation", false);
  }
  const absolute = path.resolve(vaultRoot, cleaned);
  const prefix = vaultRoot.endsWith(path.sep) ? vaultRoot : `${vaultRoot}${path.sep}`;
  if (absolute !== vaultRoot && !absolute.startsWith(prefix)) {
    throw new ProviderError("Note path is outside the vault", "unauthorized", false, 403);
  }
  let resolved: string;
  try {
    resolved = await realpath(absolute);
  } catch {
    throw new ProviderError("Note was not found", "not_found", false, 404);
  }
  if (resolved !== vaultRoot && !resolved.startsWith(prefix)) {
    throw new ProviderError("Note path is outside the vault", "unauthorized", false, 403);
  }
  const fileStat = await stat(resolved);
  if (!fileStat.isFile()) {
    throw new ProviderError("Note was not found", "not_found", false, 404);
  }
  const content = await readFile(resolved, "utf8");
  return {
    path: cleaned,
    title: titleFromPath(cleaned),
    folder: folderFromPath(cleaned),
    content,
    tags: extractTags(content),
    updatedAt: fileStat.mtime.toISOString(),
    size: fileStat.size,
  };
}

export function normalizeObsidianSiteUrl(siteUrl: string | null | undefined): string {
  const raw = (siteUrl ?? "").trim();
  if (!raw) {
    throw new ProviderError(
      "Obsidian URL is required. Use the HTTPS origin of your vault bridge (or Local REST API), for example https://notes.example.com",
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
      "Remote Obsidian vaults must use https on a public hostname (port 443). Deploy services/obsidian-vault-bridge on the LiveSync VPS and terminate TLS there.",
      "validation",
      false,
    );
  }
  return url.origin;
}

function vaultPathUrl(base: string, notePath: string, directory = false): string {
  const segments = notePath
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => encodeURIComponent(part));
  const joined = segments.join("/");
  if (!joined) return `${base}/vault/`;
  return `${base}/vault/${joined}${directory ? "/" : ""}`;
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

async function validateFilesystemVault(
  siteUrl: string | null | undefined,
): Promise<{ accountLabel: string; externalAccountId: string }> {
  const vaultPath = normalizeObsidianVaultPath(siteUrl);
  const resolved = await assertVaultUnderAllowlist(vaultPath);
  const label = path.basename(resolved) || resolved;
  return {
    accountLabel: `Obsidian · ${label}`,
    externalAccountId: resolved,
  };
}

async function validateRestApiConnection(
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
      error instanceof Error
        ? error.message
        : "Could not reach the Obsidian vault bridge (or Local REST API)",
      "unavailable",
      true,
    );
  }
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

export async function validateObsidianConnection(
  token: string,
  siteUrl: string | null | undefined,
): Promise<{ accountLabel: string; externalAccountId: string }> {
  if (isObsidianFilesystemTarget(siteUrl)) {
    return validateFilesystemVault(siteUrl);
  }
  return validateRestApiConnection(token, siteUrl);
}

async function listDirectory(base: string, token: string, directory: string): Promise<string[]> {
  const url = directory ? vaultPathUrl(base, directory, true) : `${base}/vault/`;
  const data = await obsidianGet<VaultListResponse>(url, token);
  return filesFromList(data);
}

async function listRestNotes(
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
      if (!name.toLowerCase().endsWith(".md") || shouldSkipNoteFile(name)) continue;
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

export async function listObsidianNotes(
  token: string,
  siteUrl: string | null | undefined,
  options: { query?: string; folder?: string } = {},
): Promise<ObsidianNoteSummary[]> {
  if (isObsidianFilesystemTarget(siteUrl)) {
    const vaultRoot = await assertVaultUnderAllowlist(normalizeObsidianVaultPath(siteUrl));
    return walkFilesystemNotes(vaultRoot, options);
  }
  return listRestNotes(token, siteUrl, options);
}

export async function getObsidianNote(
  token: string,
  siteUrl: string | null | undefined,
  notePath: string,
): Promise<ObsidianNote> {
  if (isObsidianFilesystemTarget(siteUrl)) {
    const vaultRoot = await assertVaultUnderAllowlist(normalizeObsidianVaultPath(siteUrl));
    return readFilesystemNote(vaultRoot, notePath);
  }

  const base = normalizeObsidianSiteUrl(siteUrl);
  const cleaned = notePath.replace(/^\/+/, "").trim();
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
