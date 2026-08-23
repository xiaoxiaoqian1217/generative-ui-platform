import { describe, expect, it } from "vitest";
import {
  quickScenarioForwardedProps,
  quickScenarios,
} from "../../src/app/scenarios.js";

describe("Workbench quick scenarios", () => {
  it("forwards the explicit validation scenario id through LangGraph run config", () => {
    const scenario = quickScenarios.find(
      (candidate) =>
        candidate.validationScenarioId === "north-corridor-overview-v1",
    );

    if (scenario === undefined) throw new Error("Validation scenario missing");
    expect(quickScenarioForwardedProps(scenario)).toEqual({
      config: {
        configurable: {
          validationScenarioId: "north-corridor-overview-v1",
        },
      },
    });
  });

  it("keeps all validation scenarios on the non-default dev-only source", () => {
    const validationScenarios = quickScenarios.filter(
      (scenario) => scenario.validationScenarioId !== undefined,
    );

    expect(validationScenarios).toHaveLength(3);
    expect(
      validationScenarios.every(
        (scenario) => scenario.agentSource === "map-validation-agent",
      ),
    ).toBe(true);
  });
});
