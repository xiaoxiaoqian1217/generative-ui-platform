import { readFile, writeFile } from "node:fs/promises";
import { EventSchemas } from "@ag-ui/core";
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import type { LabState } from "../../src/features/intervention-lab/model.js";

type JsonObject = Record<string, unknown>;
interface WireRequest {
  method: string;
  path: string;
  body?: JsonObject;
}
interface WireResponse {
  method: string;
  path: string;
  status: number;
  contentType: string;
}
interface WireEvidence {
  requests: WireRequest[];
  responses: WireResponse[];
}
interface AgentExport {
  schemaVersion: string;
  transport: string;
  connectedToThinAgent: boolean;
  agUiTransport: string;
  connectedToRealLLM: boolean;
  connectedToRealDevice: boolean;
  serverRevision: number;
  serverEnvelope: { revision: number; task: LabState };
  state: LabState;
  protocolSession: { threadId: string; runId: string; interruptId?: string };
  protocolEvents: { sequence: number; at: string; event: JsonObject }[];
  manualMode: boolean;
}

// Observe actual requests and SSE response headers. No request interception,
// local reducer, synthetic stream or client-supplied execution fact is used.
function observeWire(page: Page): WireEvidence {
  const evidence: WireEvidence = { requests: [], responses: [] };
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/intervention-agent/")) return;
    const body = request.postData()
      ? (request.postDataJSON() as JsonObject)
      : undefined;
    evidence.requests.push({
      method: request.method(),
      path,
      ...(body ? { body } : {}),
    });
  });
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (!path.startsWith("/api/intervention-agent/")) return;
    evidence.responses.push({
      method: response.request().method(),
      path,
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "",
    });
  });
  return evidence;
}

async function stateOf(page: Page): Promise<LabState> {
  return JSON.parse(await page.getByTestId("lab-state-json").inputValue());
}

async function waitForState(
  page: Page,
  predicate: (state: LabState) => boolean,
): Promise<LabState> {
  await expect.poll(async () => predicate(await stateOf(page))).toBe(true);
  return stateOf(page);
}

async function connectionIs(page: Page, value: string): Promise<void> {
  await expect(page.getByTestId("lab-connection-state")).toHaveAttribute(
    "data-state",
    value,
  );
  await expect(page.getByTestId("lab-connection-state")).toHaveAttribute(
    "data-busy",
    "false",
  );
}

async function begin(
  page: Page,
  scenarioId: string,
  manual = true,
): Promise<LabState> {
  await page.setViewportSize({ width: 1480, height: 1100 });
  await page.goto("/intervention-lab");
  await expect(page.getByTestId("lab-transport-select")).toHaveValue("agent");
  await expect(page.getByTestId("lab-manual-mode")).toBeChecked();
  if (!manual) await page.getByTestId("lab-manual-mode").uncheck();
  await page.getByTestId("lab-scenario-select").selectOption(scenarioId);
  await page.getByTestId("lab-start").click();
  await connectionIs(page, "connected");
  await expect(page.getByTestId("lab-connection-state")).toHaveAttribute(
    "data-stream-active",
    "true",
  );
  return waitForState(
    page,
    (state) =>
      state.steps.find((step) => step.id === "s-a")?.status === "running",
  );
}

async function advance(page: Page): Promise<LabState> {
  const before = await stateOf(page);
  await expect(page.getByTestId("lab-next")).toBeEnabled();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/commands"),
  );
  await page.getByTestId("lab-next").click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ accepted: true });
  return waitForState(page, (state) => state.logicalTime > before.logicalTime);
}

async function finish(page: Page): Promise<LabState> {
  for (let count = 0; count < 20; count += 1) {
    const state = await stateOf(page);
    if (state.phase === "ended") {
      await connectionIs(page, "finished");
      return state;
    }
    expect(
      state.requests.filter((request) => request.status === "pending"),
    ).toEqual([]);
    await advance(page);
  }
  throw new Error(
    "The server-owned task did not finish within 20 manual commands",
  );
}

function runRequests(wire: WireEvidence): WireRequest[] {
  return wire.requests.filter(
    (request) =>
      request.method === "POST" &&
      request.path === "/api/intervention-agent/run",
  );
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined)
    throw new Error(`Missing ${label} in real network evidence`);
  return value;
}

function runBody(wire: WireEvidence, index: number): JsonObject {
  return required(runRequests(wire)[index]?.body, `run ${index + 1} POST body`);
}

