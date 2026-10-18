#!/usr/bin/env node
/**
 * Read-only Obsidian vault bridge for Self-hosted LiveSync filesystem mirrors.
 *
 * Speaks a Local REST API–compatible subset so Atrium (running on any host)
 * can browse notes over HTTPS without sharing a disk mount.
 *
 * Env:
 *   VAULT_ROOT   Absolute path to the vault mirror (required)
 *   API_TOKEN    Bearer token required on every request (required, ≥8 chars)
 *   PORT         Listen port (default 27124)
 *   HOST         Bind address (default 0.0.0.0)
 */

import http from "node:http";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const MAX_DEPTH = 8;
const SKIP_DIRS = new Set([".git", ".obsidian", ".trash", ".livesync", "node_modules"]);
const SKIP_FILES = new Set([".livesync-snapshot.json", ".DS_Store"]);

const vaultRootEnv = (process.env.VAULT_ROOT ?? "").trim();
const apiToken = (process.env.API_TOKEN ?? "").trim();
const port = Number(process.env.PORT ?? "27124");
const host = (process.env.HOST ?? "0.0.0.0").trim() || "0.0.0.0";

if (!vaultRootEnv.startsWith("/")) {
  console.error("VAULT_ROOT must be an absolute directory path");
  process.exit(1);
}
if (apiToken.length < 8) {
  console.error("API_TOKEN must be at least 8 characters");
  process.exit(1);
}
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.error("PORT must be a valid TCP port");
  process.exit(1);
}

const vaultRoot = await realpath(vaultRootEnv);
const vaultStat = await stat(vaultRoot);
if (!vaultStat.isDirectory()) {
  console.error(`VAULT_ROOT is not a directory: ${vaultRoot}`);
  process.exit(1);
}

function sendJson(res, status, body, contentType = "application/json") {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function unauthorized(res) {
  sendJson(res, 401, { message: "Unauthorized" });
}

function notFound(res, message = "Not found") {
  sendJson(res, 404, { message });
}

function badRequest(res, message) {
  sendJson(res, 400, { message });
}

function tokenFromRequest(req) {
  const header = req.headers.authorization ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string") return apiKey.trim();
  return "";
}

function shouldSkipFile(name) {
  if (SKIP_FILES.has(name)) return true;
  if (name.toLowerCase().endsWith(".excalidraw.md")) return true;
  return false;
}

function decodeVaultPath(pathname) {
  const raw = pathname.replace(/^\/vault\/?/, "");
  if (!raw) return "";
  const parts = raw
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        throw new Error("Invalid path encoding");
      }
    });
  if (parts.some((part) => part === ".." || part.includes("\0"))) {
    throw new Error("Invalid path");
  }
  return parts.join("/");
}

async function resolveInsideVault(relativePath) {
  const absolute = relativePath
    ? path.resolve(vaultRoot, relativePath)
    : vaultRoot;
  const prefix = vaultRoot.endsWith(path.sep) ? vaultRoot : `${vaultRoot}${path.sep}`;
  if (absolute !== vaultRoot && !absolute.startsWith(prefix)) {
    throw Object.assign(new Error("Path escapes vault"), { code: "ESCAPE" });
  }
  const resolved = await realpath(absolute);
  if (resolved !== vaultRoot && !resolved.startsWith(prefix)) {
    throw Object.assign(new Error("Path escapes vault"), { code: "ESCAPE" });
  }
  return resolved;
}

function extractTags(content) {
  const tags = new Set();
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
        const tag = line
          .replace(/^[ \t]*-[ \t]*/, "")
          .trim()
          .replace(/^['"]|['"]$/g, "")
          .replace(/^#/, "");
        if (tag) tags.add(tag);
      }
    }
  }
  for (const match of content.matchAll(/(^|\s)#([A-Za-z0-9/_-]+)/g)) {
    if (match[2]) tags.add(match[2]);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

async function listDirectory(relativeDir) {
  const abs = await resolveInsideVault(relativeDir);
  const entries = await readdir(abs, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = String(entry.name);
    if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;
    if (entry.isDirectory()) {
      files.push(`${name}/`);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!name.toLowerCase().endsWith(".md") || shouldSkipFile(name)) continue;
    files.push(name);
  }
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

async function readNote(relativePath) {
  if (!relativePath.toLowerCase().endsWith(".md") || shouldSkipFile(path.basename(relativePath))) {
    throw Object.assign(new Error("Only markdown notes are supported"), { code: "BAD" });
  }
  const abs = await resolveInsideVault(relativePath);
  const fileStat = await stat(abs);
  if (!fileStat.isFile()) {
    throw Object.assign(new Error("Note was not found"), { code: "MISSING" });
  }
  const content = await readFile(abs, "utf8");
  return {
    content,
    frontmatter: {},
    path: relativePath,
    stat: {
      ctime: fileStat.ctimeMs,
      mtime: fileStat.mtimeMs,
      size: fileStat.size,
    },
    tags: extractTags(content),
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { message: "Method not allowed" });
      return;
    }
    if (tokenFromRequest(req) !== apiToken) {
      unauthorized(res);
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname.replace(/\/{2,}/g, "/");

    if (pathname === "/" || pathname === "") {
      sendJson(res, 200, {
        status: "OK",
        authenticated: true,
        service: "atrium-obsidian-vault-bridge",
        versions: { atriumVaultBridge: "1.0.0" },
      });
      return;
    }

    if (!pathname.startsWith("/vault")) {
      notFound(res);
      return;
    }

    let relative;
    try {
      relative = decodeVaultPath(pathname);
    } catch {
      badRequest(res, "Invalid vault path");
      return;
    }

    const wantsDirectory = pathname.endsWith("/");
    if (wantsDirectory || relative === "") {
      try {
        const files = await listDirectory(relative);
        sendJson(res, 200, { files });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ESCAPE") {
          badRequest(res, "Invalid vault path");
          return;
        }
        notFound(res, "Directory was not found");
      }
      return;
    }

    try {
      const note = await readNote(relative);
      sendJson(res, 200, note, "application/vnd.olrapi.note+json");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "BAD") {
          badRequest(res, error.message);
          return;
        }
        if (error.code === "ESCAPE") {
          badRequest(res, "Invalid vault path");
          return;
        }
      }
      notFound(res, "Note was not found");
    }
  } catch (error) {
    console.error("vault bridge error", error);
    sendJson(res, 500, { message: "Internal error" });
  }
});

server.listen(port, host, () => {
  console.log(
    `atrium-obsidian-vault-bridge listening on http://${host}:${port} vault=${vaultRoot} depth<=${MAX_DEPTH}`,
  );
});
