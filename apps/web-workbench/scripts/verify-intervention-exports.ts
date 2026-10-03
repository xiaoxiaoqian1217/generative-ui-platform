import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createInitialState,
  dispatchLabAction,
  type LabAction,
  type LabState,
} from "../src/features/intervention-lab/model.js";

const directory = resolve(
  process.argv[2] ?? "../../docs/validation/intervention-lab/evidence",
);
const results = [];
for (const filename of (await readdir(directory))
  .filter((name) => name.endsWith(".json"))
  .sort()) {
  const exported = JSON.parse(
    await readFile(resolve(directory, filename), "utf8"),
  ) as {
    schemaVersion?: string;
    inputActions?: LabAction[];
    state?: LabState;
    verificationDriver?: string;
  };
  if (exported.schemaVersion !== "intervention-lab-export/v1") continue;
  assert(
    exported.inputActions && exported.state,
    `${filename}: missing raw actions or state`,
  );
  const replayed = exported.inputActions.reduce(
    dispatchLabAction,
    createInitialState(exported.state.runId),
  );
  assert.deepEqual(
    replayed,
    exported.state,
    `${filename}: exported state cannot be reproduced from its raw actions`,
  );
  results.push({
    filename,
    actionCount: exported.inputActions.length,
    driver: exported.verificationDriver,
    identicalStateSha256: createHash("sha256")
      .update(JSON.stringify(replayed))
      .digest("hex"),
  });
}
assert(results.length > 0, "No exported runs found");
await writeFile(
  resolve(directory, "export-replay-results.json"),
  `${JSON.stringify(
    {
      schemaVersion: "intervention-lab-export-replay/v1",
      generatedAt: new Date().toISOString(),
      simulation: true,
      humanPerformanceEvidence: false,
      allMatched: true,
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${results.length} raw exports replayed; all complete states identical.`,
);
