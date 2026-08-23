import { describe, expect, it } from "vitest";
import { createMapValidationSystemPrompt } from "../src/prompt.js";
import { loadValidationScenarioInput } from "../src/scenario-loader.js";

describe("map validation prompt", () => {
  it("grounds decisions in scenario input without embedding a fixed script", async () => {
    const scenario = await loadValidationScenarioInput(
      "north-corridor-overview-v1",
    );
    const prompt = createMapValidationSystemPrompt(scenario);

    expect(prompt).toContain("only source of business facts");
    expect(prompt).toContain("Tool Result is the sole evidence");
    expect(prompt).toContain(JSON.stringify(scenario));
    expect(prompt).not.toContain(
      "setLayerVisibility -> focusOn -> highlight -> previewPath",
    );
    expect(prompt).not.toContain("Chain-of-Thought");
  });
});
