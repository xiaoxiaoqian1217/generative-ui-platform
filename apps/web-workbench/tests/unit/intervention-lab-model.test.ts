import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import {
  createInitialState,
  dispatchLabAction,
  getPresentation,
  interventionType,
  LAB_RULES,
  type LabAction,
  type LabState,
} from "../../src/features/intervention-lab/model.js";
import {
  LAB_SCENARIOS,
  replayScenario,
  runScenario,
} from "../../src/features/intervention-lab/scenarios.js";

const start: LabAction = { type: "start-task", actionId: "start" };
const startB: LabAction = {
  type: "start-step",
  actionId: "start-b",
  stepId: "s-b",
};
const failure: LabAction = {
  type: "navigation-failed",
  actionId: "fail-b",
  stepId: "s-b",
  reason:
    "Fixture: exhausted navigation recovery, not an observed blocked road.",
  recoveryExhausted: true,
  alternativeAvailable: false,
};
const reply = (actionId: string, optionId = "defer"): LabAction => ({
  type: "respond",
  runId: "fixture-run",
  actionId,
  requestId: "failure:fail-b",
  requestVersion: 1,
  optionId,
});
const apply = (...actions: LabAction[]): LabState =>
  actions.reduce(dispatchLabAction, createInitialState());
const scenario = (id: string) => LAB_SCENARIOS.find((item) => item.id === id)!;
const pendingB = () => apply(start, startB, failure);
const approvalB: LabAction = {
  type: "open-request",
  actionId: "open-approval",
  requestId: "approval-b",
  title: "明确提出的B暂缓调整",
  reason: "fixture计划变更提案",
  basis: "fixture明确约定这个提案需审批",
  roadIds: ["r-b"],
  stepIds: ["s-b"],
  requiredInput: { kind: "approval" },
};

