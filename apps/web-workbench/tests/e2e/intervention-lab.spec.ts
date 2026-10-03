import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import type { LabState } from "../../src/features/intervention-lab/model.js";
import {
  LAB_SCENARIOS,
  type LabScenario,
  runScenario,
} from "../../src/features/intervention-lab/scenarios.js";

const evidenceRoot = process.env.INTERVENTION_LAB_EVIDENCE_DIR;

async function stateOf(page: Page): Promise<LabState> {
  return JSON.parse(await page.getByTestId("lab-state-json").inputValue());
}

function facts(state: LabState) {
  return {
    phase: state.phase,
    outcome: state.outcome,
    planVersion: state.planVersion,
    roads: state.roads.map(({ id, status, condition, version }) => ({
      id,
      status,
      condition,
      version,
    })),
    steps: state.steps,
    requests: state.requests.map(({ type, status, resolution }) => ({
      type,
      status,
      resolution,
    })),
    constraints: state.constraints.map(({ roadIds }) => roadIds),
    device: state.device,
    commands: state.commands.map(({ kind, status }) => ({ kind, status })),
  };
}

async function begin(page: Page, scenarioId: string, mode = "dynamic") {
  await page.goto("/intervention-lab");
  await expect(page.getByTestId("lab-simulation-label")).toContainText(
    "未连接真实设备",
  );
  await page.getByTestId("lab-scenario-select").selectOption(scenarioId);
  await page.getByTestId(`lab-mode-${mode}`).click();
  await page.getByTestId("lab-start").click();
}

async function exportEvidence(page: Page, name: string, testInfo: TestInfo) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("lab-export").click();
  const download = await downloadPromise;
  const path = testInfo.outputPath(`${name}.json`);
  await download.saveAs(path);
  await testInfo.attach("raw-run", { path, contentType: "application/json" });
  const document = JSON.parse(
    await page.getByTestId("lab-export-json").inputValue(),
  );
  expect(document.connectedToRealDevice).toBe(false);
  expect(document.connectedToRealAgent).toBe(false);
  expect(document.state).toEqual(await stateOf(page));
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
}