function resumeBody(wire: WireEvidence, optionId: string): JsonObject {
  return required(
    runRequests(wire).find(({ body }) =>
      (body?.resume as { payload?: JsonObject }[] | undefined)?.some(
        (item) => item.payload?.optionId === optionId,
      ),
    )?.body,
    `resume POST body for option ${JSON.stringify(optionId)}`,
  );
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
  wire: WireEvidence,
  manual = true,
): Promise<AgentExport> {
  const before = await stateOf(page);
  let serverSnapshot: unknown;
  if (
    (await page
      .getByTestId("lab-connection-state")
      .getAttribute("data-state")) !== "disconnected"
  ) {
    const response = await page.request.get(
      `/api/intervention-agent/tasks/${encodeURIComponent(before.runId)}`,
    );
    expect(response.status()).toBe(200);
    serverSnapshot = await response.json();
    expect((serverSnapshot as { task: LabState }).task).toEqual(before);
  }
  await page.evaluate(() => document.fonts.ready);
  const lab = page.getByTestId("intervention-lab");
  let bounds = required(
    (await lab.boundingBox()) ?? undefined,
    "lab screenshot bounds",
  );
  const initialViewport = required(
    page.viewportSize() ?? undefined,
    "browser viewport",
  );
  const fittedHeight = Math.ceil(Math.max(0, bounds.y) + bounds.height + 24);
  if (fittedHeight > initialViewport.height) {
    await page.setViewportSize({
      width: initialViewport.width,
      height: fittedHeight,
    });
  }
  await lab.scrollIntoViewIfNeeded();
  bounds = required(
    (await lab.boundingBox()) ?? undefined,
    "fitted lab screenshot bounds",
  );
  const viewport = required(
    page.viewportSize() ?? undefined,
    "fitted browser viewport",
  );
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  const regions = [];
  for (const testId of [
    "lab-connection-state",
    "lab-continuous-panel",
    "lab-task-state",
    "lab-active-priority",
    "lab-collaboration-feedback",
    "lab-notice",
  ]) {
    const locator = page.getByTestId(testId);
    await expect(locator).toBeVisible();
    const region = required(
      (await locator.boundingBox()) ?? undefined,
      `visible region ${testId}`,
    );
    expect(region.x).toBeGreaterThanOrEqual(bounds.x);
    expect(region.y).toBeGreaterThanOrEqual(bounds.y);
    expect(region.x + region.width).toBeLessThanOrEqual(
      bounds.x + bounds.width,
    );
    expect(region.y + region.height).toBeLessThanOrEqual(
      bounds.y + bounds.height,
    );
    regions.push({ testId, bounds: region, text: await locator.textContent() });
  }
  const screenshotPath = testInfo.outputPath(`${name}.png`);
  await lab.screenshot({ path: screenshotPath, animations: "disabled" });
  expect(await stateOf(page)).toEqual(before);
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("lab-export").click();
  const download = await downloadPromise;
  const exportPath = testInfo.outputPath(`${name}-raw-export.json`);
  await download.saveAs(exportPath);
  const raw = await readFile(exportPath, "utf8");
  const exported: AgentExport = JSON.parse(raw);
  expect(exported).toMatchObject({
    schemaVersion: "intervention-lab-agent-export/v1",
    transport: "agent",
    connectedToThinAgent: true,
    agUiTransport: "http-sse",
    connectedToRealLLM: false,
    connectedToRealDevice: false,
    manualMode: manual,
  });
  expect(exported.state).toEqual(before);
  expect(exported.serverEnvelope.task).toEqual(before);
  expect(exported.serverEnvelope.revision).toBe(exported.serverRevision);
  expect(await stateOf(page)).toEqual(before);
  expect(exported.protocolEvents.length).toBeGreaterThan(0);
  for (const record of exported.protocolEvents)
    expect(
      EventSchemas.safeParse(record.event).success,
      `Native event ${record.event.type}`,
    ).toBe(true);
  expect(
    wire.responses.some(
      (response) =>
        response.path === "/api/intervention-agent/run" &&
        response.method === "POST" &&
        response.status === 200 &&
        response.contentType.includes("text/event-stream"),
    ),
  ).toBe(true);
  const evidencePath = testInfo.outputPath(`${name}-wire-evidence.json`);
  await writeFile(
    evidencePath,
    `${JSON.stringify(
      {
        verificationDriver: "playwright-visible-controls-and-real-http-sse",
        connectedToThinAgent: true,
        connectedToRealLLM: false,
        connectedToRealDevice: false,
        humanPerformanceEvidence: false,
        wire,
        serverSnapshot,
        exported,
        screenshot: {
          scope: "unaltered-complete-lab-element-in-fitted-real-viewport",
          captureOrder:
            "screenshot-before-raw-download; business-state-unchanged",
          bounds,
          viewport,
          requiredVisibleRegions: regions,
        },
      },
      null,
      2,
    )}\n`,
  );
  await testInfo.attach(`${name}-raw-export`, {
    path: exportPath,
    contentType: "application/json",
  });
  await testInfo.attach(`${name}-wire-evidence`, {
    path: evidencePath,
    contentType: "application/json",
  });
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: "image/png",
  });
  return exported;
}

