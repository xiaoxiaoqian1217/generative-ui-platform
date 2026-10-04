import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const directory = resolve(
  process.argv[2] ??
    resolve(
      repoRoot,
      "docs/validation/intervention-lab/evidence/collaboration-v2",
    ),
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(
  await readFile(resolve(directory, "capture-manifest.json"), "utf8"),
);
assert.equal(
  manifest.schemaVersion,
  "intervention-lab-collaboration-capture/v2",
);
assert.equal(manifest.completeCaptureSet, true);
assert.equal(manifest.humanPerformanceEvidence, false);
assert.equal(manifest.checkpoints.length, 9);
assert.equal(manifest.checkpoints.filter((item) => item.screenshot).length, 8);

const sourceResults = [];
for (const source of manifest.appSourceSha256) {
  const actual = sha256(await readFile(resolve(repoRoot, source.filename)));
  assert.equal(
    actual,
    source.sha256,
    `${source.filename}: source changed since capture`,
  );
  sourceResults.push({
    filename: source.filename,
    sha256: actual,
    workingBytesMatched: true,
  });
}
assert.equal(
  sha256(
    await readFile(
      resolve(
        repoRoot,
        "apps/web-workbench/tests/e2e/intervention-lab-collaboration.spec.ts",
      ),
    ),
  ),
  manifest.captureTestSha256,
  "Capture test changed since capture",
);

const results = [];
for (const checkpoint of manifest.checkpoints) {
  const rawBytes = await readFile(
    resolve(directory, checkpoint.rawExport.filename),
  );
  assert.equal(sha256(rawBytes), checkpoint.rawExport.sha256);
  const exported = JSON.parse(rawBytes.toString("utf8"));
  assert.equal(exported.experiment, "deterministic-simulation");
  assert.equal(exported.connectedToRealDevice, false);
  assert.equal(exported.connectedToRealAgent, false);
  assert.equal(exported.state.runId, checkpoint.runId);
  assert.equal(exported.scenarioId, checkpoint.scenarioId);
  assert.equal(exported.eventCursor, checkpoint.eventCursor);
  assert.equal(exported.state.planVersion, checkpoint.planVersion);
  assert.equal(exported.inputActions.length, checkpoint.inputActionCount);
  assert.equal(exported.inputActions.length, exported.state.logs.length);
  assert.deepEqual(exported.inputActions.at(-1), checkpoint.lastAction);
  assert.deepEqual(exported.state.logs.at(-1), checkpoint.lastLog);
  for (const key of ["collaboration", "roads", "steps", "requests"])
    assert.deepEqual(exported.state[key], checkpoint[key]);
  assert.equal(
    sha256(JSON.stringify(exported.state)),
    checkpoint.replay.stateSha256,
  );
  assert.equal(checkpoint.replay.fullStateMatched, true);
  let dimensions = null;
  if (checkpoint.screenshot) {
    const screenshot = checkpoint.screenshot;
    const png = await readFile(resolve(directory, screenshot.filename));
    assert.equal(sha256(png), screenshot.sha256);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    dimensions = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    assert.equal(
      dimensions.width,
      Math.round(screenshot.bounds.width * screenshot.deviceScaleFactor),
    );
    assert.equal(
      dimensions.height,
      Math.round(screenshot.bounds.height * screenshot.deviceScaleFactor),
    );
    for (const region of screenshot.requiredVisibleRegions) {
      assert(
        region.text?.trim(),
        `${checkpoint.name}/${region.testId}: empty region`,
      );
      assert(region.bounds.x >= screenshot.bounds.x);
      assert(region.bounds.y >= screenshot.bounds.y);
      assert(
        region.bounds.x + region.bounds.width <=
          screenshot.bounds.x + screenshot.bounds.width,
      );
      assert(
        region.bounds.y + region.bounds.height <=
          screenshot.bounds.y + screenshot.bounds.height,
      );
    }
  }
  results.push({
    name: checkpoint.name,
    runId: checkpoint.runId,
    rawExportMatchedCapture: true,
    pngHashAndDimensionsMatched: checkpoint.screenshot ? true : null,
    dimensions,
    fullStateReplayAssertedByBrowserTest: true,
  });
}
for (const group of manifest.groups) {
  const records = manifest.checkpoints.filter(
    (item) => item.group === group.group,
  );
  const runIds = [...new Set(records.map((item) => item.runId))];
  assert.equal(runIds.length, 1);
  assert.deepEqual(runIds, group.runIds);
  assert.equal(records.length, group.checkpointCount);
}
await writeFile(
  resolve(directory, "capture-verification-results.json"),
  `${JSON.stringify(
    {
      schemaVersion: "intervention-lab-collaboration-verification/v2",
      generatedAt: new Date().toISOString(),
      simulation: true,
      humanPerformanceEvidence: false,
      allMatched: true,
      screenshotCount: 8,
      rawExportCount: 9,
      sourceResults,
      groups: manifest.groups,
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(
  "9 raw exports and 8 PNG hashes/dimensions match the capture manifest; working source bytes unchanged.",
);
