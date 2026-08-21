import { describe, expect, it } from "vitest";
import {
  applyFactCheck,
  editorRowsToFacts,
  evaluationOracleJson,
  evaluationSummary,
  factsToEditorRows,
  parseEvaluationOracleJson,
  scenarioForm,
  usedComponentNames,
} from "../../src/features/scenario-lab/scenario-lab-model.js";

describe("scenario lab model", () => {
  it("round-trips typed expected facts through the table editor", () => {
    const expectedFacts = {
      facts: [
        { pointer: "/total", value: 128 },
        { pointer: "/status", value: "partial_success" },
        { pointer: "/active", value: true },
      ],
    };

    const rows = factsToEditorRows(expectedFacts);

    expect(editorRowsToFacts(rows)).toEqual(expectedFacts);
    expect(parseEvaluationOracleJson(evaluationOracleJson(rows))).toEqual(rows);
  });

  it("maps a generation fact check back onto rows in source order", () => {
    const rows = factsToEditorRows({
      facts: [
        { pointer: "/total", value: 128 },
        { pointer: "/successRate", value: 0.938 },
      ],
    });

    expect(
      applyFactCheck(rows, [
        { pointer: "/total", status: "found", value: 128 },
        { pointer: "/successRate", status: "review", value: 0.938 },
      ]).map((row) => row.status),
    ).toEqual(["found", "review"]);
  });

  it("extracts generated component names and classifies common content forms", () => {
    const surface = {
      a2ui_operations: [
        {
          updateComponents: {
            components: [
              { component: "Metric", id: "total" },
              { component: "StatusBadge", id: "status" },
              { component: "Metric", id: "success" },
            ],
          },
        },
      ],
    };

    expect(usedComponentNames(surface)).toEqual(["Metric", "StatusBadge"]);
    expect(
      scenarioForm({ content: { value: { failed: 8, total: 128 } } }),
    ).toBe("摘要");
    expect(
      scenarioForm({ content: { value: { events: [{ time: "14:20" }] } } }),
    ).toBe("时间线");
  });

  it("summarizes successful evaluation rounds", () => {
    expect(
      evaluationSummary([
        {
          durationMs: 800,
          factsFound: 2,
          factsTotal: 2,
          number: 1,
          renderable: true,
          valid: true,
        },
        {
          durationMs: 900,
          factsFound: 1,
          factsTotal: 2,
          number: 2,
          renderable: true,
          valid: true,
        },
      ]),
    ).toBe("2 轮 · 1/2");
  });
});