test.beforeEach(async ({ request }) => {
  expect(
    (await request.post("/__control__/intervention-agent-up")).status(),
  ).toBe(204);
});

test.afterEach(async ({ request }) => {
  expect(
    (await request.post("/__control__/intervention-agent-up")).status(),
  ).toBe(204);
});

test("native POST/SSE interrupt and resume keep one task while consuming the chosen point only in later feedback", async ({
  page,
}, testInfo) => {
  const wire = observeWire(page);
  const initial = await begin(page, "observation-cooperation");
  const firstRun = runBody(wire, 0);
  expect(firstRun.forwardedProps).toMatchObject({
    operation: "start",
    scenarioId: "observation-cooperation",
    manual: true,
  });
  expect(typeof firstRun.threadId).toBe("string");
  expect(typeof firstRun.runId).toBe("string");
  expect(initial.runId).not.toBe(firstRun.runId);

  const pending = await advance(page);
  await connectionIs(page, "interrupted");
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  const request = required(
    pending.requests.find((item) => item.status === "pending"),
    "pending observation request",
  );
  expect(request).toBeDefined();
  expect(pending.roads[0]).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  const interrupted = await capture(
    page,
    testInfo,
    "agent-observation-interrupt",
    wire,
  );
  expect(
    interrupted.protocolEvents.some(
      ({ event }) =>
        event.type === "RUN_FINISHED" &&
        (event.outcome as JsonObject | undefined)?.type === "interrupt",
    ),
  ).toBe(true);

  const invalidResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/intervention-agent/run",
  );
  await page.getByTestId("lab-submit-observation").click();
  const invalidResponse = await invalidResponsePromise;
  expect(invalidResponse.status()).toBe(200);
  const invalidWireEvents = (await invalidResponse.text())
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => EventSchemas.parse(JSON.parse(line.slice(6))));
  expect(invalidWireEvents.some((event) => event.type === "RUN_ERROR")).toBe(
    true,
  );
  const invalidRun = resumeBody(wire, "");
  expect(invalidRun.threadId).toBe(firstRun.threadId);
  expect(invalidRun.runId).not.toBe(firstRun.runId);
  await expect(page.getByTestId("lab-connection-state")).toHaveAttribute(
    "data-run-id",
    String(invalidRun.runId),
  );
  await connectionIs(page, "interrupted");
  expect(await stateOf(page)).toEqual(pending);
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  await expect(page.getByTestId("lab-submit-observation")).toBeEnabled();
  const rejected = await capture(
    page,
    testInfo,
    "agent-empty-resume-rejected",
    wire,
  );
  expect(
    rejected.protocolEvents.some(({ event }) => event.type === "RUN_ERROR"),
  ).toBe(true);
  expect(
    rejected.state.requests.find((item) => item.id === request.id)?.status,
  ).toBe("pending");

  await page.getByTestId("lab-observation-point").selectOption("point-a-south");
  await page.getByTestId("lab-submit-observation").click();
  const provided = await waitForState(
    page,
    (state) => state.collaboration?.observationInput?.status === "provided",
  );
  await connectionIs(page, "connected");
  expect(provided.runId).toBe(initial.runId);
  expect(provided.roads).toEqual(pending.roads);
  expect(provided.device).toEqual(pending.device);
  expect(provided.steps[0]?.status).toBe("running");
  const secondRun = resumeBody(wire, "point-a-south");
  expect(secondRun.threadId).toBe(firstRun.threadId);
  expect(secondRun.runId).not.toBe(firstRun.runId);
  expect(secondRun.runId).not.toBe(invalidRun.runId);
  expect(secondRun.forwardedProps).toEqual({
    operation: "continue",
    taskId: initial.runId,
  });
  expect(secondRun.resume).toEqual([
    expect.objectContaining({
      interruptId: request.id,
      status: "resolved",
      payload: expect.objectContaining({
        type: "respond",
        runId: initial.runId,
        requestId: request.id,
        requestVersion: request.version,
        optionId: "point-a-south",
      }),
    }),
  ]);
  await capture(
    page,
    testInfo,
    "agent-point-accepted-before-observation",
    wire,
  );

  const observed = await advance(page);
  expect(observed.roads[0]?.status).toBe("observed");
  expect(observed.roads[0]?.evidence[0]?.detail).toContain("point-a-south");
  expect(observed.device.position).toEqual({ x: 18, y: 65 });
  expect(observed.steps[0]?.status).toBe("running");
  const final = await finish(page);
  expect(final.outcome).toBe("complete");
  const exported = await capture(
    page,
    testInfo,
    "agent-observation-finished",
    wire,
  );
  const eventTypes = exported.protocolEvents.map(({ event }) => event.type);
  expect(eventTypes).toEqual(
    expect.arrayContaining([
      "RUN_STARTED",
      "STATE_SNAPSHOT",
      "STATE_DELTA",
      "RUN_FINISHED",
    ]),
  );
  expect(exported.protocolSession.threadId).toBe(firstRun.threadId);
  expect(exported.protocolSession.runId).toBe(secondRun.runId);
});

