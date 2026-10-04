import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const directory = resolve(
  process.argv[2] ??
    resolve(
      repoRoot,
      "docs/validation/intervention-lab/evidence/patent-figures",
    ),
);
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(
  await readFile(resolve(directory, "capture-manifest.json"), "utf8"),
);
assert.equal(manifest.schemaVersion, "intervention-lab-patent-capture/v1");
assert.equal(manifest.completeCaptureSet, true);
assert.equal(manifest.simulation, true);
assert.equal(manifest.connectedToRealDevice, false);
assert.equal(manifest.connectedToRealAgent, false);
assert.equal(manifest.humanPerformanceEvidence, false);
assert.equal(manifest.checkpoints.length, 7);
assert.match(manifest.codeCommitAtCapture, /^[0-9a-f]{40}$/);
for (const source of manifest.appSourceSha256) {
  assert.equal(
    source.sha256,
    sha256(
      execFileSync(
        "git",
        ["show", `${manifest.codeCommitAtCapture}:${source.filename}`],
        {
          cwd: repoRoot,
        },
      ),
    ),
    `${source.filename}: capture source differs from recorded code commit`,
  );
  assert.equal(source.matchesCodeCommit, true);
}
assert.equal(
  manifest.captureTestSha256,
  sha256(
    await readFile(
      resolve(
        repoRoot,
        "apps/web-workbench/tests/e2e/intervention-lab-patent-evidence.spec.ts",
      ),
    ),
  ),
  "Capture test differs from the test recorded in the manifest",
);
const verified = [];
for (const checkpoint of manifest.checkpoints) {
  const screenshot = checkpoint.screenshot;
  const raw = checkpoint.rawExport;
  assert.equal(basename(screenshot.filename), screenshot.filename);
  assert.equal(basename(raw.filename), raw.filename);
  const png = await readFile(resolve(directory, screenshot.filename));
  const rawBytes = await readFile(resolve(directory, raw.filename));
  assert.equal(sha256(png), screenshot.sha256, `${checkpoint.name}: PNG hash`);
  assert.equal(
    sha256(rawBytes),
    raw.sha256,
    `${checkpoint.name}: raw export hash`,
  );
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(
    width,
    Math.round(screenshot.bounds.width * screenshot.deviceScaleFactor),
  );
  assert.equal(
    height,
    Math.round(screenshot.bounds.height * screenshot.deviceScaleFactor),
  );
  assert.equal(screenshot.scope, "unaltered lab element, fitted real viewport");
  assert(
    screenshot.requiredVisibleRegions.some(
      (region: { testId: string }) => region.testId === "lab-simulation-label",
    ),
  );
  for (const region of screenshot.requiredVisibleRegions) {
    const outer = screenshot.bounds;
    const box = region.bounds;
    assert(box.x >= outer.x && box.y >= outer.y);
    assert(box.x + box.width <= outer.x + outer.width);
    assert(box.y + box.height <= outer.y + outer.height);
  }
  const exported = JSON.parse(rawBytes.toString("utf8"));
  const state = exported.state;
  assert.equal(exported.schemaVersion, "intervention-lab-export/v1");
  assert.equal(exported.connectedToRealDevice, false);
  assert.equal(exported.connectedToRealAgent, false);
  for (const field of [
    "scenarioId",
    "displayMode",
    "eventCursor",
    "eventCount",
  ])
    assert.equal(exported[field], checkpoint[field]);
  assert.equal(state.runId, checkpoint.runId);
  assert.equal(state.planVersion, checkpoint.planVersion);
  assert.equal(exported.inputActions.length, checkpoint.inputActionCount);
  assert.deepEqual(exported.inputActions.at(-1), checkpoint.lastAction);
  assert.deepEqual(state.logs.at(-1), checkpoint.lastLog);
  for (const field of ["requests", "constraints", "device", "commands"])
    assert.deepEqual(state[field], checkpoint[field]);
  assert.deepEqual(
    state.roads.map(
      ({ id, version, status, condition }: Record<string, unknown>) => ({
        id,
        version,
        status,
        condition,
      }),
    ),
    checkpoint.roads,
  );
  assert.deepEqual(
    state.steps.map(
      ({ id, roadId, version, status }: Record<string, unknown>) => ({
        id,
        roadId,
        version,
        status,
      }),
    ),
    checkpoint.steps,
  );
  verified.push({
    name: checkpoint.name,
    runId: state.runId,
    rawSha256: raw.sha256,
    screenshotSha256: screenshot.sha256,
    imagePixels: { width, height },
  });
}
for (const group of manifest.groups) {
  const items = manifest.checkpoints.filter(
    (item: { figure: number }) => item.figure === group.figure,
  );
  assert.equal(items.length, group.figure === 4 ? 1 : 3);
  assert.equal(
    new Set(items.map((item: { runId: string }) => item.runId)).size,
    1,
  );
  assert.equal(group.singleRun, true);
  assert.deepEqual(group.runIds, [items[0].runId]);
  if (group.figure === 5) {
    assert.deepEqual(
      items.map(
        (item: { requests: { status: string }[] }) => item.requests[0].status,
      ),
      ["pending", "obsolete", "obsolete"],
    );
    assert.equal(
      new Set(
        items.map(
          (item: { requests: { id: string }[] }) => item.requests[0].id,
        ),
      ).size,
      1,
    );
    assert.equal(
      new Set(
        items.map(
          (item: { requests: { version: number }[] }) =>
            item.requests[0].version,
        ),
      ).size,
      1,
    );
    assert.equal(items[2].lastLog.accepted, false);
  }
  if (group.figure === 6) {
    assert.deepEqual(
      items.map(
        (item: { commands: { status: string }[] }) => item.commands[0].status,
      ),
      ["queued", "sent", "acknowledged"],
    );
    assert.equal(
      new Set(
        items.map(
          (item: { commands: { id: string }[] }) => item.commands[0].id,
        ),
      ).size,
      1,
    );
    assert.deepEqual(
      items.map(
        (item: { device: { execution: string } }) => item.device.execution,
      ),
      ["unknown", "unknown", "paused"],
    );
    assert.deepEqual(
      items.map((item: { device: { link: string } }) => item.device.link),
      ["offline", "online", "online"],
    );
  }
}
await writeFile(
  resolve(directory, "capture-verification-results.json"),
  `${JSON.stringify(
    {
      schemaVersion: "intervention-lab-capture-verification/v1",
      verifiedAt: new Date().toISOString(),
      manifestSha256: sha256(
        await readFile(resolve(directory, "capture-manifest.json")),
      ),
      allMatched: true,
      simulation: true,
      humanPerformanceEvidence: false,
      screenshotTextReadability:
        "Manual visual review is separate; hashes and bounding boxes cannot prove text is readable.",
      verified,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${verified.length} captures match PNG hashes, raw exports, code revision and same-run group bindings.`,
);
