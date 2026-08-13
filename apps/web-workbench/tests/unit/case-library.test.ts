import { describe, expect, it } from "vitest";
import {
  BUILTIN_CASES,
  consumePendingCase,
  evaluateCase,
  exportCustomCases,
  importCustomCases,
  loadCaseFailureDiagnosis,
  saveCaseFailureDiagnosis,
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
          status: "completed",
          output: {
            status: "completed",
            mode: "markdown",
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

  it("asserts component, Action, and degradation semantics", () => {
    const result = evaluateCase(
      {
        presentationMode: "generative-ui",
        componentTypes: ["Card", "Button"],
        actionTypes: ["patrol.confirm"],
        degradationReasonCode: "POLICY_FALLBACK",
      },
      {
        status: "completed",
        output: {
          status: "completed",
          mode: "generative-ui",
          operations: [
            {
              updateComponents: {
                surfaceId: "s",
                components: [
                  { id: "root", component: "Card", children: ["confirm"] },
                  {
                    id: "confirm",
                    component: "Button",
                    action: {
                      event: {
                        name: "patrol.confirm",
                        context: {
                          actionId: "confirm",
                          destructive: false,
                          requiresApproval: true,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
        diagnostics: { stages: [], degradationReasonCode: "POLICY_FALLBACK" },
      },
    );
    expect(result).toEqual({ passed: true, failures: [] });
  });

  it("persists the most recent failed semantic diagnosis", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as unknown as Storage;
    saveCaseFailureDiagnosis(storage, "case-1", {
      passed: false,
      failures: ["Expected Card."],
    });
    expect(loadCaseFailureDiagnosis(storage)).toMatchObject({
      caseId: "case-1",
      failures: ["Expected Card."],
    });
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
