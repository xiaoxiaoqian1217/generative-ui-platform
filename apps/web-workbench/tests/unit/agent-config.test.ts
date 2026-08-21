import { describe, expect, it } from "vitest";
import { createAgentEndpoints } from "../../src/settings/agent-config.js";

describe("agent endpoint configuration", () => {
  it("keeps Scenario Lab independent from the CopilotKit interface", () => {
    expect(createAgentEndpoints("https://workbench.example.test/path")).toEqual(
      {
        agUi: "https://workbench.example.test/api/copilotkit",
        scenarioLab: "https://workbench.example.test/api/dev/scenario-lab",
      },
    );
  });
});