test("automatic mode receives a timer-generated native interrupt without any manual advance command", async ({
  page,
}, testInfo) => {
  const wire = observeWire(page);
  const initial = await begin(page, "observation-cooperation", false);
  const run = runBody(wire, 0);
  expect(run.forwardedProps).toMatchObject({
    operation: "start",
    scenarioId: "observation-cooperation",
    manual: false,
  });
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  const pending = await waitForState(page, (state) =>
    state.requests.some((request) => request.status === "pending"),
  );
  await connectionIs(page, "interrupted");
  expect(pending.runId).toBe(initial.runId);
  expect(pending.logicalTime).toBeGreaterThan(initial.logicalTime);
  expect(pending.logs.at(-1)).toMatchObject({
    actionType: "request-observation-point",
    accepted: true,
    inputProvenance: "fixture-event",
  });
  expect(pending.roads[0]).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  expect(
    wire.requests.filter((entry) => entry.path.endsWith("/commands")),
  ).toEqual([]);
  const exported = await capture(
    page,
    testInfo,
    "agent-auto-timer-interrupt",
    wire,
    false,
  );
  expect(
    exported.protocolEvents.some(
      ({ event }) =>
        event.type === "RUN_FINISHED" &&
        (event.outcome as JsonObject | undefined)?.type === "interrupt",
    ),
  ).toBe(true);
  expect(runRequests(wire)).toHaveLength(1);
});

test("human priority commands update streamed server state and actual A/C/B execution while baseline stays A/B/C", async ({
  page,
}, testInfo) => {
  const wire = observeWire(page);
  const initial = await begin(page, "priority-cooperation");
  expect(initial.collaboration?.executionOrder).toEqual(["s-a"]);
  await page.getByTestId("lab-priority-step").selectOption("s-c");
  const commandResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/commands"),
  );
  await page.getByTestId("lab-prioritize").click();
  expect(await (await commandResponse).json()).toMatchObject({
    accepted: true,
  });
  const changed = await waitForState(
    page,
    (state) => state.planVersion === initial.planVersion + 1,
  );
  expect(changed.collaboration?.stepOrder).toEqual(["s-a", "s-c", "s-b"]);
  expect(changed.steps).toEqual(initial.steps);
  expect(changed.roads).toEqual(initial.roads);
  expect(changed.device).toEqual(initial.device);
  const priorityCommand = required(
    wire.requests.find(
      (entry) =>
        (entry.body?.action as JsonObject | undefined)?.type ===
        "prioritize-step",
    ),
    "priority command POST",
  );
  expect(priorityCommand.body).toMatchObject({
    expectedRevision: expect.any(Number),
    action: {
      runId: initial.runId,
      planVersion: initial.planVersion,
      stepId: "s-c",
    },
  });
  const applied = await capture(
    page,
    testInfo,
    "agent-priority-command-applied",
    wire,
  );
  expect(
    applied.protocolEvents.some(
      ({ event }) =>
        event.type === "STATE_DELTA" &&
        (event.delta as JsonObject[]).some(
          (operation) =>
            operation.path === "/task" &&
            (operation.value as LabState).planVersion === changed.planVersion,
        ),
    ),
  ).toBe(true);
  const adjusted = await finish(page);
  expect(adjusted.collaboration?.executionOrder).toEqual(["s-a", "s-c", "s-b"]);
  expect(adjusted.outcome).toBe("complete");
  await capture(page, testInfo, "agent-priority-adjusted-finished", wire);

  const runCount = runRequests(wire).length;
  await page.getByTestId("lab-start").click();
  await connectionIs(page, "connected");
  await waitForState(
    page,
    (state) =>
      state.runId !== initial.runId && state.steps[0]?.status === "running",
  );
  expect(runRequests(wire)).toHaveLength(runCount + 1);
  const baseline = await finish(page);
  expect(baseline.collaboration?.executionOrder).toEqual(["s-a", "s-b", "s-c"]);
  expect(baseline.collaboration?.contributions).toEqual([]);
  expect(baseline.outcome).toBe(adjusted.outcome);
  expect(baseline.roads.map((road) => [road.status, road.condition])).toEqual(
    adjusted.roads.map((road) => [road.status, road.condition]),
  );
  await capture(page, testInfo, "agent-priority-baseline-finished", wire);
});

