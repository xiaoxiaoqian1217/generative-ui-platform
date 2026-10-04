import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import type { LabState } from "../../src/features/intervention-lab/model.js";

// Capture evidence from visible controls; never assign component state or alter page styling.
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const evidenceRoot = resolve(
  process.env.INTERVENTION_LAB_PATENT_EVIDENCE_DIR ??
    resolve(
      repoRoot,
      "docs/validation/intervention-lab/evidence/patent-figures",
    ),
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

function chineseFonts(): string {
  if (process.platform !== "linux")
    return "Not probed: fc-list is Linux-specific";
  try {
    return execFileSync("fc-list", [":lang=zh", "file", "family"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "Not probed: fc-list unavailable";
  }
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
}

async function advanceToRequest(page: Page) {
  for (let count = 0; count < 20; count += 1) {
    const request = (await stateOf(page)).requests.find(
      (item) => item.status === "pending",
    );
    if (request) return request;
    await expect(page.getByTestId("lab-next")).toBeEnabled();
    await page.getByTestId("lab-next").click();
  }
  throw new Error("No pending request within 20 visible fixture events");
}

async function capture(
  page: Page,
  name: string,
  figure: number,
  requiredTestIds: string[],
  testInfo: TestInfo,
): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const state = await stateOf(page);
  const lab = page.getByTestId("intervention-lab");
  let bounds = (await lab.boundingBox())!;
  // The application has an internal scroll container. Fit its real content inside the
  // viewport, without replacing DOM, hiding cards, changing CSS or compositing images.
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
  await lab.screenshot({ path: screenshotPath, animations: "disabled" });
  const captureCompletedAt = new Date().toISOString();
  expect(await stateOf(page)).toEqual(state);

  // Preserve the actual downloaded bytes; all driver/provenance metadata stays outside
  // this raw export. Export updates the UI notice and telemetry, not the model state.
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("lab-export").click();
  const download = await downloadPromise;
  const rawName = `${name}.json`;
  const rawPath = resolve(evidenceRoot, rawName);
  await download.saveAs(rawPath);
  const rawBytes = await readFile(rawPath);
  const exported = JSON.parse(rawBytes.toString("utf8"));
  expect(exported.connectedToRealDevice).toBe(false);
  expect(exported.connectedToRealAgent).toBe(false);
  expect(exported.state).toEqual(state);
  expect(exported.inputActions).toHaveLength(state.logs.length);
  expect(exported.scenarioId).toBe(
    await page.getByTestId("lab-scenario-select").inputValue(),
  );
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${name}-raw`, {
    path: rawPath,
    contentType: "application/json",
  });
  checkpoints.push({
    name,
    figure,
    scenarioId: exported.scenarioId,
    runId: state.runId,
    displayMode: exported.displayMode,
    eventCursor: exported.eventCursor,
    eventCount: exported.eventCount,
    inputActionCount: exported.inputActions.length,
    lastAction: exported.inputActions.at(-1),
    lastLog: state.logs.at(-1),
    planVersion: state.planVersion,
    roads: state.roads.map(({ id, version, status, condition }) => ({
      id,
      version,
      status,
      condition,
    })),
    steps: state.steps.map(({ id, roadId, version, status }) => ({
      id,
      roadId,
      version,
      status,
    })),
    requests: state.requests,
    constraints: state.constraints,
    device: state.device,
    commands: state.commands,
    verificationDriver: "playwright-automated-clicks",
    humanPerformanceEvidence: false,
    captureStartedAt,
    captureCompletedAt,
    rawExportDownloadedAt: new Date().toISOString(),
    captureOrder:
      "screenshot-before-download; export changes notice and telemetry only",
    noticeAtCapture,
    browserVersion: page.context().browser()!.version(),
    route: new URL(page.url()).pathname,
    screenshot: {
      filename: screenshotName,
      sha256: sha256(await readFile(screenshotPath)),
      scope: "unaltered lab element, fitted real viewport",
      bounds,
      viewport: fittedViewport,
      deviceScaleFactor: await page.evaluate(() => window.devicePixelRatio),
      requiredVisibleRegions: regions,
    },
    rawExport: { filename: rawName, sha256: sha256(rawBytes) },
  });
}

test.afterAll(async () => {
  const hashes = [];
  for (const filename of sourceFiles)
    hashes.push({
      filename,
      sha256: sha256(await readFile(resolve(repoRoot, filename))),
      matchesCodeCommit:
        sha256(await readFile(resolve(repoRoot, filename))) ===
        sha256(
          execFileSync("git", ["show", `HEAD:${filename}`], { cwd: repoRoot }),
        ),
    });
  const groups = [4, 5, 6].map((figure) => {
    const records = checkpoints.filter((item) => item.figure === figure);
    const runIds = [...new Set(records.map((item) => item.runId))];
    return {
      figure,
      checkpointCount: records.length,
      runIds,
      singleRun: runIds.length === 1,
    };
  });
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    resolve(evidenceRoot, "capture-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "intervention-lab-patent-capture/v1",
        generatedAt: new Date().toISOString(),
        codeCommitAtCapture: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim(),
        appSourceSha256: hashes,
        platform: process.platform,
        availableChineseFonts: chineseFonts(),
        completeCaptureSet:
          checkpoints.length === 7 && groups.every((group) => group.singleRun),
        captureTestSha256: sha256(
          await readFile(
            resolve(
              repoRoot,
              "apps/web-workbench/tests/e2e/intervention-lab-patent-evidence.spec.ts",
            ),
          ),
        ),
        simulation: true,
        connectedToRealDevice: false,
        connectedToRealAgent: false,
        verificationDriver: "playwright-automated-clicks",
        humanPerformanceEvidence: false,
        note: "All screenshots show real locally simulated UI states. Schematic figures derived from these may omit styling, but must not add implementation facts. Screenshot capture precedes the raw export; export updates only the notice and telemetry.",
        groups,
        checkpoints,
      },
      null,
      2,
    )}\n`,
  );
});

