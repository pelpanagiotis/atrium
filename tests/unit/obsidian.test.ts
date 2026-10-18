import { mkdtemp, mkdir, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setDnsResolver, setProviderFetch } from "@/server/integrations/http";
import {
  getObsidianNote,
  isObsidianFilesystemTarget,
  listObsidianNotes,
  normalizeObsidianSiteUrl,
  normalizeObsidianVaultPath,
  validateObsidianConnection,
} from "@/server/integrations/obsidian";

describe("obsidian vault access", () => {
  const previousRoot = process.env.OBSIDIAN_VAULT_ROOT;

  beforeEach(() => {
    setDnsResolver(async () => ["8.8.4.4"]);
    setProviderFetch(null);
  });

  afterEach(() => {
    setProviderFetch(null);
    setDnsResolver(undefined);
    if (previousRoot === undefined) delete process.env.OBSIDIAN_VAULT_ROOT;
    else process.env.OBSIDIAN_VAULT_ROOT = previousRoot;
  });

  it("detects filesystem targets vs HTTPS", () => {
    expect(isObsidianFilesystemTarget("/root/vaults/THEVAULT")).toBe(true);
    expect(isObsidianFilesystemTarget("file:///root/vaults/THEVAULT")).toBe(true);
    expect(isObsidianFilesystemTarget("vault:/root/vaults/THEVAULT")).toBe(true);
    expect(isObsidianFilesystemTarget("https://notes.example.com")).toBe(false);
  });

  it("normalizes public https origins", () => {
    expect(normalizeObsidianSiteUrl("https://notes.example.com/vault")).toBe("https://notes.example.com");
    expect(normalizeObsidianSiteUrl("notes.example.com")).toBe("https://notes.example.com");
  });

  it("rejects insecure or empty site urls for REST mode", () => {
    expect(() => normalizeObsidianSiteUrl("")).toThrow(/required/i);
    expect(() => normalizeObsidianSiteUrl("http://notes.example.com")).toThrow(/vault bridge|https/i);
  });

  it("hints at the remote vault bridge when a local path is missing", async () => {
    process.env.OBSIDIAN_VAULT_ROOT = "/workspace/vaults";
    await expect(validateObsidianConnection("local-secret", "/root/vaults/THEVAULT")).rejects.toThrow(
      /vault bridge|another VPS/i,
    );
  });

  it("reads a LiveSync filesystem mirror under OBSIDIAN_VAULT_ROOT", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "atrium-obsidian-"));
    const vault = path.join(root, "THEVAULT");
    await mkdir(path.join(vault, "Projects"), { recursive: true });
    await writeFile(path.join(vault, "Welcome.md"), "# Welcome\n\nHello #inbox\n");
    await writeFile(
      path.join(vault, "Projects", "Roadmap.md"),
      "---\ntags: [plan]\n---\n# Roadmap\n\nShip notes.\n",
    );
    process.env.OBSIDIAN_VAULT_ROOT = root;

    const validated = await validateObsidianConnection("local-secret", vault);
    expect(validated.externalAccountId).toBe(await realpath(vault));

    const notes = await listObsidianNotes("local-secret", vault);
    expect(notes.map((note) => note.path)).toEqual(["Projects/Roadmap.md", "Welcome.md"]);

    const note = await getObsidianNote("local-secret", vault, "Projects/Roadmap.md");
    expect(note.title).toBe("Roadmap");
    expect(note.content).toContain("Ship notes");
    expect(note.tags).toContain("plan");
  });

  it("blocks vault paths outside OBSIDIAN_VAULT_ROOT", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "atrium-obsidian-root-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "atrium-obsidian-out-"));
    process.env.OBSIDIAN_VAULT_ROOT = root;
    await expect(validateObsidianConnection("local-secret", outside)).rejects.toThrow(/OBSIDIAN_VAULT_ROOT/i);
  });

  it("normalizes vault paths", () => {
    expect(normalizeObsidianVaultPath("vault:/root/vaults/THEVAULT")).toBe("/root/vaults/THEVAULT");
    expect(normalizeObsidianVaultPath("file:///root/vaults/THEVAULT")).toBe("/root/vaults/THEVAULT");
  });

  it("validates Local REST credentials against status and vault root", async () => {
    const calls: string[] = [];
    setProviderFetch(async (input) => {
      calls.push(input);
      if (input === "https://notes.example.com/") {
        return new Response(JSON.stringify({ status: "OK", authenticated: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ files: ["Welcome.md", "Projects/"] }), { status: 200 });
    });
    const result = await validateObsidianConnection("api-key-123456", "https://notes.example.com");
    expect(result.externalAccountId).toBe("notes.example.com");
    expect(calls[0]).toBe("https://notes.example.com/");
    expect(calls[1]).toBe("https://notes.example.com/vault/");
  });

  it("lists markdown notes recursively over Local REST", async () => {
    setProviderFetch(async (input) => {
      if (input.endsWith("/vault/")) {
        return new Response(JSON.stringify({ files: ["Welcome.md", "Projects/"] }), { status: 200 });
      }
      if (input.endsWith("/vault/Projects/")) {
        return new Response(JSON.stringify({ files: ["Roadmap.md", "skip.txt"] }), { status: 200 });
      }
      return new Response("missing", { status: 404 });
    });
    const notes = await listObsidianNotes("api-key-123456", "https://notes.example.com");
    expect(notes.map((note) => note.path)).toEqual(["Projects/Roadmap.md", "Welcome.md"]);
  });
});
