import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import type {
  LabAction,
  LabRequest,
  LabState,
} from "../../src/features/intervention-lab/model.js";
import type { ScenarioStep } from "../../src/features/intervention-lab/scenarios.js";

const evidenceRoot = process.env.INTERVENTION_LAB_EVIDENCE_DIR;

interface ExportedRun {
  schemaVersion: string;
  experiment: string;
  connectedToRealDevice: boolean;
  connectedToRealAgent: boolean;
  scenarioId: string;
  eventCursor: number;
  eventCount: number;
  executionQueue: ScenarioStep[];
  state: LabState;
  inputActions: LabAction[];
}

async function stateOf(page: Page): Promise<LabState> {
  return JSON.parse(await page.getByTestId("lab-state-json").inputValue());
}

async function queueOf(page: Page): Promise<ScenarioStep[]> {
  return JSON.parse(await page.getByTestId("lab-fixture-json").inputValue());
}

async function begin(page: Page, scenarioId: string): Promise<void> {
  await page.goto("/intervention-lab");
  await expect(page.getByTestId("lab-simulation-label")).toContainText(
    "确定性仿真",
  );
  await page.getByTestId("lab-scenario-select").selectOption(scenarioId);
  await page.getByTestId("lab-start").click();
  await expect.poll(async () => (await stateOf(page)).phase).toBe("running");
}

async function advanceToRequest(page: Page): Promise<LabRequest> {
  for (let count = 0; count < 20; count += 1) {
    const state = await stateOf(page);
    const request = state.requests.find((item) => item.status === "pending");
    if (request) return request;
    expect(state.phase).not.toBe("ended");
    await expect(page.getByTestId("lab-next")).toBeEnabled();
    await page.getByTestId("lab-next").click();
  }
  throw new Error(
    "Expected an explicit pending request within 20 visible events",
  );
}

async function finishThroughEvents(page: Page): Promise<LabState> {
  // Read the live queue: an alternative response may add declared branch fixtures.
  for (let count = 0; count < 60; count += 1) {
    const state = await stateOf(page);
    if (state.phase === "ended") {
      await expect(page.getByTestId("lab-next")).toBeDisabled();
      await expect(page.getByTestId("lab-autoplay")).toBeDisabled();
      return state;
    }
    expect(state.requests.filter((item) => item.status === "pending")).toEqual(
      [],
    );
    const cursor = Number(
      await page.getByTestId("lab-next").getAttribute("data-cursor"),
    );
    expect(cursor).toBeLessThan((await queueOf(page)).length);
    await expect(page.getByTestId("lab-next")).toBeEnabled();
    await page.getByTestId("lab-next").click();
  }
  throw new Error("Selected response did not close within 60 visible events");
}

async function saveEvidence(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<ExportedRun> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("lab-export").click();
  const download = await downloadPromise;
  const path = testInfo.outputPath(`${name}.json`);
  await download.saveAs(path);
  await testInfo.attach("branch-raw-run", {
    path,
    contentType: "application/json",
  });
  const document: ExportedRun = JSON.parse(
    await page.getByTestId("lab-export-json").inputValue(),
  );
  expect(document.experiment).toBe("deterministic-simulation");
  expect(document.connectedToRealDevice).toBe(false);
  expect(document.connectedToRealAgent).toBe(false);
  expect(document.state).toEqual(await stateOf(page));
  expect(document.executionQueue).toEqual(await queueOf(page));
  expect(document.inputActions).toHaveLength(document.state.logs.length);
  if (evidenceRoot) {
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(
      resolve(evidenceRoot, `${name}.json`),
      `${JSON.stringify(
        {
          ...document,
          verificationDriver: "playwright-automated-clicks",
          humanPerformanceEvidence: false,
        },
        null,
        2,
      )}\n`,
    );
  }
  return document;
}

test("navigation retry has an explicit simulated continuation and reaches complete", async ({
  page,
}, testInfo) => {
  await begin(page, "navigation-failure");
  const request = await advanceToRequest(page);
  expect(request.type).toBe("choice");
  await page.getByTestId(`lab-response-${request.id}-retry`).click();
  const retry = await stateOf(page);
  expect(retry.steps.find((item) => item.id === "s-b")?.status).toBe("pending");
  expect(retry.roads.find((item) => item.id === "r-b")).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  const final = await finishThroughEvents(page);
  expect(final.outcome).toBe("complete");
  expect(final.steps.every((item) => item.status === "completed")).toBe(true);
  expect(final.roads.every((item) => item.status === "observed")).toBe(true);
  await expect(page.getByTestId("lab-branch-note")).toContainText(
    "不表示真实设备恢复成功",
  );
  expect(
    final.roads.find((item) => item.id === "r-b")?.evidence[0]?.detail,
  ).toContain("分支成功fixture");
  const exported = await saveEvidence(
    page,
    "branch-navigation-retry",
    testInfo,
  );
  expect(exported.eventCursor).toBe(exported.eventCount);
  expect(
    exported.inputActions.filter(
      (action) => action.type === "observe-road" && action.roadId === "r-b",
    ),
  ).toHaveLength(1);
});

