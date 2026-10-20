import { describe, expect, it } from "vitest";
import { parseSidebarGroups, parseSidebarOrder } from "@/components/app-sidebar";

describe("sidebar cookies", () => {
  it("parses custom order and migrates calendar to schedule", () => {
    expect(parseSidebarOrder("/home,/calendar,/notes")).toEqual(["/home", "/schedule", "/notes"]);
  });

  it("parses group open state with defaults", () => {
    expect(parseSidebarGroups(undefined)).toEqual({
      work: true,
      inbox: true,
      connect: false,
      manage: false,
    });
    expect(parseSidebarGroups("connect:1,manage:open,work:0")).toEqual({
      work: false,
      inbox: true,
      connect: true,
      manage: true,
    });
  });
});