test("patent figure 4: navigation failure keeps road unknown and exposes its linked choice and step", async ({
  page,
}, testInfo) => {
  await begin(page, "navigation-failure");
  const request = await advanceToRequest(page);
  const state = await stateOf(page);
  expect(request.type).toBe("choice");
  expect(request.roadIds).toEqual(["r-b"]);
  expect(request.stepIds).toEqual(["s-b"]);
  expect(state.roads.find((item) => item.id === "r-b")).toMatchObject({
    condition: "unknown",
    status: "unchecked",
  });
  expect(state.steps.find((item) => item.id === "s-b")?.status).toBe("failed");
  await capture(
    page,
    "figure-4-choice-pending",
    4,
    ["lab-map", "lab-map-facts", "lab-task-state", `lab-request-${request.id}`],
    testInfo,
  );
});

test("patent figure 5: active constraint obsoletes the same request and rejects its old response", async ({
  page,
}, testInfo) => {
  await begin(page, "constraint-stale");
  const request = await advanceToRequest(page);
  const before = await stateOf(page);
  await capture(
    page,
    "figure-5-before-constraint",
    5,
    ["lab-task-state", "lab-active-constraint", `lab-request-${request.id}`],
    testInfo,
  );
  await page.getByTestId("lab-constraint-road").selectOption("r-b");
  await page.getByTestId("lab-add-constraint").click();
  const constrained = await stateOf(page);
  expect(constrained.runId).toBe(before.runId);
  expect(
    constrained.requests.find((item) => item.id === request.id)?.status,
  ).toBe("obsolete");
  expect(constrained.steps.find((item) => item.id === "s-b")?.status).toBe(
    "cancelled",
  );
  expect(constrained.roads.find((item) => item.id === "r-a")?.evidence).toEqual(
    before.roads.find((item) => item.id === "r-a")?.evidence,
  );
  await capture(
    page,
    "figure-5-after-constraint",
    5,
    [
      "lab-task-state",
      "lab-active-constraint",
      `lab-history-${request.id}`,
      "lab-notice",
      "lab-logs",
    ],
    testInfo,
  );
  await page.getByTestId(`lab-stale-${request.id}`).click();
  const rejected = await stateOf(page);
  expect(rejected.logs.at(-1)).toMatchObject({
    actionType: "respond",
    accepted: false,
  });
  expect(rejected.runId).toBe(before.runId);
  expect(rejected.steps).toEqual(constrained.steps);
  expect(rejected.roads).toEqual(constrained.roads);
  expect(rejected.constraints).toEqual(constrained.constraints);
  expect(rejected.planVersion).toBe(constrained.planVersion);
  await capture(
    page,
    "figure-5-old-response-rejected",
    5,
    ["lab-task-state", `lab-history-${request.id}`, "lab-notice", "lab-logs"],
    testInfo,
  );
});

test("patent figure 6: one pause command passes queued and sent before matching ACK confirms pause", async ({
  page,
}, testInfo) => {
  await begin(page, "link-command-ack");
  const request = await advanceToRequest(page);
  await page.getByTestId(`lab-response-${request.id}-pause`).click();
  const queued = await stateOf(page);
  const command = queued.commands[0]!;
  expect(command.status).toBe("queued");
  expect(queued.device).toMatchObject({
    link: "offline",
    execution: "unknown",
  });
  await capture(
    page,
    "figure-6-command-queued",
    6,
    ["lab-device-state", `lab-command-${command.id}`, "lab-map-position"],
    testInfo,
  );
  await page.getByTestId("lab-next").click();
  const sent = await stateOf(page);
  expect(sent.commands[0]).toMatchObject({ id: command.id, status: "sent" });
  expect(sent.device).toMatchObject({ link: "online", execution: "unknown" });
  expect(sent.device.position).toEqual(queued.device.position);
  expect(sent.device.lastConfirmedAt).toBe(queued.device.lastConfirmedAt);
  await capture(
    page,
    "figure-6-command-sent-awaiting-ack",
    6,
    ["lab-device-state", `lab-command-${command.id}`, "lab-map-position"],
    testInfo,
  );
  await page.getByTestId("lab-next").click();
  const acknowledged = await stateOf(page);
  expect(acknowledged.commands[0]).toMatchObject({
    id: command.id,
    status: "acknowledged",
  });
  expect(acknowledged.device).toMatchObject({
    link: "online",
    execution: "paused",
  });
  expect(acknowledged.runId).toBe(queued.runId);
  await capture(
    page,
    "figure-6-command-acknowledged",
    6,
    ["lab-device-state", `lab-command-${command.id}`, "lab-map-position"],
    testInfo,
  );
});
