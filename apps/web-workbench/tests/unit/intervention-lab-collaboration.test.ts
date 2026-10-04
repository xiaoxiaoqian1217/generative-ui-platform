import { describe, expect, it } from "vitest";
import {
  createInitialState,
  dispatchLabAction,
  getNextPlannedStepId,
  getPresentation,
  type LabAction,
  type LabState,
} from "../../src/features/intervention-lab/model.js";
import {
  LAB_SCENARIOS,
  replayScenario,
  runScenario,
} from "../../src/features/intervention-lab/scenarios.js";

const scenario = (id: string) => LAB_SCENARIOS.find((item) => item.id === id)!;
const observation = () =>
  replayScenario(scenario("observation-cooperation"), 3);
const priority = () => replayScenario(scenario("priority-cooperation"), 2);
const reply = (
  id = "reply",
  point = "point-a-north",
): Extract<LabAction, { type: "respond" }> => ({
  type: "respond",
  actionId: id,
  runId: "fixture-run",
  requestId: "request:observation-a",
  requestVersion: 1,
  optionId: point,
});
const observe: LabAction = {
  type: "observe-current-road",
  actionId: "fresh-observation",
  condition: "passable",
  detail: "Independent simulator observation feedback",
};
const complete: LabAction = {
  type: "complete-current-step",
  actionId: "fresh-completion",
};
const promote = (
  state: LabState,
  stepId = "s-c",
): Extract<LabAction, { type: "prioritize-step" }> => ({
  type: "prioritize-step",
  actionId: `priority:${stepId}`,
  runId: state.runId,
  planVersion: state.planVersion,
  stepId,
});

