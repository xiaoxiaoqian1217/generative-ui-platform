import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadValidationScenario,
  loadValidationScenarioInput,
} from "../src/scenario-loader.js";

describe("validation scenario loader", () => {
  it("loads each versioned scenario by its exact id", async () => {
    for (const scenarioId of [
      "north-corridor-overview-v1",
      "north-corridor-route-choice-v1",
      "north-corridor-route-choice-reversed-v1",
    ]) {
      const scenario = await loadValidationScenario(scenarioId);
      expect(scenario.input).toMatchObject({ scenarioId, version: "1" });
    }
  });

  it("returns only input to the Agent boundary", async () => {
    const scenario = await loadValidationScenario(
      "north-corridor-route-choice-v1",
    );
    const input = await loadValidationScenarioInput(
      "north-corridor-route-choice-v1",
    );

    expect(input).toEqual(scenario.input);
    expect(input).not.toHaveProperty("expected");
    expect(JSON.stringify(input)).not.toContain("forbiddenBehaviors");
  });

  it("rejects unknown, unsafe, and invalid scenario ids", async () => {
    await expect(
      loadValidationScenario("north-corridor-unknown-v1"),
    ).rejects.toThrow("VALIDATION_SCENARIO_NOT_FOUND");
    await expect(loadValidationScenario("../secrets-v1")).rejects.toThrow(
      "VALIDATION_SCENARIO_ID_INVALID",
    );

    const directory = await mkdtemp(join(tmpdir(), "validation-scenario-"));
    await writeFile(
      join(directory, "invalid-scenario-v1.json"),
      JSON.stringify({ input: {}, expected: {} }),
      "utf8",
    );
    await expect(
      loadValidationScenario("invalid-scenario-v1", {
        scenariosDir: pathToFileURL(`${directory}/`),
      }),
    ).rejects.toThrow("VALIDATION_SCENARIO_INVALID");
  });
});
