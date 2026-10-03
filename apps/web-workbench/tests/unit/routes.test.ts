import { describe, expect, it } from "vitest";
import {
  resolveWorkbenchRoute,
  WORKBENCH_ROUTES,
} from "../../src/app/routes.js";

describe("Workbench routes", () => {
  it("recognizes stable routes and the isolated intervention experiment", () => {
    expect(WORKBENCH_ROUTES).toEqual([
      "/conversation",
      "/playground",
      "/inspect",
      "/cases",
      "/catalog",
      "/scenarios",
      "/intervention-lab",
      "/settings",
    ]);
    for (const route of WORKBENCH_ROUTES) {
      expect(resolveWorkbenchRoute(route)).toBe(route);
    }
  });

  it("uses Conversation as the safe fallback route", () => {
    expect(resolveWorkbenchRoute("/")).toBe("/conversation");
    expect(resolveWorkbenchRoute("/unknown")).toBe("/conversation");
  });
});
