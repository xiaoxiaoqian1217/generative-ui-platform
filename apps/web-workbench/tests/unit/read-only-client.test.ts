import { describe, expect, it } from "vitest";
import {
  parseRuntimeCatalogSummary,
  parseRuntimeScenarios,
} from "../../src/runtime/read-only-client.js";

describe("Runtime read-only contract client", () => {
  it("accepts only the public Catalog projection", () => {
    expect(
      parseRuntimeCatalogSummary({
        catalogId: "reference",
        catalogVersion: "1.0.0",
        components: [
          {
            componentType: "Card",
            displayName: "Card",
            description: "Summary",
            category: "common",
            propsSchema: { type: "object" },
            allowedActions: [],
          },
        ],
        actions: [
          {
            actionType: "patrol.confirm",
            description: "Confirm",
            destructive: false,
            requiresConfirmation: true,
          },
        ],
      }),
    ).toMatchObject({
      catalogId: "reference",
      components: [{ componentType: "Card" }],
    });
    expect(
      parseRuntimeCatalogSummary({ catalogId: "reference" }),
    ).toBeUndefined();
  });

  it("rejects malformed Scenario metadata", () => {
    expect(
      parseRuntimeScenarios({
        scenarios: [
          {
            scenarioId: "devices",
            version: "1.0",
            description: "Devices",
            examples: ["status"],
            available: true,
          },
        ],
      }),
    ).toHaveLength(1);
    expect(
      parseRuntimeScenarios({ scenarios: [{ scenarioId: "devices" }] }),
    ).toBeUndefined();
  });
});
