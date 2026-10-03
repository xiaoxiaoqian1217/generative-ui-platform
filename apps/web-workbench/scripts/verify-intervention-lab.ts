import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  LAB_SCENARIOS,
  runScenario,
} from "../src/features/intervention-lab/scenarios.js";

const output = resolve(
  process.argv[2] ?? "../../docs/validation/intervention-lab/evidence",
);
await mkdir(output, { recursive: true });
const results = LAB_SCENARIOS.map((scenario) => {
  const state = runScenario(scenario);
  const repeated = runScenario(scenario);
  assert.deepEqual(
    state,
    repeated,
    `${scenario.id}: deterministic replay differs`,
  );
  assert.equal(state.phase, "ended", `${scenario.id}: task did not close`);
  assert(
    state.roads.every(
      (road) => road.status !== "unchecked" || road.condition === "unknown",
    ),
  );
  assert(state.logs.every((log) => log.inputProvenance === "fixture-script"));
  return {
    scenarioId: scenario.id,
    inputActions: scenario.steps.map((step) => ({
      ...step.action,
      provenance: "fixture-script",
    })),
    identicalReplaySha256: createHash("sha256")
      .update(JSON.stringify(state))
      .digest("hex"),
    state,
  };
});
await writeFile(
  resolve(output, "model-replays.json"),
  `${JSON.stringify(
    {
      schemaVersion: "intervention-lab-model-verification/v1",
      generatedAt: new Date().toISOString(),
      simulation: true,
      connectedToRealAgent: false,
      connectedToRealDevice: false,
      humanPerformanceEvidence: false,
      driver: "deterministic fixture-script; each case repeated twice",
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${results.length} scenarios closed; repeat hashes identical. Evidence: ${output}`,
);
