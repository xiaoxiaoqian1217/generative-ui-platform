import { describe, expect, it } from "vitest";
import {
  resolveWorkbenchRoute,
  WORKBENCH_ROUTES,
} from "../../src/app/routes.js";

describe("Workbench routes", () => {
  it("recognizes the six stable product routes", () => {
    expect(WORKBENCH_ROUTES).toEqual([
      "/playground",
      "/inspect",
      "/cases",
      "/catalog",
      "/scenarios",
      "/settings",
    ]);
    for (const route of WORKBENCH_ROUTES) {
      expect(resolveWorkbenchRoute(route)).toBe(route);
    }
  });

  it("uses Playground as the safe fallback route", () => {
    expect(resolveWorkbenchRoute("/")).toBe("/playground");
    expect(resolveWorkbenchRoute("/unknown")).toBe("/playground");
  });
});
