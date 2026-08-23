import { describe, expect, it } from "vitest";
import { loadValidationModelConfig } from "../src/model.js";

describe("validation model configuration", () => {
  it("loads the independent model settings", () => {
    expect(
      loadValidationModelConfig({
        MAP_VALIDATION_LLM_API_KEY: "test-key",
        MAP_VALIDATION_LLM_BASE_URL: "https://models.example.test/v1",
        MAP_VALIDATION_LLM_MODEL: "validation-model",
      }),
    ).toEqual({
      apiKey: "test-key",
      baseUrl: "https://models.example.test/v1",
      model: "validation-model",
    });
  });

  it("does not fall back to presentation or scenario-authoring credentials", () => {
    expect(() =>
      loadValidationModelConfig({
        A2UI_SECONDARY_LLM_API_KEY: "presentation-key",
        SCENARIO_DRAFT_LLM_API_KEY: "authoring-key",
      }),
    ).toThrow("MAP_VALIDATION_LLM_API_KEY_REQUIRED");
  });
});
