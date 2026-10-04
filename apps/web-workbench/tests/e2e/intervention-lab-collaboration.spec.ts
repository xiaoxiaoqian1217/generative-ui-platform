import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import {
  createInitialState,
  dispatchLabAction,
  type LabAction,
  type LabState,
} from "../../src/features/intervention-lab/model.js";
import { LAB_SCENARIOS } from "../../src/features/intervention-lab/scenarios.js";

// These checks drive only visible application controls. Fixtures supply simulated
// execution feedback; they never provide the operator's point or priority choice.
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const evidenceRoot = resolve(
  process.env.INTERVENTION_LAB_COLLABORATION_EVIDENCE_DIR ??
    resolve(repoRoot, "apps/web-workbench/test-results/collaboration-v2"),
);
const sourceFiles = [
  "apps/web-workbench/src/features/intervention-lab/InterventionLabPage.vue",
  "apps/web-workbench/src/features/intervention-lab/model.ts",
  "apps/web-workbench/src/features/intervention-lab/scenarios.ts",
  "apps/web-workbench/src/features/intervention-lab/intervention-lab.css",
];
const checkpoints: Record<string, unknown>[] = [];
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

interface ExportedRun {
  schemaVersion: string;
  experiment: string;
  connectedToRealDevice: boolean;
  connectedToRealAgent: boolean;
  scenarioId: string;
  eventCursor: number;
  eventCount: number;
  state: LabState;
  inputActions: LabAction[];
}

async function stateOf(page: Page): Promise<LabState> {
  return JSON.parse(await page.getByTestId("lab-state-json").inputValue());
}

async function begin(page: Page, scenarioId: string): Promise<void> {
  await page.setViewportSize({ width: 1480, height: 1850 });
  await page.goto("/intervention-lab");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("lab-simulation-label")).toContainText(
    "未连接真实设备或 LLM",
  );
  await page.getByTestId("lab-scenario-select").selectOption(scenarioId);
  await page.getByTestId("lab-start").click();
  await expect(page.getByTestId("lab-continuous-panel")).toBeVisible();
}

async function advanceUntil(
  page: Page,
  predicate: (state: LabState) => boolean,
  description: string,
): Promise<LabState> {
  for (let count = 0; count < 45; count += 1) {
    const state = await stateOf(page);
    if (predicate(state)) return state;
    expect(state.phase, description).not.toBe("ended");
    expect(
      state.requests.filter((item) => item.status === "pending"),
      `Unanswered request must not be skipped while seeking ${description}`,
    ).toEqual([]);
    await expect(page.getByTestId("lab-next")).toBeEnabled();
    await page.getByTestId("lab-next").click();
  }
  throw new Error(`${description} did not occur within 45 visible events`);
}