test("navigation end closes early and preserves unknown roads without further replay", async ({
  page,
}, testInfo) => {
  await begin(page, "navigation-failure");
  const request = await advanceToRequest(page);
  const before = await stateOf(page);
  await page.getByTestId(`lab-response-${request.id}-end`).click();
  const final = await stateOf(page);
  expect(final.phase).toBe("ended");
  expect(final.outcome).toBe("partial");
  expect(final.logs).toHaveLength(before.logs.length + 1);
  expect(
    final.roads.every(
      (item) => item.status === "unchecked" && item.condition === "unknown",
    ),
  ).toBe(true);
  // Ending the task is an application decision, not a device pause receipt.
  expect(final.device.execution).toBe(before.device.execution);
  expect(final.commands).toEqual([]);
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  await expect(page.getByTestId("lab-autoplay")).toBeDisabled();
  const cursor = Number(
    await page.getByTestId("lab-next").getAttribute("data-cursor"),
  );
  expect((await queueOf(page)).length).toBe(cursor);
  const exported = await saveEvidence(page, "branch-navigation-end", testInfo);
  expect(exported.eventCursor).toBe(exported.eventCount);
  expect(
    exported.inputActions.filter((action) => action.type === "observe-road"),
  ).toEqual([]);
});

test("rejecting the stale-case proposal preserves B and completes it through a declared branch", async ({
  page,
}, testInfo) => {
  await begin(page, "constraint-stale");
  const request = await advanceToRequest(page);
  const before = await stateOf(page);
  expect(before.roads.find((item) => item.id === "r-a")?.status).toBe(
    "observed",
  );
  await page.getByTestId(`lab-response-${request.id}-reject`).click();
  const rejected = await stateOf(page);
  expect(rejected.steps.find((item) => item.id === "s-b")?.status).toBe(
    "pending",
  );
  expect(rejected.roads.find((item) => item.id === "r-b")?.evidence).toEqual(
    [],
  );
  const final = await finishThroughEvents(page);
  expect(final.outcome).toBe("complete");
  expect(final.constraints).toEqual([]);
  expect(final.roads.find((item) => item.id === "r-a")?.evidence).toEqual(
    before.roads.find((item) => item.id === "r-a")?.evidence,
  );
  expect(
    final.logs.some(
      (log) =>
        log.actionType === "respond" &&
        !log.accepted &&
        log.inputProvenance === "fixture-event",
    ),
  ).toBe(true);
  expect(
    final.roads.find((item) => item.id === "r-b")?.evidence[0]?.detail,
  ).toContain("分支成功fixture");
  await saveEvidence(page, "branch-stale-proposal-reject", testInfo);
});

test("approving deferral skips B execution and never generates a B observation", async ({
  page,
}, testInfo) => {
  await begin(page, "confirmation-reject");
  const request = await advanceToRequest(page);
  await page.getByTestId(`lab-response-${request.id}-approve`).click();
  const approved = await stateOf(page);
  expect(approved.steps.find((item) => item.id === "s-b")?.status).toBe(
    "deferred",
  );
  expect(approved.roads.find((item) => item.id === "r-b")?.condition).toBe(
    "unknown",
  );
  const final = await finishThroughEvents(page);
  expect(final.outcome).toBe("partial");
  expect(final.roads.find((item) => item.id === "r-b")).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  expect(
    final.roads
      .filter((item) => item.status === "observed")
      .map((item) => item.id),
  ).toEqual(["r-a", "r-c"]);
  const exported = await saveEvidence(
    page,
    "branch-confirmation-approve",
    testInfo,
  );
  expect(
    exported.inputActions.filter(
      (action) => action.type === "observe-road" && action.roadId === "r-b",
    ),
  ).toEqual([]);
});