describe("state-driven human / simulated Agent collaboration", () => {
  it("keeps legacy state and presentation free of the new optional state", () => {
    const legacy = createInitialState();
    expect(Object.hasOwn(legacy, "collaboration")).toBe(false);
    expect(Object.hasOwn(getPresentation(legacy), "collaboration")).toBe(false);
    expect(LAB_SCENARIOS[0]!.id).toBe("normal-detour");
    expect(runScenario(scenario("normal-detour")).outcome).toBe("complete");
  });

  it("opens a parameter request during execution and refuses observation without the parameter", () => {
    const state = observation();
    expect(state.steps[0]!.status).toBe("running");
    expect(state.phase).toBe("waiting");
    expect(state.requests[0]).toMatchObject({
      id: "request:observation-a",
      status: "pending",
      stepIds: ["s-a"],
      requiredInput: { kind: "option" },
    });
    expect(state.collaboration!.observationInput!.status).toBe("requested");
    const attempted = dispatchLabAction(state, observe);
    expect(attempted.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("缺少人工选择的观测点参数"),
    });
    expect(attempted.roads).toEqual(state.roads);
    expect(attempted.device).toEqual(state.device);
    expect(dispatchLabAction(attempted, complete).steps[0]!.status).toBe(
      "running",
    );
  });

  it("also blocks observation before the simulator emits the explicit request", () => {
    const state = replayScenario(scenario("observation-cooperation"), 2);
    const attempted = dispatchLabAction(state, observe);
    expect(attempted.logs.at(-1)!.accepted).toBe(false);
    expect(attempted.collaboration!.observationInput!.status).toBe("missing");
    expect(attempted.roads[0]!.status).toBe("unchecked");
  });

  it("writes human input into execution parameters without manufacturing a road or device observation", () => {
    const before = observation();
    const provided = dispatchLabAction(before, reply());
    expect(provided.phase).toBe("running");
    expect(provided.collaboration!.observationInput).toMatchObject({
      status: "provided",
      selectedPointId: "point-a-north",
    });
    expect(provided.planVersion).toBe(2);
    expect(provided.steps[0]!.version).toBe(before.steps[0]!.version + 1);
    expect(provided.roads).toEqual(before.roads);
    expect(provided.device).toEqual(before.device);
    expect(provided.collaboration!.contributions).toHaveLength(1);
    expect(provided.collaboration!.contributions[0]).toMatchObject({
      kind: "observation-input",
      stepIds: ["s-a"],
      planVersion: 2,
    });
    const prematureCompletion = dispatchLabAction(provided, complete);
    expect(prematureCompletion.logs.at(-1)!.accepted).toBe(false);
    expect(prematureCompletion.steps[0]!.status).toBe("running");
  });

  it("uses the selected point in later simulator feedback and completes only after that feedback", () => {
    const provided = dispatchLabAction(observation(), reply());
    const observed = dispatchLabAction(provided, observe);
    expect(observed.roads[0]).toMatchObject({
      status: "observed",
      condition: "passable",
    });
    expect(observed.roads[0]!.evidence[0]!.detail).toContain("point-a-north");
    expect(observed.roads[0]!.evidence[0]!.detail).toContain("(18, 25)");
    expect(observed.device.position).toEqual({ x: 18, y: 25 });
    expect(observed.steps[0]!.status).toBe("running");
    const completed = dispatchLabAction(observed, complete);
    expect(completed.steps[0]!.status).toBe("completed");
    expect(completed.device.position).toEqual({ x: 18, y: 25 });
  });

  it("different human choices produce different actual simulator parameters and evidence", () => {
    const atPoint = (point: string) =>
      dispatchLabAction(
        dispatchLabAction(observation(), reply(`reply:${point}`, point)),
        observe,
      );
    const north = atPoint("point-a-north");
    const south = atPoint("point-a-south");
    expect(north.device.position).toEqual({ x: 18, y: 25 });
    expect(south.device.position).toEqual({ x: 18, y: 65 });
    expect(south.roads[0]!.evidence[0]!.detail).toContain("point-a-south");
    expect(north.roads[0]!.evidence[0]!.detail).not.toBe(
      south.roads[0]!.evidence[0]!.detail,
    );
  });

  it("rejects unbound, unknown, stale and duplicate parameter answers", () => {
    const pending = observation();
    const invalid: LabAction[] = [
      { ...reply("unknown"), optionId: "unlisted-location" },
      { ...reply("foreign"), runId: "other-run" },
      { ...reply("stale"), requestVersion: 2 },
    ];
    for (const action of invalid) {
      const rejected = dispatchLabAction(pending, action);
      expect(rejected.logs.at(-1)!.accepted).toBe(false);
      expect(rejected.collaboration).toEqual(pending.collaboration);
      expect(rejected.requests[0]!.status).toBe("pending");
    }
    const once = dispatchLabAction(pending, reply("once"));
    for (const action of [reply("once"), reply("new-id")]) {
      const repeated = dispatchLabAction(once, action);
      expect(repeated.logs.at(-1)!.accepted).toBe(false);
      expect(repeated.planVersion).toBe(2);
      expect(repeated.collaboration!.contributions).toHaveLength(1);
    }
  });

  it("cannot spoof a parameter write with a generic unrelated request", () => {
    let state = replayScenario(scenario("observation-cooperation"), 2);
    state = dispatchLabAction(state, {
      type: "open-request",
      actionId: "spoof-open",
      requestId: "spoof-request",
      title: "Unbound input",
      reason: "Does not own the parameter requirement",
      basis: "Test input",
      roadIds: ["r-a"],
      stepIds: ["s-a"],
      requiredInput: {
        kind: "option",
        options: [
          {
            id: "point-a-north",
            label: "Spoof",
            effect: "provide-observation-point",
          },
        ],
      },
    });
    const rejected = dispatchLabAction(state, {
      ...reply("spoof-reply"),
      requestId: "spoof-request",
    });
    expect(rejected.logs.at(-1)!.accepted).toBe(false);
    expect(rejected.collaboration!.observationInput!.status).toBe("missing");
    expect(rejected.requests[0]!.status).toBe("pending");
  });

  it("allows human priority changes while the current step runs and changes actual later execution", () => {
    const before = priority();
    const after = dispatchLabAction(before, promote(before));
    expect(after.collaboration!.stepOrder).toEqual(["s-a", "s-c", "s-b"]);
    expect(after.collaboration!.executionOrder).toEqual(["s-a"]);
    expect(after.steps).toEqual(before.steps);
    expect(after.roads).toEqual(before.roads);
    expect(after.device).toEqual(before.device);
    expect(getNextPlannedStepId(after)).toBe("s-c");
    const result = runScenario(scenario("priority-cooperation"));
    expect(result.collaboration!.executionOrder).toEqual(["s-a", "s-c", "s-b"]);
    expect(result.outcome).toBe("complete");
    expect(result.logs.every((log) => log.accepted)).toBe(true);
    expect(
      result.logs
        .filter((log) => log.actionType === "start-next-step")
        .map((log) => log.detail),
    ).toEqual([
      "模拟执行：查验西侧主路。",
      "模拟执行：查验东侧道路。",
      "模拟执行：查验中央道路。",
    ]);
  });

  it("without a human priority change, the same simulator feedback follows the original order", () => {
    const definition = scenario("priority-cooperation");
    const baseline = runScenario({
      ...definition,
      steps: definition.steps.filter((step) => !step.scriptedOperator),
    });
    const adjusted = runScenario(definition);
    expect(baseline.collaboration!.executionOrder).toEqual([
      "s-a",
      "s-b",
      "s-c",
    ]);
    expect(adjusted.collaboration!.executionOrder).toEqual([
      "s-a",
      "s-c",
      "s-b",
    ]);
    expect(baseline.outcome).toBe(adjusted.outcome);
    expect(baseline.roads.map((road) => [road.status, road.condition])).toEqual(
      adjusted.roads.map((road) => [road.status, road.condition]),
    );
  });

  it("rejects stale or foreign adjustments and never reorders a running or completed step", () => {
    const before = priority();
    const wrongActions: LabAction[] = [
      { ...promote(before), runId: "other-run" },
      { ...promote(before), planVersion: 0 },
      promote(before, "s-a"),
      promote(before, "s-b"),
    ];
    for (const action of wrongActions) {
      const rejected = dispatchLabAction(before, action);
      expect(rejected.logs.at(-1)!.accepted).toBe(false);
      expect(rejected.collaboration).toEqual(before.collaboration);
      expect(rejected.planVersion).toBe(1);
    }
    const completed = dispatchLabAction(
      dispatchLabAction(before, observe),
      complete,
    );
    expect(
      dispatchLabAction(completed, promote(completed, "s-a")).logs.at(-1)!
        .accepted,
    ).toBe(false);
    const after = dispatchLabAction(before, promote(before));
    expect(
      dispatchLabAction(after, {
        ...promote(before, "s-b"),
        actionId: "old-plan",
      }).logs.at(-1)!.accepted,
    ).toBe(false);
  });

  it("enforces the changed order even if a caller directly requests another pending step", () => {
    let state = priority();
    state = dispatchLabAction(state, promote(state));
    state = dispatchLabAction(dispatchLabAction(state, observe), complete);
    const wrongNext = dispatchLabAction(state, {
      type: "start-step",
      actionId: "wrong-next",
      stepId: "s-b",
    });
    expect(wrongNext.logs.at(-1)!.accepted).toBe(false);
    expect(wrongNext.steps[1]!.status).toBe("pending");
    const correctNext = dispatchLabAction(wrongNext, {
      type: "start-next-step",
      actionId: "scheduled-next",
    });
    expect(correctNext.steps[2]!.status).toBe("running");
    expect(correctNext.collaboration!.executionOrder).toEqual(["s-a", "s-c"]);
  });

  it("can combine a pending parameter request and an unrelated future priority adjustment", () => {
    let state = observation();
    state = dispatchLabAction(state, promote(state));
    expect(state.requests[0]!.status).toBe("pending");
    state = dispatchLabAction(state, reply());
    expect(state.requests[0]!.status).toBe("resolved");
    expect(state.collaboration!.contributions.map((item) => item.kind)).toEqual(
      ["priority-order", "observation-input"],
    );
    expect(state.planVersion).toBe(3);
  });

  it("projects the scheduler, parameter and contribution facts as an independent clone", () => {
    const state = dispatchLabAction(observation(), reply());
    const view = getPresentation(state);
    expect(view.collaboration).toEqual(state.collaboration);
    view.collaboration!.stepOrder.reverse();
    view.collaboration!.observationInput!.selectedPointId = "tampered";
    expect(state.collaboration!.stepOrder).toEqual(["s-a", "s-b", "s-c"]);
    expect(state.collaboration!.observationInput!.selectedPointId).toBe(
      "point-a-north",
    );
  });

  it("the full observation scenario completes only through parameter input and subsequent simulator feedback", () => {
    const definition = scenario("observation-cooperation");
    const result = runScenario(definition);
    expect(result.outcome).toBe("complete");
    expect(result.collaboration!.executionOrder).toEqual(["s-a", "s-b", "s-c"]);
    expect(result.logs.every((log) => log.accepted)).toBe(true);
    const unanswered = runScenario({
      ...definition,
      steps: definition.steps.filter((step) => !step.scriptedOperator),
    });
    expect(unanswered.phase).toBe("waiting");
    expect(unanswered.roads.every((road) => road.status === "unchecked")).toBe(
      true,
    );
    expect(unanswered.outcome).toBe("in-progress");
    expect(unanswered.collaboration!.executionOrder).toEqual(["s-a"]);
  });
});