async function capture(
  page: Page,
  name: string,
  group: string,
  requiredTestIds: string[],
  testInfo: TestInfo,
  screenshot = true,
): Promise<ExportedRun> {
  await mkdir(evidenceRoot, { recursive: true });
  const state = await stateOf(page);
  const lab = page.getByTestId("intervention-lab");
  let bounds = (await lab.boundingBox())!;
  const viewport = page.viewportSize()!;
  if (bounds.y + bounds.height + 24 > viewport.height) {
    await page.setViewportSize({
      width: viewport.width,
      height: Math.ceil(bounds.y + bounds.height + 24),
    });
  }
  await lab.scrollIntoViewIfNeeded();
  bounds = (await lab.boundingBox())!;
  const fittedViewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(fittedViewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(fittedViewport.height);
  const regions = [];
  for (const testId of ["lab-simulation-label", ...requiredTestIds]) {
    const locator = page.getByTestId(testId);
    await expect(locator).toBeVisible();
    const box = (await locator.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.y).toBeGreaterThanOrEqual(bounds.y);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    regions.push({ testId, bounds: box, text: await locator.textContent() });
  }
  const screenshotName = `${name}.png`;
  const screenshotPath = resolve(evidenceRoot, screenshotName);
  const captureStartedAt = new Date().toISOString();
  const noticeAtCapture = await page.getByTestId("lab-notice").innerText();
  if (screenshot) {
    await lab.screenshot({ path: screenshotPath, animations: "disabled" });
    await testInfo.attach(name, {
      path: screenshotPath,
      contentType: "image/png",
    });
  }
  const captureCompletedAt = new Date().toISOString();
  expect(await stateOf(page)).toEqual(state);

  // Save the actual downloaded bytes. Provenance and screenshot metadata are kept
  // in a separate manifest rather than inserted into the application's raw export.
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("lab-export").click();
  const download = await downloadPromise;
  const rawName = `${name}.json`;
  const rawPath = resolve(evidenceRoot, rawName);
  await download.saveAs(rawPath);
  const rawBytes = await readFile(rawPath);
  const exported: ExportedRun = JSON.parse(rawBytes.toString("utf8"));
  expect(exported.experiment).toBe("deterministic-simulation");
  expect(exported.connectedToRealDevice).toBe(false);
  expect(exported.connectedToRealAgent).toBe(false);
  expect(exported.state).toEqual(state);
  expect(await stateOf(page)).toEqual(state);
  expect(exported.inputActions).toHaveLength(state.logs.length);
  const scenario = LAB_SCENARIOS.find(
    (item) => item.id === exported.scenarioId,
  )!;
  const replayed = exported.inputActions.reduce(
    dispatchLabAction,
    createInitialState(state.runId, scenario.collaboration),
  );
  expect(replayed).toEqual(state);
  await testInfo.attach(`${name}-raw`, {
    path: rawPath,
    contentType: "application/json",
  });
  checkpoints.push({
    name,
    group,
    scenarioId: exported.scenarioId,
    runId: state.runId,
    eventCursor: exported.eventCursor,
    eventCount: exported.eventCount,
    inputActionCount: exported.inputActions.length,
    lastAction: exported.inputActions.at(-1),
    lastLog: state.logs.at(-1),
    planVersion: state.planVersion,
    collaboration: state.collaboration,
    roads: state.roads,
    steps: state.steps,
    requests: state.requests,
    verificationDriver: "playwright-automated-visible-controls",
    humanPerformanceEvidence: false,
    captureStartedAt,
    captureCompletedAt,
    captureOrder:
      "screenshot-before-raw-download; no application state mutation",
    noticeAtCapture,
    browserVersion: page.context().browser()!.version(),
    screenshot: screenshot
      ? {
          filename: screenshotName,
          sha256: sha256(await readFile(screenshotPath)),
          scope: "unaltered complete lab element in fitted real viewport",
          bounds,
          viewport: fittedViewport,
          deviceScaleFactor: await page.evaluate(() => window.devicePixelRatio),
          requiredVisibleRegions: regions,
        }
      : null,
    rawExport: { filename: rawName, sha256: sha256(rawBytes) },
    replay: {
      fullStateMatched: true,
      initialCollaborationMode: scenario.collaboration,
      stateSha256: sha256(JSON.stringify(replayed)),
    },
  });
  return exported;
}

test.afterAll(async () => {
  const hashes = [];
  for (const filename of sourceFiles) {
    const hash = sha256(await readFile(resolve(repoRoot, filename)));
    hashes.push({
      filename,
      sha256: hash,
      matchesCodeCommit:
        hash ===
        sha256(
          execFileSync("git", ["show", `HEAD:${filename}`], { cwd: repoRoot }),
        ),
    });
  }
  const groups = [
    "observation-input",
    "active-priority",
    "default-priority",
  ].map((group) => {
    const records = checkpoints.filter((item) => item.group === group);
    const runIds = [...new Set(records.map((item) => item.runId))];
    return {
      group,
      checkpointCount: records.length,
      runIds,
      singleRun: runIds.length === 1,
    };
  });
  let fonts = "Not probed: fc-list is Linux-specific";
  if (process.platform === "linux") {
    try {
      fonts = execFileSync("fc-list", [":lang=zh", "file", "family"], {
        encoding: "utf8",
      }).trim();
    } catch {
      fonts = "Not probed: fc-list unavailable";
    }
  }
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    resolve(evidenceRoot, "capture-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "intervention-lab-collaboration-capture/v2",
        generatedAt: new Date().toISOString(),
        codeCommitAtCapture: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim(),
        appSourceSha256: hashes,
        captureTestSha256: sha256(
          await readFile(fileURLToPath(import.meta.url)),
        ),
        platform: process.platform,
        availableChineseFonts: fonts,
        completeCaptureSet:
          checkpoints.length === 9 &&
          groups.every((group) => group.singleRun) &&
          checkpoints.filter((item) => item.screenshot !== null).length === 8,
        simulation: true,
        connectedToRealDevice: false,
        connectedToRealAgent: false,
        verificationDriver: "playwright-automated-visible-controls",
        humanPerformanceEvidence: false,
        outcomeInterpretation:
          "Functional state writeback and deterministic continuation only; no participant performance or real device/LLM capability measurement.",
        groups,
        checkpoints,
      },
      null,
      2,
    )}\n`,
  );
});

test("Agent requests a point; empty answer is rejected and selected input affects only later simulated feedback", async ({
  page,
}, testInfo) => {
  await begin(page, "observation-cooperation");
  const pending = await advanceUntil(
    page,
    (state) => state.requests.some((item) => item.status === "pending"),
    "observation point request",
  );
  const request = pending.requests.find((item) => item.status === "pending")!;
  expect(pending.collaboration?.observationInput?.status).toBe("requested");
  expect(pending.roads.find((item) => item.id === "r-a")).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  await expect(page.getByTestId("lab-autoplay")).toBeDisabled();
  await capture(
    page,
    "observation-request-pending",
    "observation-input",
    [
      "lab-continuous-panel",
      `lab-request-${request.id}`,
      "lab-observation-input",
    ],
    testInfo,
  );
  const cursorBefore = await page
    .getByTestId("lab-next")
    .getAttribute("data-cursor");
  await page.getByTestId("lab-submit-observation").click();
  const rejected = await stateOf(page);
  expect(rejected.logs.at(-1)).toMatchObject({
    actionType: "respond",
    accepted: false,
    inputProvenance: "interactive",
  });
  expect(rejected.requests.find((item) => item.id === request.id)?.status).toBe(
    "pending",
  );
  expect(rejected.collaboration).toEqual(pending.collaboration);
  expect(rejected.roads).toEqual(pending.roads);
  expect(rejected.steps).toEqual(pending.steps);
  expect(rejected.device).toEqual(pending.device);
  expect(rejected.planVersion).toBe(pending.planVersion);
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  expect(await page.getByTestId("lab-next").getAttribute("data-cursor")).toBe(
    cursorBefore,
  );
  await capture(
    page,
    "observation-empty-response-rejected",
    "observation-input",
    [
      "lab-continuous-panel",
      `lab-request-${request.id}`,
      "lab-observation-input",
      "lab-notice",
    ],
    testInfo,
  );

  await page.getByTestId("lab-observation-point").selectOption("point-a-north");
  await page.getByTestId("lab-submit-observation").click();
  const provided = await stateOf(page);
  expect(provided.requests.find((item) => item.id === request.id)?.status).toBe(
    "resolved",
  );
  expect(provided.collaboration?.observationInput).toMatchObject({
    status: "provided",
    selectedPointId: "point-a-north",
  });
  expect(provided.collaboration?.contributions).toHaveLength(1);
  expect(provided.logs.at(-1)).toMatchObject({
    actionType: "respond",
    accepted: true,
    inputProvenance: "interactive",
  });
  expect(provided.roads).toEqual(pending.roads);
  expect(provided.device.position).toEqual(pending.device.position);
  expect(provided.steps.find((item) => item.id === "s-a")?.status).not.toBe(
    "completed",
  );
  await expect(page.getByTestId("lab-next")).toBeEnabled();
  await capture(
    page,
    "observation-parameter-applied",
    "observation-input",
    [
      "lab-continuous-panel",
      "lab-observation-input",
      "lab-contributions",
      "lab-map-facts",
    ],
    testInfo,
  );

  const observed = await advanceUntil(
    page,
    (state) =>
      state.roads.find((item) => item.id === "r-a")?.status === "observed",
    "first simulated observation using the chosen point",
  );
  expect(observed.steps.find((item) => item.id === "s-a")?.status).toBe(
    "running",
  );
  expect(
    observed.roads.find((item) => item.id === "r-a")?.evidence[0]?.detail,
  ).toContain("point-a-north");
  const selectedPoint = observed.collaboration?.observationInput?.points.find(
    (item) => item.id === "point-a-north",
  )!;
  expect(observed.device.position).toEqual(selectedPoint.position);
  expect(observed.logs.at(-1)).toMatchObject({
    actionType: "observe-current-road",
    inputProvenance: "fixture-event",
    accepted: true,
  });
  const final = await advanceUntil(
    page,
    (state) => state.phase === "ended",
    "task completion",
  );
  expect(final.outcome).toBe("complete");
  expect(final.collaboration?.executionOrder).toEqual(["s-a", "s-b", "s-c"]);
  expect(final.roads.every((item) => item.status === "observed")).toBe(true);
  expect(final.steps.every((item) => item.status === "completed")).toBe(true);
  const exported = await capture(
    page,
    "observation-feedback-received",
    "observation-input",
    ["lab-continuous-panel", "lab-contributions", "lab-outcome"],
    testInfo,
  );
  expect(
    exported.inputActions.filter((action) => action.type === "respond"),
  ).toHaveLength(2);
  expect(
    final.logs
      .filter((log) => log.actionType === "respond")
      .every((log) => log.inputProvenance === "interactive"),
  ).toBe(true);
});

test("human priority during A changes actual next execution to C and preserves all three observations", async ({
  page,
}, testInfo) => {
  await begin(page, "priority-cooperation");
  const runningA = await advanceUntil(
    page,
    (state) =>
      state.steps.find((item) => item.id === "s-a")?.status === "running",
    "A running before a human adjustment",
  );
  expect(runningA.collaboration?.stepOrder).toEqual(["s-a", "s-b", "s-c"]);
  expect(runningA.collaboration?.executionOrder).toEqual(["s-a"]);
  await capture(
    page,
    "priority-before-adjustment",
    "active-priority",
    ["lab-continuous-panel", "lab-step-order", "lab-priority-step"],
    testInfo,
  );

  await page.getByTestId("lab-priority-step").selectOption("s-c");
  await page.getByTestId("lab-prioritize").click();
  const changed = await stateOf(page);
  expect(changed.planVersion).toBe(runningA.planVersion + 1);
  expect(changed.collaboration?.stepOrder).toEqual(["s-a", "s-c", "s-b"]);
  expect(changed.collaboration?.executionOrder).toEqual(["s-a"]);
  expect(changed.collaboration?.contributions).toHaveLength(1);
  expect(changed.steps.find((item) => item.id === "s-a")?.status).toBe(
    "running",
  );
  expect(changed.roads).toEqual(runningA.roads);
  expect(changed.device).toEqual(runningA.device);
  expect(changed.logs.at(-1)).toMatchObject({
    actionType: "prioritize-step",
    accepted: true,
    inputProvenance: "interactive",
  });
  const stepCLabel = changed.steps.find((item) => item.id === "s-c")!.label;
  await expect(page.getByTestId("lab-next-scheduled-step")).toContainText(
    stepCLabel,
  );
  await capture(
    page,
    "priority-adjustment-applied",
    "active-priority",
    [
      "lab-continuous-panel",
      "lab-step-order",
      "lab-next-scheduled-step",
      "lab-contributions",
    ],
    testInfo,
  );

  const runningC = await advanceUntil(
    page,
    (state) =>
      state.steps.find((item) => item.id === "s-c")?.status === "running",
    "C actually started next",
  );
  expect(runningC.steps.find((item) => item.id === "s-a")?.status).toBe(
    "completed",
  );
  expect(runningC.steps.find((item) => item.id === "s-b")?.status).toBe(
    "pending",
  );
  expect(runningC.collaboration?.executionOrder).toEqual(["s-a", "s-c"]);
  expect(runningC.roads.find((item) => item.id === "r-c")).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  await expect(page.getByTestId("lab-current-step")).toContainText(stepCLabel);
  await capture(
    page,
    "priority-next-C-running",
    "active-priority",
    [
      "lab-continuous-panel",
      "lab-step-order",
      "lab-step-s-c",
      "lab-contributions",
    ],
    testInfo,
  );

  const final = await advanceUntil(
    page,
    (state) => state.phase === "ended",
    "priority task completion",
  );
  expect(final.outcome).toBe("complete");
  expect(final.collaboration?.executionOrder).toEqual(["s-a", "s-c", "s-b"]);
  expect(final.roads.every((item) => item.status === "observed")).toBe(true);
  expect(final.steps.every((item) => item.status === "completed")).toBe(true);
  const exported = await capture(
    page,
    "priority-completed",
    "active-priority",
    [
      "lab-continuous-panel",
      "lab-step-order",
      "lab-outcome",
      "lab-contributions",
    ],
    testInfo,
  );
  expect(
    exported.inputActions.filter((action) => action.type === "prioritize-step"),
  ).toHaveLength(1);
});

test("without a human priority change the same scheduler executes A then B then C", async ({
  page,
}, testInfo) => {
  await begin(page, "priority-cooperation");
  const runningB = await advanceUntil(
    page,
    (state) =>
      state.steps.find((item) => item.id === "s-b")?.status === "running",
    "unchanged plan starts B next",
  );
  expect(runningB.collaboration?.executionOrder).toEqual(["s-a", "s-b"]);
  expect(runningB.steps.find((item) => item.id === "s-c")?.status).toBe(
    "pending",
  );
  const final = await advanceUntil(
    page,
    (state) => state.phase === "ended",
    "unchanged plan completion",
  );
  expect(final.outcome).toBe("complete");
  expect(final.collaboration?.executionOrder).toEqual(["s-a", "s-b", "s-c"]);
  expect(final.collaboration?.contributions).toEqual([]);
  const exported = await capture(
    page,
    "priority-default-order-completed",
    "default-priority",
    ["lab-continuous-panel", "lab-step-order", "lab-outcome"],
    testInfo,
    false,
  );
  expect(
    exported.inputActions.filter((action) => action.type === "prioritize-step"),
  ).toEqual([]);
});
