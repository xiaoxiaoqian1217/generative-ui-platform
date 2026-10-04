// @vitest-environment jsdom

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import InterventionLabPage from "../../src/features/intervention-lab/InterventionLabPage.vue";
import {
  createInitialState,
  dispatchLabAction,
  type LabAction,
  type LabRequest,
  type LabState,
} from "../../src/features/intervention-lab/model.js";
import {
  LAB_SCENARIOS,
  runScenario,
  type ScenarioStep,
} from "../../src/features/intervention-lab/scenarios.js";

type LabWrapper = ReturnType<typeof mount>;
interface ExportedRun {
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

const mounted: LabWrapper[] = [];
let fallbackUuidSequence = 0;

beforeEach(() => {
  // jsdom exercises Vue/DOM wiring, not a rendering browser or human performance.
  // Only the unsupported download transport is stubbed; JSON serialization is real.
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL(): string {
        return "blob:jsdom-intervention-lab";
      }
      static revokeObjectURL(): void {
        /* No native download handle exists in jsdom. */
      }
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  if (typeof crypto.randomUUID !== "function") {
    vi.stubGlobal("crypto", {
      randomUUID: () =>
        `00000000-0000-4000-8000-${String(++fallbackUuidSequence).padStart(12, "0")}`,
    });
  }
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function byId(id: string): string {
  return `[data-testid="${id}"]`;
}
function stateOf(wrapper: LabWrapper): LabState {
  return JSON.parse(
    (wrapper.get(byId("lab-state-json")).element as HTMLTextAreaElement).value,
  );
}
function queueOf(wrapper: LabWrapper): ScenarioStep[] {
  return JSON.parse(
    (wrapper.get(byId("lab-fixture-json")).element as HTMLTextAreaElement)
      .value,
  );
}
function nextDisabled(wrapper: LabWrapper): boolean {
  return (wrapper.get(byId("lab-next")).element as HTMLButtonElement).disabled;
}
async function click(wrapper: LabWrapper, id: string): Promise<void> {
  const button = wrapper.get(byId(id)).element as HTMLButtonElement;
  expect(button.disabled, `${id} must be available`).toBe(false);
  // Native DOM click also invokes form submission for the active-constraint button.
  button.click();
  await nextTick();
}
async function begin(
  scenarioId: string,
  mode = "dynamic",
): Promise<LabWrapper> {
  const wrapper = mount(InterventionLabPage, { attachTo: document.body });
  mounted.push(wrapper);
  expect(wrapper.get(byId("lab-simulation-label")).text()).toContain(
    "未连接真实设备",
  );
  await wrapper.get(byId("lab-scenario-select")).setValue(scenarioId);
  await click(wrapper, `lab-mode-${mode}`);
  await click(wrapper, "lab-start");
  expect(stateOf(wrapper).phase).toBe("running");
  return wrapper;
}
async function advanceToRequest(wrapper: LabWrapper): Promise<LabRequest> {
  for (let count = 0; count < 20; count += 1) {
    const request = stateOf(wrapper).requests.find(
      (item) => item.status === "pending",
    );
    if (request) return request;
    await click(wrapper, "lab-next");
  }
  throw new Error("No explicit request arrived through visible DOM controls");
}
async function finishThroughEvents(wrapper: LabWrapper): Promise<LabState> {
  for (let count = 0; count < 60; count += 1) {
    const state = stateOf(wrapper);
    if (state.phase === "ended") {
      expect(nextDisabled(wrapper)).toBe(true);
      return state;
    }
    expect(state.requests.filter((item) => item.status === "pending")).toEqual(
      [],
    );
    const cursor = Number(
      wrapper.get(byId("lab-next")).attributes("data-cursor"),
    );
    expect(cursor).toBeLessThan(queueOf(wrapper).length);
    await click(wrapper, "lab-next");
  }
  throw new Error("The selected branch did not close through DOM controls");
}
async function completeFixtureThroughControls(
  wrapper: LabWrapper,
): Promise<LabState> {
  for (let count = 0; count < 60; count += 1) {
    const state = stateOf(wrapper);
    if (state.phase === "ended") return state;
    const cursor = Number(
      wrapper.get(byId("lab-next")).attributes("data-cursor"),
    );
    const next = queueOf(wrapper)[cursor];
    expect(next).toBeDefined();
    const request = state.requests.find((item) => item.status === "pending");
    if (next?.scriptedOperator && next.action.type === "prioritize-step") {
      await wrapper.get(byId("lab-priority-step")).setValue(next.action.stepId);
      await click(wrapper, "lab-prioritize");
      expect(stateOf(wrapper).collaboration?.stepOrder).toEqual([
        "s-a",
        "s-c",
        "s-b",
      ]);
      // The UI skips fixture operator actions after the real form submission.
      await click(wrapper, "lab-next");
    } else if (next?.scriptedOperator && request) {
      if (next.action.type === "add-constraint") {
        await wrapper
          .get(byId("lab-constraint-road"))
          .setValue(next.action.roadIds[0]);
        await click(wrapper, "lab-add-constraint");
      } else if (next.action.type === "respond") {
        if (
          request.options.some(
            (option) => option.effect === "provide-observation-point",
          )
        ) {
          await wrapper
            .get(byId("lab-observation-point"))
            .setValue(next.action.optionId);
          await click(wrapper, "lab-submit-observation");
        } else {
          for (const [key, value] of Object.entries(next.action.values ?? {})) {
            await wrapper
              .get(byId(`lab-field-${request.id}-${key}`))
              .setValue(value);
          }
          await click(
            wrapper,
            `lab-response-${request.id}-${next.action.optionId}`,
          );
        }
      } else throw new Error("Unsupported fixture operator action");
    } else await click(wrapper, "lab-next");
  }
  throw new Error("Fixture did not close within 60 DOM actions");
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
    device: { ...state.device, lastConfirmedAt: 0 },
    commands: state.commands.map(({ kind, status }) => ({ kind, status })),
    ...(state.collaboration
      ? {
          collaboration: {
            ...state.collaboration,
            contributions: state.collaboration.contributions.map(
              ({ kind, detail, stepIds, planVersion }) => ({
                kind,
                detail,
                stepIds,
                planVersion,
              }),
            ),
          },
        }
      : {}),
  };
}
async function exportAndReplay(
  wrapper: LabWrapper,
  name: string,
): Promise<ExportedRun> {
  await click(wrapper, "lab-export");
  const document: ExportedRun = JSON.parse(
    (wrapper.get(byId("lab-export-json")).element as HTMLTextAreaElement).value,
  );
  expect(document.experiment).toBe("deterministic-simulation");
  expect(document.connectedToRealDevice).toBe(false);
  expect(document.connectedToRealAgent).toBe(false);
  expect(document.executionQueue).toEqual(queueOf(wrapper));
  expect(document.state).toEqual(stateOf(wrapper));
  const replayed = document.inputActions.reduce(
    dispatchLabAction,
    createInitialState(
      document.state.runId,
      LAB_SCENARIOS.find((scenario) => scenario.id === document.scenarioId)
        ?.collaboration,
    ),
  );
  expect(replayed).toEqual(document.state);
  expect(document.inputActions).toHaveLength(document.state.logs.length);
  // Let the genuine export-handler cleanup timer run before restoring URL stubs.
  await new Promise<void>((done) => window.setTimeout(done, 0));
  const evidenceRoot = process.env.INTERVENTION_LAB_EVIDENCE_DIR;
  if (evidenceRoot) {
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(
      resolve(evidenceRoot, `${name}.json`),
      `${JSON.stringify(
        {
          ...document,
          verificationDriver: "vue-test-utils-jsdom-dom-clicks",
          realBrowserLayoutVerified: false,
          downloadTransportStubbed: true,
          humanPerformanceEvidence: false,
          exportedActionReplayMatched: true,
        },
        null,
        2,
      )}\n`,
    );
  }
  return document;
}

describe("InterventionLabPage Vue/DOM integration (not browser layout)", () => {
  for (const mode of ["fixed", "dynamic"]) {
    for (const scenario of LAB_SCENARIOS) {
      it(`${mode}: ${scenario.id} uses visible controls and exports a replayable closed loop`, async () => {
        const wrapper = await begin(scenario.id, mode);
        const final = await completeFixtureThroughControls(wrapper);
        expect(facts(final)).toEqual(facts(runScenario(scenario)));
        expect(
          final.roads
            .filter((road) => road.status === "unchecked")
            .every((road) => road.condition === "unknown"),
        ).toBe(true);
        expect(
          final.logs
            .filter((log) => log.actionType === "respond" && log.accepted)
            .every((log) => log.inputProvenance === "interactive"),
        ).toBe(true);
        await exportAndReplay(wrapper, `dom-${scenario.id}-${mode}`);
      });
    }
  }

  it("mode switching preserves exact state and shared response buttons; exported actions replay exactly", async () => {
    const wrapper = await begin("navigation-failure");
    const request = await advanceToRequest(wrapper);
    const before = stateOf(wrapper);
    const buttons = () =>
      wrapper.findAll(".request-actions button").map((button) => ({
        text: button.text(),
        id: button.attributes("data-testid"),
        disabled: (button.element as HTMLButtonElement).disabled,
      }));
    const originalButtons = buttons();
    await click(wrapper, "lab-mode-fixed");
    expect(wrapper.attributes("data-mode")).toBe("fixed");
    expect(stateOf(wrapper)).toEqual(before);
    expect(buttons()).toEqual(originalButtons);
    await click(wrapper, "lab-mode-dynamic");
    expect(wrapper.attributes("data-mode")).toBe("dynamic");
    expect(stateOf(wrapper)).toEqual(before);
    expect(buttons()).toEqual(originalButtons);
    await click(wrapper, `lab-response-${request.id}-defer`);
    const applied = stateOf(wrapper);
    await click(wrapper, `lab-stale-${request.id}`);
    expect(stateOf(wrapper).logs.at(-1)?.accepted).toBe(false);
    expect(facts(stateOf(wrapper))).toEqual(facts(applied));
    await finishThroughEvents(wrapper);
    await exportAndReplay(wrapper, "dom-mode-parity-and-duplicate");
  });

  it("retry remains unobserved until explicit branch fixtures complete it", async () => {
    const wrapper = await begin("navigation-failure");
    const request = await advanceToRequest(wrapper);
    await click(wrapper, `lab-response-${request.id}-retry`);
    const retry = stateOf(wrapper);
    expect(retry.steps.find((step) => step.id === "s-b")?.status).toBe(
      "pending",
    );
    expect(retry.roads.find((road) => road.id === "r-b")).toMatchObject({
      status: "unchecked",
      condition: "unknown",
      evidence: [],
    });
    const final = await finishThroughEvents(wrapper);
    expect(final.outcome).toBe("complete");
    expect(wrapper.get(byId("lab-branch-note")).text()).toContain(
      "不表示真实设备恢复成功",
    );
    expect(
      final.roads.find((road) => road.id === "r-b")?.evidence[0]?.detail,
    ).toContain("分支成功fixture");
    await exportAndReplay(wrapper, "dom-branch-retry");
  });

  it("early end stops remaining fixture events without claiming the device paused", async () => {
    const wrapper = await begin("navigation-failure");
    const request = await advanceToRequest(wrapper);
    const before = stateOf(wrapper);
    await click(wrapper, `lab-response-${request.id}-end`);
    const final = stateOf(wrapper);
    expect(final.phase).toBe("ended");
    expect(final.outcome).toBe("partial");
    expect(final.device).toEqual(before.device);
    expect(final.commands).toEqual([]);
    expect(
      final.roads.every(
        (road) => road.status === "unchecked" && road.condition === "unknown",
      ),
    ).toBe(true);
    expect(nextDisabled(wrapper)).toBe(true);
    expect(
      (wrapper.get(byId("lab-autoplay")).element as HTMLButtonElement).disabled,
    ).toBe(true);
    const exported = await exportAndReplay(wrapper, "dom-branch-early-end");
    expect(exported.eventCursor).toBe(exported.eventCount);
    expect(
      exported.inputActions.filter((action) => action.type === "observe-road"),
    ).toEqual([]);
  });

  it("approving a deferral skips B fixture observations and preserves partial results", async () => {
    const wrapper = await begin("confirmation-reject");
    const request = await advanceToRequest(wrapper);
    await click(wrapper, `lab-response-${request.id}-approve`);
    expect(
      stateOf(wrapper).steps.find((step) => step.id === "s-b")?.status,
    ).toBe("deferred");
    const final = await finishThroughEvents(wrapper);
    expect(final.outcome).toBe("partial");
    expect(final.roads.find((road) => road.id === "r-b")).toMatchObject({
      status: "unchecked",
      condition: "unknown",
      evidence: [],
    });
    const exported = await exportAndReplay(wrapper, "dom-branch-approve");
    expect(
      exported.inputActions.filter(
        (action) => action.type === "observe-road" && action.roadId === "r-b",
      ),
    ).toEqual([]);
  });

  it("rejecting the stale-case proposal retains A and completes pending B via a declared fixture", async () => {
    const wrapper = await begin("constraint-stale");
    const request = await advanceToRequest(wrapper);
    const aEvidence = stateOf(wrapper).roads.find(
      (road) => road.id === "r-a",
    )?.evidence;
    await click(wrapper, `lab-response-${request.id}-reject`);
    expect(
      stateOf(wrapper).steps.find((step) => step.id === "s-b")?.status,
    ).toBe("pending");
    const final = await finishThroughEvents(wrapper);
    expect(final.outcome).toBe("complete");
    expect(final.constraints).toEqual([]);
    expect(final.roads.find((road) => road.id === "r-a")?.evidence).toEqual(
      aEvidence,
    );
    expect(
      final.roads.find((road) => road.id === "r-b")?.evidence[0]?.detail,
    ).toContain("分支成功fixture");
    expect(
      final.logs.some(
        (log) =>
          log.actionType === "respond" &&
          !log.accepted &&
          log.inputProvenance === "fixture-event",
      ),
    ).toBe(true);
    await exportAndReplay(wrapper, "dom-branch-reject-stale-proposal");
  });

  it("required supplement fields reject empty input before accepting a scoped exclusion", async () => {
    const wrapper = await begin("supplement-exclusion");
    const request = await advanceToRequest(wrapper);
    await click(wrapper, `lab-response-${request.id}-submit`);
    const invalid = stateOf(wrapper);
    expect(invalid.logs.at(-1)?.accepted).toBe(false);
    expect(invalid.constraints).toEqual([]);
    expect(
      invalid.requests.find((item) => item.id === request.id)?.status,
    ).toBe("pending");
    expect(wrapper.get(byId("lab-notice")).text()).toContain("必填");
    await wrapper
      .get(byId(`lab-field-${request.id}-exclusion`))
      .setValue("本次不查验C并保留未查明结果。");
    await click(wrapper, `lab-response-${request.id}-submit`);
    expect(stateOf(wrapper).constraints[0]?.roadIds).toEqual(["r-c"]);
    const final = await finishThroughEvents(wrapper);
    expect(final.outcome).toBe("partial");
    expect(final.roads.find((road) => road.id === "r-c")).toMatchObject({
      status: "unchecked",
      condition: "unknown",
      evidence: [],
    });
    await exportAndReplay(wrapper, "dom-branch-supplement");
  });

  it("running-road exclusion is refused and a new run resets all prior scoped state", async () => {
    const wrapper = await begin("normal-detour");
    await click(wrapper, "lab-next");
    const running = stateOf(wrapper);
    await wrapper.get(byId("lab-constraint-road")).setValue("r-a");
    await click(wrapper, "lab-add-constraint");
    const refused = stateOf(wrapper);
    expect(refused.logs.at(-1)?.accepted).toBe(false);
    expect(refused.steps).toEqual(running.steps);
    expect(refused.device).toEqual(running.device);
    expect(refused.constraints).toEqual([]);
    expect(wrapper.get(byId("lab-notice")).text()).toContain("暂停回执");
    await finishThroughEvents(wrapper);
    await wrapper
      .get(byId("lab-scenario-select"))
      .setValue("navigation-failure");
    await click(wrapper, "lab-start");
    await advanceToRequest(wrapper);
    await wrapper.get(byId("lab-constraint-road")).setValue("r-c");
    await click(wrapper, "lab-add-constraint");
    const previous = stateOf(wrapper);
    expect(previous.constraints).toHaveLength(1);
    expect(
      previous.requests.some((request) => request.status === "pending"),
    ).toBe(true);
    await wrapper.get(byId("lab-scenario-select")).setValue("normal-detour");
    expect(stateOf(wrapper)).toEqual(previous);
    await click(wrapper, "lab-start");
    const fresh = stateOf(wrapper);
    expect(fresh.runId).not.toBe(previous.runId);
    expect(fresh.runId).not.toBe(running.runId);
    expect(fresh.planVersion).toBe(1);
    expect(fresh.requests).toEqual([]);
    expect(fresh.constraints).toEqual([]);
    expect(fresh.commands).toEqual([]);
    expect(fresh.logs).toHaveLength(1);
    expect(
      fresh.roads.every(
        (road) =>
          road.status === "unchecked" &&
          road.condition === "unknown" &&
          road.evidence.length === 0,
      ),
    ).toBe(true);
    const exported = await exportAndReplay(
      wrapper,
      "dom-running-guard-and-reset",
    );
    expect(exported.scenarioId).toBe("normal-detour");
    expect(exported.inputActions).toHaveLength(1);
  });
});
