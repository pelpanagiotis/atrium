import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES, guideIdForPath } from "@/lib/screen-guides";

// Console routes that only redirect and never render, so they need no guide.
const REDIRECT_ONLY_ROUTES = new Set(["calendar"]);

function consoleRoutes(): string[] {
  const root = path.resolve(__dirname, "../../src/app/(console)");
  return readdirSync(root, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith("page.tsx"))
    .map((file) => path.dirname(file).split(path.sep).filter((segment) => !segment.startsWith("(")))
    .map((segments) => `/${segments.map((segment) => segment.replace(/^\[.*\]$/, "sample")).join("/")}`)
    .map((route) => (route === "/" ? "/home" : route));
}

describe("screen guides", () => {
  it("gives every console screen a guide", () => {
    const missing = consoleRoutes().filter((route) => {
      const first = route.split("/").filter(Boolean)[0] ?? "";
      if (REDIRECT_ONLY_ROUTES.has(first)) return false;
      return guideIdForPath(route) === null;
    });
    expect(missing).toEqual([]);
  });

  it("has consistent guide entries", () => {
    for (const [key, guide] of Object.entries(GUIDES)) {
      expect(guide.id).toBe(key);
      expect(Number.isInteger(guide.version)).toBe(true);
      expect(guide.version).toBeGreaterThan(0);
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.sections.length).toBeGreaterThan(0);
    }
  });

  it("maps list and detail paths to their guides", () => {
    expect(guideIdForPath("/home")).toBe("home");
    expect(guideIdForPath("/tasks")).toBe("tasks");
    expect(guideIdForPath("/tasks/abc")).toBe("task");
    expect(guideIdForPath("/projects/abc")).toBe("project");
    expect(guideIdForPath("/integrations/abc")).toBe("integration");
    expect(guideIdForPath("/schedule")).toBe("schedule");
  });

  it("returns null for paths outside the console", () => {
    expect(guideIdForPath("/login")).toBeNull();
    expect(guideIdForPath("/")).toBeNull();
    expect(guideIdForPath("/constructor")).toBeNull();
  });
});
