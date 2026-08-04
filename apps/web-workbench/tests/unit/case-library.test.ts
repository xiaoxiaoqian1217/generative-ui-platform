import { describe, expect, it } from "vitest";
import {
  BUILTIN_CASES,
  consumePendingCase,
  evaluateCase,
  exportCustomCases,
  importCustomCases,
  savePendingCase,
} from "../../src/cases/case-library.js";

describe("Workbench case library", () => {
  it("ships the eleven required acceptance cases", () => {
    expect(BUILTIN_CASES).toHaveLength(11);
    expect(BUILTIN_CASES.map((item) => item.id)).toContain(
      "backend-tool-failure",
    );
  });

  it("compares semantic result properties instead of raw A2UI", () => {
    expect(
      evaluateCase(
        { presentationMode: "markdown" },
        {
          protocolVersion: "1.0",
          requestId: "r",
          threadId: "t",
          runId: "run",
          presentationRequestId: "p",
          status: "completed",
          presentation: {
            requestId: "p",
            status: "completed",
            mode: "markdown",
            markdown: "Any copy can change.",
          },
        },
      ),
    ).toEqual({ passed: true, failures: [] });
  });

  it("round-trips user cases as JSON without exporting built-ins", () => {
    const firstBuiltin = BUILTIN_CASES.at(0);
    if (firstBuiltin === undefined) throw new Error("Expected built-in case.");
    const exported = exportCustomCases([
      firstBuiltin,
      {
        id: "local",
        title: "Local",
        input: "Run",
        expectation: {},
        builtin: false,
      },
    ]);
    expect(importCustomCases(exported)).toEqual([
      {
        id: "local",
        title: "Local",
        input: "Run",
        expectation: {},
        builtin: false,
      },
    ]);
    expect(() => importCustomCases("{}")).toThrow(
      "WORKBENCH_CASE_IMPORT_INVALID",
    );
  });

  it("consumes a selected case exactly once before replay", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } as unknown as Storage;
    const local = {
      id: "local",
      title: "Local",
      input: "Run",
      expectation: {},
      builtin: false,
    };
    savePendingCase(storage, local);
    expect(consumePendingCase(storage)).toEqual(local);
    expect(consumePendingCase(storage)).toBeUndefined();
  });
});
