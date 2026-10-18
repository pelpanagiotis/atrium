import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setDnsResolver, setProviderFetch } from "@/server/integrations/http";
import {
  getObsidianNote,
  listObsidianNotes,
  normalizeObsidianSiteUrl,
  validateObsidianConnection,
} from "@/server/integrations/obsidian";

describe("obsidian Local REST API client", () => {
  beforeEach(() => {
    setDnsResolver(async () => ["8.8.4.4"]);
    setProviderFetch(null);
  });

  afterEach(() => {
    setProviderFetch(null);
    setDnsResolver(undefined);
  });

  it("normalizes public https origins", () => {
    expect(normalizeObsidianSiteUrl("https://notes.example.com/vault")).toBe("https://notes.example.com");
    expect(normalizeObsidianSiteUrl("notes.example.com")).toBe("https://notes.example.com");
  });

  it("rejects insecure or empty site urls", () => {
    expect(() => normalizeObsidianSiteUrl("")).toThrow(/required/i);
    expect(() => normalizeObsidianSiteUrl("http://notes.example.com")).toThrow(/https/i);
  });

  it("validates credentials against status and vault root", async () => {
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

  it("lists markdown notes recursively", async () => {
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

  it("loads note json content", async () => {
    setProviderFetch(async () =>
      new Response(
        JSON.stringify({
          path: "Projects/Roadmap.md",
          content: "# Roadmap\n\nShip notes.",
          tags: ["plan"],
          stat: { mtime: Date.parse("2026-01-02T00:00:00.000Z"), size: 20 },
        }),
        { status: 200 },
      ),
    );
    const note = await getObsidianNote("api-key-123456", "https://notes.example.com", "Projects/Roadmap.md");
    expect(note.title).toBe("Roadmap");
    expect(note.content).toContain("Ship notes");
    expect(note.tags).toEqual(["plan"]);
  });
});