async function completeCase(page: Page, scenario: LabScenario) {
  // Exercise the visible controls; scriptedOperator fixtures are never injected as answers.
  for (let guard = 0; guard < 60; guard += 1) {
    const state = await stateOf(page);
    if (state.phase === "ended") return state;
    const cursorText = await page.getByTestId("lab-cursor").innerText();
    const cursor = Number(cursorText.match(/事件 (\d+)\//)?.[1]);
    const queue: LabScenario["steps"] = JSON.parse(
      await page.getByTestId("lab-fixture-json").inputValue(),
    );
    const next = queue[cursor];
    if (!next) return state;
    if (next.scriptedOperator) {
      const pending = state.requests.filter(
        (request) => request.status === "pending",
      );
      if (pending.length && next.action.type === "add-constraint") {
        await page
          .getByTestId("lab-constraint-road")
          .selectOption(next.action.roadIds[0]!);
        await page.getByTestId("lab-add-constraint").click();
      } else if (pending.length && next.action.type === "respond") {
        const request = pending[0]!;
        for (const [key, value] of Object.entries(next.action.values ?? {})) {
          await page.getByTestId(`lab-field-${request.id}-${key}`).fill(value);
        }
        await page
          .getByTestId(`lab-response-${request.id}-${next.action.optionId}`)
          .click();
      } else {
        await page.getByTestId("lab-next").click();
      }
    } else {
      await page.getByTestId("lab-next").click();
    }
    const after = await stateOf(page);
    for (const road of after.roads.filter(
      (item) => item.status === "unchecked",
    ))
      expect(road.condition).toBe("unknown");
    if (after.device.link === "offline")
      expect(after.device.execution).toBe("unknown");
    if (after.device.execution === "paused")
      expect(
        after.commands.some((command) => command.status === "acknowledged"),
      ).toBe(true);
  }
  throw new Error("Case did not finish within 60 visible-control actions");
}

for (const mode of ["fixed", "dynamic"]) {
  for (const scenario of LAB_SCENARIOS) {
    test(`${mode}: ${scenario.id} closes through visible controls`, async ({
      page,
    }, testInfo) => {
      await begin(page, scenario.id, mode);
      const final = await completeCase(page, scenario);
      const expected = facts(runScenario(scenario));
      const actual = facts(final);
      // UI action IDs and logical timestamps differ; compare technical outcomes, not those IDs.
      expect({
        ...actual,
        device: { ...actual.device, lastConfirmedAt: 0 },
      }).toEqual({
        ...expected,
        device: { ...expected.device, lastConfirmedAt: 0 },
      });
      expect(
        final.logs
          .filter((log) => log.actionType === "respond" && log.accepted)
          .every((log) => log.inputProvenance === "interactive"),
      ).toBe(true);
      await exportEvidence(page, `${scenario.id}-${mode}`, testInfo);
    });
  }
}

test("mode switch preserves state and actions while moving pending request", async ({
  page,
}, testInfo) => {
  await begin(page, "navigation-failure");
  await page.getByTestId("lab-next").click();
  await page.getByTestId("lab-next").click();
  const before = await stateOf(page);
  const request = before.requests[0]!;
  const actions = await page
    .locator(".request-actions button")
    .allTextContents();
  expect(before.roads.find((road) => road.id === "r-b")?.condition).toBe(
    "unknown",
  );
  await expect(page.getByTestId(`lab-request-${request.id}`)).toHaveAttribute(
    "data-request-type",
    "choice",
  );
  await expect(page.getByTestId("lab-next")).toBeDisabled();
  const dynamicY = (await page.getByTestId("lab-interventions").boundingBox())!
    .y;
  const dynamicTaskY = (await page.getByTestId("lab-task-state").boundingBox())!
    .y;
  expect(dynamicY).toBeLessThan(dynamicTaskY);
  await page.getByTestId("lab-mode-fixed").click();
  expect(await stateOf(page)).toEqual(before);
  expect(
    await page.locator(".request-actions button").allTextContents(),
  ).toEqual(actions);
  expect(
    (await page.getByTestId("lab-interventions").boundingBox())!.y,
  ).toBeGreaterThan(
    (await page.getByTestId("lab-task-state").boundingBox())!.y,
  );
  await page.getByTestId("lab-mode-dynamic").click();
  expect(await stateOf(page)).toEqual(before);
  await page.screenshot({
    path: testInfo.outputPath("dynamic-choice.png"),
    fullPage: true,
  });
  if (evidenceRoot)
    await page.screenshot({
      path: resolve(evidenceRoot, "dynamic-choice.png"),
      fullPage: true,
    });
  await page.getByTestId(`lab-response-${request.id}-defer`).click();
  const applied = await stateOf(page);
  await page.getByTestId(`lab-stale-${request.id}`).click();
  const duplicate = await stateOf(page);
  expect(duplicate.logs.at(-1)?.accepted).toBe(false);
  expect(facts(duplicate)).toEqual(facts(applied));
});

test("active constraint invalidates old request without rewriting road facts", async ({
  page,
}) => {
  await begin(page, "constraint-stale");
  for (let index = 0; index < 4; index += 1)
    await page.getByTestId("lab-next").click();
  const before = await stateOf(page);
  const request = before.requests[0]!;
  await page.getByTestId("lab-constraint-road").selectOption("r-b");
  await page.getByTestId("lab-add-constraint").click();
  await expect(page.getByTestId(`lab-history-${request.id}`)).toHaveAttribute(
    "data-status",
    "obsolete",
  );
  const constrained = await stateOf(page);
  await page.getByTestId(`lab-stale-${request.id}`).click();
  const after = await stateOf(page);
  expect(after.logs.at(-1)?.accepted).toBe(false);
  expect(facts(after)).toEqual(facts(constrained));
  expect(after.roads.find((road) => road.id === "r-a")?.status).toBe(
    "observed",
  );
  expect(after.roads.find((road) => road.id === "r-b")?.condition).toBe(
    "unknown",
  );
});

test("lost link and sent command remain unknown until matching device ACK", async ({
  page,
}, testInfo) => {
  await begin(page, "link-command-ack");
  for (let index = 0; index < 3; index += 1)
    await page.getByTestId("lab-next").click();
  const request = (await stateOf(page)).requests[0]!;
  await page.getByTestId(`lab-response-${request.id}-pause`).click();
  let state = await stateOf(page);
  expect(state.commands[0]?.status).toBe("queued");
  expect(state.device.execution).toBe("unknown");
  await expect(page.getByTestId("lab-device-state")).toContainText(
    "当前执行状态未知",
  );
  await page.getByTestId("lab-next").click();
  state = await stateOf(page);
  expect(state.commands[0]?.status).toBe("sent");
  expect(state.device.execution).toBe("unknown");
  await expect(page.getByTestId("lab-map-position")).toContainText(
    "最后确认位置",
  );
  if (evidenceRoot)
    await page.screenshot({
      path: resolve(evidenceRoot, "command-awaiting-ack.png"),
      fullPage: true,
    });
  await page.getByTestId("lab-next").click();
  state = await stateOf(page);
  expect(state.commands[0]?.status).toBe("acknowledged");
  expect(state.device.execution).toBe("paused");
  await expect(page.getByTestId("lab-device-state")).toContainText(
    "设备已确认暂停",
  );
  await exportEvidence(page, "ack-checkpoints", testInfo);
});

test("mobile layout has no horizontal overflow and pending controls remain usable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page, "navigation-failure");
  await page.getByTestId("lab-next").click();
  await page.getByTestId("lab-next").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const request = (await stateOf(page)).requests[0]!;
  await expect(
    page.getByTestId(`lab-response-${request.id}-defer`),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-choice.png"),
    fullPage: true,
  });
  if (evidenceRoot)
    await page.screenshot({
      path: resolve(evidenceRoot, "mobile-choice.png"),
      fullPage: true,
    });
  await page.getByTestId(`lab-response-${request.id}-defer`).click();
  expect((await stateOf(page)).requests[0]?.status).toBe("resolved");
});

test("lab makes no Agent API calls and existing routes still resolve", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      calls.push(request.url());
  });
  await begin(page, "normal-detour");
  await completeCase(page, LAB_SCENARIOS[0]!);
  expect(calls).toEqual([]);
  for (const route of ["/catalog", "/cases", "/settings"]) {
    await page.goto(route);
    await expect(page.locator("nav a.active")).toHaveCount(1);
    expect(new URL(page.url()).pathname).toBe(route);
  }
});