test("actual stream loss retains confirmed state, disables commands and reconnects with a snapshot plus new run", async ({
  page,
  request,
}, testInfo) => {
  const wire = observeWire(page);
  const initial = await begin(page, "priority-cooperation");
  const firstRun = runBody(wire, 0);
  const confirmed = await advance(page);
  expect(confirmed.roads[0]?.status).toBe("observed");
  const confirmedRevision = await page
    .getByTestId("lab-connection-state")
    .getAttribute("data-revision");
  expect(
    (await request.post("/__control__/intervention-agent-down")).status(),
  ).toBe(204);
  await connectionIs(page, "disconnected");
  expect(await stateOf(page)).toEqual(confirmed);
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  await expect(page.getByTestId("lab-prioritize")).toBeDisabled();
  expect(
    (
      await request.get(
        `/api/intervention-agent/tasks/${encodeURIComponent(initial.runId)}`,
      )
    ).status(),
  ).toBe(503);

  await page.getByTestId("lab-reconnect").click();
  await connectionIs(page, "disconnected");
  expect(
    wire.responses.some(
      (entry) =>
        entry.method === "GET" &&
        entry.path.includes("/tasks/") &&
        entry.status === 503,
    ),
  ).toBe(true);
  expect(await stateOf(page)).toEqual(confirmed);
  expect(
    await page
      .getByTestId("lab-connection-state")
      .getAttribute("data-revision"),
  ).toBe(confirmedRevision);
  await capture(page, testInfo, "agent-real-stream-disconnected", wire);

  expect(
    (await request.post("/__control__/intervention-agent-up")).status(),
  ).toBe(204);
  await page.getByTestId("lab-reconnect").click();
  await connectionIs(page, "connected");
  await expect(page.getByTestId("lab-connection-state")).toHaveAttribute(
    "data-stream-active",
    "true",
  );
  expect(await stateOf(page)).toEqual(confirmed);
  expect(
    await page
      .getByTestId("lab-connection-state")
      .getAttribute("data-revision"),
  ).toBe(confirmedRevision);
  expect(
    wire.responses.some(
      (entry) =>
        entry.method === "GET" &&
        entry.path.includes("/tasks/") &&
        entry.status === 200,
    ),
  ).toBe(true);
  const resumedRun = runBody(wire, 1);
  expect(resumedRun.threadId).toBe(firstRun.threadId);
  expect(resumedRun.runId).not.toBe(firstRun.runId);
  expect(resumedRun.forwardedProps).toEqual({
    operation: "continue",
    taskId: initial.runId,
  });
  expect(resumedRun.resume).toBeUndefined();
  await capture(page, testInfo, "agent-snapshot-reconnected", wire);

  const final = await finish(page);
  expect(final.runId).toBe(initial.runId);
  expect(final.collaboration?.executionOrder).toEqual(["s-a", "s-b", "s-c"]);
  expect(final.outcome).toBe("complete");
  await capture(page, testInfo, "agent-reconnected-task-finished", wire);
});