describe("intervention lab deterministic closed loop", () => {
  it("preserves input state and records simulation, sequence, logical time and provenance", () => {
    const original = createInitialState();
    const result = dispatchLabAction(original, start);
    expect(original.phase).toBe("ready");
    expect(original.logs).toEqual([]);
    expect(result.simulation).toBe(true);
    expect(result.logs[0]).toMatchObject({
      sequence: 1,
      logicalTime: 1,
      source: "operator",
      inputProvenance: "interactive",
      actionId: "start",
      accepted: true,
      planVersion: 1,
    });
  });

  it("accepts the Vue reactive state used by the route without clone errors", () => {
    const reactiveState = reactive(createInitialState());
    const state = dispatchLabAction(reactiveState, start);
    expect(getPresentation(reactive(state)).phase).toBe("running");
    expect(reactiveState.phase).toBe("ready");
  });

  it("normal scenario completes all observations and local detour never requests intervention", () => {
    const result = runScenario(scenario("normal-detour"));
    expect(result.phase).toBe("ended");
    expect(result.outcome).toBe("complete");
    expect(result.requests).toEqual([]);
    expect(result.roads.map((road) => [road.status, road.condition])).toEqual([
      ["observed", "passable"],
      ["observed", "passable"],
      ["observed", "passable"],
    ]);
    expect(result.logs.every((log) => log.accepted)).toBe(true);
    expect(
      result.logs.every((log) => log.inputProvenance === "fixture-script"),
    ).toBe(true);
    expect(result.logs.map((log) => log.sequence)).toEqual(
      Array.from({ length: result.logs.length }, (_, index) => index + 1),
    );
  });

  it("navigation failure creates an explicit choice and never writes a blocked-road observation", () => {
    const state = pendingB();
    expect(state.phase).toBe("waiting");
    expect(state.requests[0]).toMatchObject({
      id: "failure:fail-b",
      type: "choice",
      roadIds: ["r-b"],
      stepIds: ["s-b"],
      roadVersions: { "r-b": 1 },
      stepVersions: { "s-b": 3 },
      basis: expect.stringContaining("fixture"),
    });
    expect(state.roads[1]).toMatchObject({
      status: "unchecked",
      condition: "unknown",
      evidence: [],
    });
    const result = runScenario(scenario("navigation-failure"));
    expect(result.outcome).toBe("partial");
    expect(result.steps[1]!.status).toBe("deferred");
    expect(result.roads[1]).toMatchObject({
      status: "unchecked",
      condition: "unknown",
      evidence: [],
    });
    expect(
      result.roads
        .filter((road) => road.status === "observed")
        .map((road) => road.id),
    ).toEqual(["r-a", "r-c"]);
    expect(result.logs.every((log) => log.accepted)).toBe(true);
  });

  it("recovery still ongoing or a declared available alternative does not create a human request", () => {
    const recovering = apply(start, startB, {
      ...failure,
      recoveryExhausted: false,
    });
    expect(recovering.steps[1]!.status).toBe("running");
    expect(recovering.requests).toEqual([]);
    const alternative = apply(start, startB, {
      ...failure,
      alternativeAvailable: true,
    });
    expect(alternative.steps[1]!.status).toBe("failed");
    expect(alternative.requests).toEqual([]);
  });

  it("retry changes the pending plan and only a later simulator observation can finish the step", () => {
    let state = dispatchLabAction(pendingB(), reply("retry", "retry"));
    expect(state.steps[1]).toMatchObject({ status: "pending" });
    expect(state.roads[1]!.status).toBe("unchecked");
    expect(state.planVersion).toBe(2);
    state = dispatchLabAction(state, {
      type: "start-step",
      actionId: "retry-start",
      stepId: "s-b",
    });
    state = dispatchLabAction(state, {
      type: "observe-road",
      actionId: "retry-observe",
      roadId: "r-b",
      condition: "passable",
      detail: "Simulated fresh road observation",
    });
    state = dispatchLabAction(state, {
      type: "complete-step",
      actionId: "retry-finish",
      stepId: "s-b",
    });
    expect(state.steps[1]!.status).toBe("completed");
    expect(state.roads[1]!.condition).toBe("passable");
  });

  it("requires an actual road observation before step completion", () => {
    const state = apply(start, startB, {
      type: "complete-step",
      actionId: "premature-done",
      stepId: "s-b",
    });
    expect(state.steps[1]!.status).toBe("running");
    expect(state.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("尚未取得道路观测"),
    });
  });

  it("can record blocked only from a distinct explicit simulated observation", () => {
    const state = apply(start, startB, {
      type: "observe-road",
      actionId: "blocked-observation",
      roadId: "r-b",
      condition: "blocked",
      detail:
        "Fixture sensor report: observed impassable obstacle for this simulated UGV.",
    });
    expect(state.roads[1]).toMatchObject({
      status: "observed",
      condition: "blocked",
    });
    expect(state.roads[1]!.evidence).toHaveLength(1);
  });

  it("active modification invalidates the relevant request and rejects a late answer", () => {
    const result = runScenario(scenario("constraint-stale"));
    expect(result.requests[0]).toMatchObject({
      status: "obsolete",
      resolution: expect.stringContaining("人工新增约束"),
    });
    const late = result.logs.find(
      (log) => log.actionId === "stale:late-reply",
    )!;
    expect(late).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("过期"),
    });
    expect(result.steps[1]!.status).toBe("cancelled");
    expect(result.planVersion).toBe(2);
    expect(result.roads[1]).toMatchObject({
      status: "unchecked",
      condition: "unknown",
    });
    expect(result.roads[0]!.status).toBe("observed");
    expect(result.outcome).toBe("partial");
  });

  it("unrelated observations and unrelated plan changes keep the B request usable", () => {
    let state = pendingB();
    state = dispatchLabAction(state, {
      type: "start-step",
      actionId: "unrelated-a-start",
      stepId: "s-a",
    });
    state = dispatchLabAction(state, {
      type: "observe-road",
      actionId: "unrelated-a-observe",
      roadId: "r-a",
      condition: "passable",
      detail: "A-only simulated observation",
    });
    state = dispatchLabAction(state, {
      type: "add-constraint",
      actionId: "unrelated-c-change",
      text: "本次不检查C",
      roadIds: ["r-c"],
    });
    expect(state.planVersion).toBe(2);
    expect(state.requests[0]!.status).toBe("pending");
    expect(state.requests[0]!.createdPlanVersion).toBe(1);
    state = dispatchLabAction(state, reply("still-valid"));
    expect(state.requests[0]!.status).toBe("resolved");
    expect(state.steps[1]!.status).toBe("deferred");
    expect(state.logs.at(-1)!.accepted).toBe(true);
  });

  it("rejects the wrong request version without changing the plan", () => {
    const state = dispatchLabAction(pendingB(), {
      type: "respond",
      runId: "fixture-run",
      actionId: "wrong-version",
      requestId: "failure:fail-b",
      requestVersion: 2,
      optionId: "defer",
    });
    expect(state.requests[0]!.status).toBe("pending");
    expect(state.planVersion).toBe(1);
    expect(state.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("版本不匹配"),
    });
  });

  it("binds replies to an experiment instance even when request IDs and versions match", () => {
    let state = createInitialState("fresh-interactive-run");
    for (const action of [start, startB, failure])
      state = dispatchLabAction(state, action);
    expect(state.requests[0]!.runId).toBe("fresh-interactive-run");
    state = dispatchLabAction(state, reply("previous-run-reply"));
    expect(state.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("其他实验实例"),
      runId: "fresh-interactive-run",
    });
    expect(state.requests[0]!.status).toBe("pending");
    expect(state.planVersion).toBe(1);
    state = dispatchLabAction(state, {
      ...reply("this-run-reply"),
      type: "respond",
      runId: "fresh-interactive-run",
      requestId: "failure:fail-b",
      requestVersion: 1,
      optionId: "defer",
    });
    expect(state.requests[0]!.status).toBe("resolved");
  });

  it("checks related object versions even if a pending status was not invalidated", () => {
    const changed = structuredClone(pendingB());
    changed.steps[1]!.version += 1;
    const state = dispatchLabAction(changed, reply("outdated-context"));
    expect(state.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("道路或步骤版本已改变"),
    });
    expect(state.steps[1]!.status).toBe("failed");
  });

  it("blocks a duplicate actionId and a second response with another actionId", () => {
    const once = dispatchLabAction(pendingB(), reply("reply-once"));
    const duplicate = dispatchLabAction(once, reply("reply-once"));
    expect(duplicate.planVersion).toBe(once.planVersion);
    expect(duplicate.requests).toEqual(once.requests);
    expect(duplicate.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("重复动作"),
    });
    const again = dispatchLabAction(
      duplicate,
      reply("different-id-same-request"),
    );
    expect(again.planVersion).toBe(once.planVersion);
    expect(again.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("已经处理"),
    });
  });

  it("rejects unknown requests and answer options", () => {
    const state = dispatchLabAction(
      pendingB(),
      reply("unknown-option", "nonexistent"),
    );
    expect(state.logs.at(-1)!.accepted).toBe(false);
    expect(state.requests[0]!.status).toBe("pending");
    const absent = dispatchLabAction(state, {
      type: "respond",
      runId: "fixture-run",
      actionId: "absent-request",
      requestId: "absent",
      requestVersion: 1,
      optionId: "approve",
    });
    expect(absent.logs.at(-1)!.accepted).toBe(false);
  });

  it("approval rejection preserves the previous requirement and needs observations for success", () => {
    const early = replayScenario(scenario("confirmation-reject"), 3);
    expect(early.requests[0]).toMatchObject({
      type: "confirm",
      status: "resolved",
      resolution: "拒绝调整",
    });
    expect(early.steps[1]!.status).toBe("pending");
    expect(early.roads.every((road) => road.status === "unchecked")).toBe(true);
    expect(runScenario(scenario("confirmation-reject")).outcome).toBe(
      "complete",
    );
  });

  it("approval acceptance defers the explicitly associated step and preserves unknown facts", () => {
    const state = apply(start, approvalB, {
      type: "respond",
      runId: "fixture-run",
      actionId: "approve",
      requestId: "approval-b",
      requestVersion: 1,
      optionId: "approve",
    });
    expect(state.steps[1]!.status).toBe("deferred");
    expect(state.roads[1]!.condition).toBe("unknown");
    expect(state.requests[0]!.status).toBe("resolved");
  });

  it("a second overlapping request is invalidated when the first changes its plan scope", () => {
    const second: LabAction = {
      ...approvalB,
      actionId: "second-open",
      requestId: "second-approval",
    };
    let state = apply(start, approvalB, second);
    state = dispatchLabAction(state, {
      type: "respond",
      runId: "fixture-run",
      actionId: "first-approve",
      requestId: "approval-b",
      requestVersion: 1,
      optionId: "approve",
    });
    expect(state.requests.map((request) => request.status)).toEqual([
      "resolved",
      "obsolete",
    ]);
  });

  it("rejects a retry proposal that would reset a running step", () => {
    const request: LabAction = {
      ...approvalB,
      requiredInput: {
        kind: "option",
        options: [{ id: "retry", label: "重试", effect: "retry-step" }],
      },
    };
    const state = apply(start, startB, request, {
      type: "respond",
      runId: "fixture-run",
      actionId: "invalid-retry",
      requestId: "approval-b",
      requestVersion: 1,
      optionId: "retry",
    });
    expect(state.steps[1]!.status).toBe("running");
    expect(state.planVersion).toBe(1);
    expect(state.requests[0]!.status).toBe("pending");
    expect(state.logs.at(-1)!.accepted).toBe(false);
  });

  it("approval cannot cancel a running step before a pause receipt", () => {
    const state = apply(start, startB, approvalB, {
      type: "respond",
      runId: "fixture-run",
      actionId: "invalid-active-approval",
      requestId: "approval-b",
      requestVersion: 1,
      optionId: "approve",
    });
    expect(state.steps[1]!.status).toBe("running");
    expect(state.device.execution).toBe("running");
    expect(state.requests[0]!.status).toBe("pending");
    expect(state.logs.at(-1)!.accepted).toBe(false);
  });

  it("supplement validates required fields and maps an explicit exclusion to related future steps", () => {
    const definition = scenario("supplement-exclusion");
    const pending = replayScenario(definition, 2);
    const invalid = dispatchLabAction(pending, {
      type: "respond",
      runId: "fixture-run",
      actionId: "empty-supplement",
      requestId: "request:supplement-c",
      requestVersion: 1,
      optionId: "submit",
      values: { exclusion: "  " },
    });
    expect(invalid.logs.at(-1)!.accepted).toBe(false);
    expect(invalid.requests[0]!.status).toBe("pending");
    const result = runScenario(definition);
    expect(result.requests[0]!.type).toBe("supplement");
    expect(result.constraints[0]).toMatchObject({ roadIds: ["r-c"] });
    expect(result.steps[2]!.status).toBe("cancelled");
    expect(result.roads[2]).toMatchObject({
      condition: "unknown",
      evidence: [],
    });
    expect(result.outcome).toBe("partial");
  });

  it("classifies four interaction types only from explicitly required input shapes", () => {
    expect(interventionType({ kind: "approval" })).toBe("confirm");
    expect(interventionType({ kind: "option", options: [] })).toBe("choice");
    expect(interventionType({ kind: "fields", fields: [] })).toBe("supplement");
    expect(interventionType({ kind: "command", commands: [] })).toBe("control");
  });

  it("marks a pause while disconnected as queued and never confirmed until a matching device receipt", () => {
    let state = apply(
      start,
      startB,
      { type: "link-lost", actionId: "lost" },
      { type: "pause-command", actionId: "pause", commandId: "cmd-1" },
    );
    const lastPosition = state.device.position;
    const lastTime = state.device.lastConfirmedAt;
    expect(state.device).toMatchObject({
      link: "offline",
      execution: "unknown",
    });
    expect(state.commands[0]!.status).toBe("queued");
    state = dispatchLabAction(state, {
      type: "device-ack",
      actionId: "premature-ack",
      commandId: "cmd-1",
    });
    expect(state.logs.at(-1)!.accepted).toBe(false);
    expect(state.device.execution).toBe("unknown");
    state = dispatchLabAction(state, {
      type: "link-restored",
      actionId: "restored",
    });
    expect(state.commands[0]!.status).toBe("sent");
    expect(state.device.execution).toBe("unknown");
    expect(state.device.position).toEqual(lastPosition);
    expect(state.device.lastConfirmedAt).toBe(lastTime);
    state = dispatchLabAction(state, {
      type: "device-ack",
      actionId: "matching-ack",
      commandId: "cmd-1",
    });
    expect(state.commands[0]!.status).toBe("acknowledged");
    expect(state.device.execution).toBe("paused");
    expect(state.device.lastConfirmedAt).toBe(state.logicalTime);
  });

  it("online pause sending is also unconfirmed until the device ack, and rejects duplicate or absent receipts", () => {
    let state = apply(start, {
      type: "pause-command",
      actionId: "pause",
      commandId: "cmd-1",
    });
    expect(state.commands[0]!.status).toBe("sent");
    expect(state.device.execution).toBe("running");
    state = dispatchLabAction(state, {
      type: "pause-command",
      actionId: "pause2",
      commandId: "cmd-2",
    });
    expect(state.commands).toHaveLength(1);
    expect(state.logs.at(-1)!.accepted).toBe(false);
    state = dispatchLabAction(state, {
      type: "device-ack",
      actionId: "wrong-ack",
      commandId: "missing",
    });
    expect(state.device.execution).toBe("running");
    state = dispatchLabAction(state, {
      type: "device-ack",
      actionId: "ack",
      commandId: "cmd-1",
    });
    state = dispatchLabAction(state, {
      type: "device-ack",
      actionId: "dup-ack",
      commandId: "cmd-1",
    });
    expect(state.logs.at(-1)!.accepted).toBe(false);
    expect(state.device.execution).toBe("paused");
  });

  it("control scenario ends partially with a simulated ack and retains all unobserved roads", () => {
    const result = runScenario(scenario("link-command-ack"));
    expect(result.phase).toBe("ended");
    expect(result.device.execution).toBe("paused");
    expect(result.commands[0]).toMatchObject({ status: "acknowledged" });
    expect(
      result.requests.every(
        (request) =>
          request.type === "control" && request.status === "resolved",
      ),
    ).toBe(true);
    expect(
      result.roads.every(
        (road) => road.status === "unchecked" && road.condition === "unknown",
      ),
    ).toBe(true);
    expect(result.outcome).toBe("partial");
    expect(result.logs.every((log) => log.accepted)).toBe(true);
  });

  it("rejects live simulator detour, observation, completion and failure when offline or paused", () => {
    const events: LabAction[] = [
      { type: "local-detour", actionId: "detour", stepId: "s-b" },
      {
        type: "observe-road",
        actionId: "observe",
        roadId: "r-b",
        condition: "passable",
        detail: "invalid live event",
      },
      { type: "complete-step", actionId: "complete", stepId: "s-b" },
      failure,
    ];
    const offline = apply(start, startB, {
      type: "link-lost",
      actionId: "lost",
    });
    const paused = apply(
      start,
      startB,
      { type: "pause-command", actionId: "pause", commandId: "cmd" },
      { type: "device-ack", actionId: "ack", commandId: "cmd" },
    );
    for (const blocked of [offline, paused])
      for (const event of events) {
        const state = dispatchLabAction(blocked, event);
        expect(state.logs.at(-1)!.accepted).toBe(false);
        expect(state.roads).toEqual(blocked.roads);
        expect(state.steps).toEqual(blocked.steps);
        expect(state.device.lastConfirmedAt).toBe(
          blocked.device.lastConfirmedAt,
        );
      }
  });

  it("a single simulated UGV cannot run two road-check steps at the same time", () => {
    const state = apply(start, startB, {
      type: "start-step",
      actionId: "parallel-a",
      stepId: "s-a",
    });
    expect(state.steps[0]!.status).toBe("pending");
    expect(state.logs.at(-1)).toMatchObject({
      accepted: false,
      detail: expect.stringContaining("只有一台UGV"),
    });
  });

  it("cannot finish with unresolved requests or pending execution and ignores events after ending", () => {
    const unresolved = dispatchLabAction(pendingB(), {
      type: "finish-task",
      actionId: "finish",
    });
    expect(unresolved.phase).toBe("waiting");
    expect(unresolved.logs.at(-1)!.accepted).toBe(false);
    const pending = apply(start, {
      type: "finish-task",
      actionId: "premature-finish",
    });
    expect(pending.phase).toBe("running");
    expect(pending.logs.at(-1)!.accepted).toBe(false);
    const ended = runScenario(scenario("normal-detour"));
    const late = dispatchLabAction(ended, {
      type: "add-constraint",
      actionId: "late-change",
      roadIds: ["r-b"],
      text: "late",
    });
    expect(late.outcome).toBe("complete");
    expect(late.planVersion).toBe(ended.planVersion);
    expect(late.logs.at(-1)!.accepted).toBe(false);
  });

  it("exposes the exact same facts and allowed request options through a mode-neutral presentation", () => {
    const state = pendingB();
    const first = getPresentation(state);
    const second = getPresentation(state);
    expect(first).toEqual(second);
    expect(first.roads).toEqual(state.roads);
    expect(first.pendingRequests[0]!.options).toEqual(
      state.requests[0]!.options,
    );
    expect(first.uncheckedRoadIds).toEqual(["r-a", "r-b", "r-c"]);
    expect(first.focusRoadIds).toEqual(["r-b"]);
    expect(first.rules).toEqual(LAB_RULES);
    first.roads[0]!.condition = "blocked";
    expect(state.roads[0]!.condition).toBe("unknown");
  });

  it("requires pause confirmation before excluding the current step and retains acquired evidence", () => {
    let state = apply(
      start,
      { type: "start-step", actionId: "a-start", stepId: "s-a" },
      {
        type: "observe-road",
        actionId: "a-observe",
        roadId: "r-a",
        condition: "passable",
        detail: "retained fixture evidence",
      },
    );
    state = dispatchLabAction(state, {
      type: "add-constraint",
      actionId: "exclude-a",
      text: "取消A后续计划，不宣称设备已停下",
      roadIds: ["r-a"],
    });
    expect(state.steps[0]!.status).toBe("running");
    expect(state.device.execution).toBe("running");
    expect(state.commands).toEqual([]);
    expect(state.logs.at(-1)!.accepted).toBe(false);
    state = dispatchLabAction(state, {
      type: "pause-command",
      actionId: "pause-a",
      commandId: "pause-a-command",
    });
    state = dispatchLabAction(state, {
      type: "device-ack",
      actionId: "pause-a-ack",
      commandId: "pause-a-command",
    });
    state = dispatchLabAction(state, {
      type: "add-constraint",
      actionId: "exclude-a-after-ack",
      text: "暂停确认后取消A后续计划",
      roadIds: ["r-a"],
    });
    expect(state.steps[0]!.status).toBe("cancelled");
    expect(state.device.execution).toBe("paused");
    expect(state.logs.at(-1)!.accepted).toBe(true);
    expect(state.roads[0]!.evidence).toHaveLength(1);
  });

  it("does not infer traversal when road inspection finds a blockage", () => {
    const started = apply(start, startB);
    const inspected = dispatchLabAction(started, {
      type: "observe-road",
      actionId: "blocked",
      roadId: "r-b",
      condition: "blocked",
      detail: "Simulated observed obstacle",
    });
    const completed = dispatchLabAction(inspected, {
      type: "complete-step",
      actionId: "complete-blocked-inspection",
      stepId: "s-b",
    });
    expect(completed.steps[1]!.status).toBe("completed");
    expect(completed.roads[1]!.condition).toBe("blocked");
    expect(completed.device.position).toEqual(started.device.position);
  });

  it("rejects invalid explicit request scopes and malformed supplement inputs", () => {
    const unknown = apply(start, { ...approvalB, roadIds: ["unknown"] });
    expect(unknown.requests).toEqual([]);
    expect(unknown.logs.at(-1)!.accepted).toBe(false);
    const empty = apply(start, {
      ...approvalB,
      requiredInput: { kind: "fields", fields: [] },
    });
    expect(empty.requests).toEqual([]);
    expect(empty.logs.at(-1)!.accepted).toBe(false);
  });
});