test("supplement requires actual fields before applying the related exclusion", async ({
  page,
}, testInfo) => {
  await begin(page, "supplement-exclusion");
  const request = await advanceToRequest(page);
  expect(request.requiredInput.kind).toBe("fields");
  await page.getByTestId(`lab-response-${request.id}-submit`).click();
  const invalid = await stateOf(page);
  expect(invalid.logs.at(-1)).toMatchObject({ accepted: false });
  expect(invalid.requests.find((item) => item.id === request.id)?.status).toBe(
    "pending",
  );
  expect(invalid.constraints).toEqual([]);
  expect(invalid.steps.find((item) => item.id === "s-c")?.status).toBe(
    "pending",
  );
  await expect(page.getByTestId("lab-notice")).toContainText("必填");
  await page
    .getByTestId(`lab-field-${request.id}-exclusion`)
    .fill("本次不查验东侧道路C，单独保留未查明结果。");
  await page.getByTestId(`lab-response-${request.id}-submit`).click();
  const valid = await stateOf(page);
  expect(valid.requests.find((item) => item.id === request.id)?.status).toBe(
    "resolved",
  );
  expect(valid.constraints[0]?.roadIds).toEqual(["r-c"]);
  expect(valid.steps.find((item) => item.id === "s-c")?.status).toBe(
    "cancelled",
  );
  const final = await finishThroughEvents(page);
  expect(final.outcome).toBe("partial");
  expect(final.roads.find((item) => item.id === "r-c")).toMatchObject({
    status: "unchecked",
    condition: "unknown",
    evidence: [],
  });
  await saveEvidence(page, "branch-supplement-validation", testInfo);
});

test("a constraint on the running road is refused without cancelling its execution", async ({
  page,
}, testInfo) => {
  await begin(page, "normal-detour");
  await page.getByTestId("lab-next").click();
  const before = await stateOf(page);
  expect(before.steps.find((item) => item.id === "s-a")?.status).toBe(
    "running",
  );
  await page.getByTestId("lab-constraint-road").selectOption("r-a");
  await page.getByTestId("lab-add-constraint").click();
  const refused = await stateOf(page);
  expect(refused.logs.at(-1)).toMatchObject({
    accepted: false,
    actionType: "add-constraint",
  });
  expect(refused.steps).toEqual(before.steps);
  expect(refused.roads).toEqual(before.roads);
  expect(refused.planVersion).toBe(before.planVersion);
  expect(refused.constraints).toEqual([]);
  expect(refused.device).toEqual(before.device);
  await expect(page.getByTestId("lab-notice")).toContainText("暂停回执");
  expect((await finishThroughEvents(page)).outcome).toBe("complete");
  await saveEvidence(page, "branch-running-constraint-refused", testInfo);
});

test("starting a different case resets request, constraints, observations and the run binding", async ({
  page,
}, testInfo) => {
  await begin(page, "navigation-failure");
  const request = await advanceToRequest(page);
  await page.getByTestId("lab-constraint-road").selectOption("r-c");
  await page.getByTestId("lab-add-constraint").click();
  const previous = await stateOf(page);
  expect(previous.constraints).toHaveLength(1);
  expect(previous.requests.find((item) => item.id === request.id)?.status).toBe(
    "pending",
  );
  await page.getByTestId("lab-scenario-select").selectOption("normal-detour");
  // Selecting a case is not itself a task mutation; the start control creates the next run.
  expect(await stateOf(page)).toEqual(previous);
  await page.getByTestId("lab-start").click();
  const fresh = await stateOf(page);
  expect(fresh.runId).not.toBe(previous.runId);
  expect(fresh.phase).toBe("running");
  expect(fresh.planVersion).toBe(1);
  expect(fresh.requests).toEqual([]);
  expect(fresh.constraints).toEqual([]);
  expect(fresh.commands).toEqual([]);
  expect(fresh.logs).toHaveLength(1);
  expect(fresh.logs[0]?.runId).toBe(fresh.runId);
  expect(fresh.steps.every((item) => item.status === "pending")).toBe(true);
  expect(
    fresh.roads.every(
      (item) =>
        item.status === "unchecked" &&
        item.condition === "unknown" &&
        item.evidence.length === 0,
    ),
  ).toBe(true);
  const exported = await saveEvidence(page, "branch-case-reset", testInfo);
  expect(exported.scenarioId).toBe("normal-detour");
  expect(exported.inputActions).toHaveLength(1);
  expect(
    exported.executionQueue.every(
      (step) => !step.action.actionId.startsWith("failure:"),
    ),
  ).toBe(true);
});
