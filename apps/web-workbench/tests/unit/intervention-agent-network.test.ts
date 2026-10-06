import { randomUUID } from "node:crypto";
import { HttpAgent } from "@ag-ui/client";
import {
  type AGUIEvent,
  EventSchemas,
  EventType,
  type ResumeEntry,
  type RunFinishedEvent,
  type StateSnapshotEvent,
} from "@ag-ui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LabAction,
  LabRequest,
} from "../../src/features/intervention-lab/model.js";
import {
  createInterventionAgentServer,
  type InterventionAgentState,
  type InterventionCommandResult,
  type InterventionScenarioId,
} from "../../src/features/intervention-lab/server/index.js";

type AdvanceCommand = { type: "advance"; actionId: string };
type PriorityCommand = Extract<LabAction, { type: "prioritize-step" }>;
type RunProps =
  | { operation: "start"; scenarioId: InterventionScenarioId; manual?: boolean }
  | { operation: "continue"; taskId: string };

interface LiveRun {
  agent: HttpAgent;
  threadId: string;
  events: AGUIEvent[];
  states: InterventionAgentState[];
  done: Promise<{ error?: unknown }>;
}

// Every request below crosses the real loopback HTTP boundary. Native HttpAgent
// decodes SSE and applies server state deltas; no transport or task model is mocked.
let server: ReturnType<typeof createInterventionAgentServer>;
const agents = new Set<HttpAgent>();
const runs: LiveRun[] = [];
const actionId = () => `network-test:${randomUUID()}`;
const endpoint = (path: string) =>
  new URL(`/api/intervention-agent${path}`, server.url).href;

function liveRun(
  props: RunProps,
  options: {
    threadId?: string;
    agent?: HttpAgent;
    resume?: ResumeEntry[];
    initialState?: unknown;
  } = {},
): LiveRun {
  const threadId = options.threadId ?? options.agent?.threadId ?? randomUUID();
  const agent =
    options.agent ??
    new HttpAgent({
      url: endpoint("/run"),
      threadId,
      initialState: options.initialState ?? {},
    });
  const events: AGUIEvent[] = [];
  const states: InterventionAgentState[] = [];
  const done = agent
    .runAgent(
      {
        runId: randomUUID(),
        forwardedProps: props,
        ...(options.resume ? { resume: options.resume } : {}),
      },
      {
        onEvent({ event }) {
          events.push(EventSchemas.parse(structuredClone(event)));
        },
        onStateChanged({ state }) {
          states.push(structuredClone(state) as InterventionAgentState);
        },
      },
    )
    .then(
      () => ({}),
      (error: unknown) => ({ error }),
    );
  const run = { agent, threadId, events, states, done };
  agents.add(agent);
  runs.push(run);
  return run;
}

function snapshots(run: LiveRun): InterventionAgentState[] {
  return run.events
    .filter(
      (event): event is StateSnapshotEvent =>
        event.type === EventType.STATE_SNAPSHOT,
    )
    .map((event) => event.snapshot as InterventionAgentState);
}

async function firstSnapshot(run: LiveRun): Promise<InterventionAgentState> {
  await vi.waitFor(() => expect(snapshots(run).length).toBeGreaterThan(0), {
    timeout: 3_000,
    interval: 10,
  });
  return snapshots(run)[0]!;
}

async function serverState(taskId: string): Promise<InterventionAgentState> {
  const response = await fetch(
    endpoint(`/tasks/${encodeURIComponent(taskId)}`),
    {
      signal: AbortSignal.timeout(3_000),
    },
  );
  expect(response.status).toBe(200);
  const state = (await response.json()) as InterventionAgentState;
  expect(state.schemaVersion).toBe("intervention-agent/v1");
  return state;
}

async function command(
  state: InterventionAgentState,
  action: AdvanceCommand | PriorityCommand,
  expectedRevision = state.revision,
): Promise<InterventionCommandResult> {
  const response = await fetch(
    endpoint(`/tasks/${encodeURIComponent(state.task.runId)}/commands`),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, expectedRevision }),
      signal: AbortSignal.timeout(3_000),
    },
  );
  expect(response.status).toBe(200);
  return response.json() as Promise<InterventionCommandResult>;
}

async function advance(
  state: InterventionAgentState,
  id = actionId(),
): Promise<InterventionAgentState> {
  const result = await command(state, { type: "advance", actionId: id });
  expect(result.accepted).toBe(true);
  expect(result.revision).toBeGreaterThan(state.revision);
  return serverState(state.task.runId);
}

async function completeManual(
  state: InterventionAgentState,
): Promise<InterventionAgentState> {
  let current = state;
  for (let count = 0; count < 15; count += 1) {
    if (current.task.phase === "ended") return current;
    expect(current.openInterrupts).toEqual([]);
    current = await advance(current);
  }
  throw new Error(
    "Server-owned manual scheduling did not complete within 15 commands",
  );
}

async function finish(run: LiveRun): Promise<RunFinishedEvent> {
  await vi.waitFor(
    () =>
      expect(
        run.events.some((event) => event.type === EventType.RUN_FINISHED),
      ).toBe(true),
    {
      timeout: 3_000,
      interval: 10,
    },
  );
  expect(await run.done).toEqual({});
  return [...run.events]
    .reverse()
    .find(
      (event): event is RunFinishedEvent =>
        event.type === EventType.RUN_FINISHED,
    )!;
}

function responseTo(
  state: InterventionAgentState,
  request: LabRequest,
  optionId: string,
): Extract<LabAction, { type: "respond" }> {
  return {
    type: "respond",
    actionId: actionId(),
    runId: state.task.runId,
    requestId: request.id,
    requestVersion: request.version,
    optionId,
    provenance: "interactive",
  };
}

// Invalid requests use raw SSE so the test reaches server admission rather than
// HttpAgent's local pending-interrupt guard. Every event is still schema-validated.
async function rawRun(
  threadId: string,
  props: RunProps,
  resume?: ResumeEntry[],
): Promise<AGUIEvent[]> {
  const response = await fetch(endpoint("/run"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify({
      threadId,
      runId: randomUUID(),
      state: {},
      messages: [],
      tools: [],
      context: [],
      forwardedProps: props,
      ...(resume ? { resume } : {}),
    }),
    signal: AbortSignal.timeout(3_000),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  return (await response.text())
    .split(/\r?\n\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n"),
    )
    .filter(Boolean)
    .map((data) => EventSchemas.parse(JSON.parse(data)));
}

function expectMonotonicRevisions(states: InterventionAgentState[]): void {
  expect(states.length).toBeGreaterThan(1);
  for (let index = 1; index < states.length; index += 1)
    expect(states[index]!.revision).toBeGreaterThanOrEqual(
      states[index - 1]!.revision,
    );
}

beforeEach(async () => {
  server = createInterventionAgentServer({
    host: "127.0.0.1",
    port: 0,
    tickMs: 20,
  });
  await server.start();
});

afterEach(async () => {
  for (const agent of agents) agent.abortRun();
  await server.stop();
  await Promise.all(runs.map((run) => run.done));
  agents.clear();
  runs.length = 0;
});

describe("intervention Agent over real HTTP and native AG-UI SSE", () => {
  it("interrupts for missing input, rejects invalid resume atomically, then consumes the human parameter in later feedback", async () => {
    const initialRun = liveRun({
      operation: "start",
      scenarioId: "observation-cooperation",
      manual: true,
    });
    const initial = await firstSnapshot(initialRun);
    expect(initial.task.steps.find((step) => step.id === "s-a")?.status).toBe(
      "running",
    );
    const waiting = await advance(initial);
    const request = waiting.task.requests.find(
      (item) => item.status === "pending",
    )!;
    const interrupted = await finish(initialRun);
    expect(interrupted.outcome).toEqual({
      type: "interrupt",
      interrupts: waiting.openInterrupts,
    });
    expect(waiting.openInterrupts[0]).toMatchObject({
      id: request.id,
      reason: "input_required",
      metadata: { taskId: waiting.task.runId, requestVersion: request.version },
    });
    expect(waiting.task.phase).toBe("waiting");
    expect(waiting.task.outcome).toBe("in-progress");
    expect(
      waiting.task.roads.every((road) => road.condition === "unknown"),
    ).toBe(true);

    const blockedAdvance = await command(waiting, {
      type: "advance",
      actionId: actionId(),
    });
    expect(blockedAdvance.accepted).toBe(false);
    expect(await serverState(waiting.task.runId)).toEqual(waiting);
    const withoutResume = await rawRun(initialRun.threadId, {
      operation: "continue",
      taskId: waiting.task.runId,
    });
    expect(
      withoutResume.some((event) => event.type === EventType.RUN_ERROR),
    ).toBe(true);
    expect(await serverState(waiting.task.runId)).toEqual(waiting);
    for (const payload of [
      responseTo(waiting, request, ""),
      responseTo(waiting, request, "unknown-point"),
      {
        ...responseTo(waiting, request, "point-a-north"),
        requestVersion: request.version + 1,
      },
    ]) {
      const rejected = await rawRun(
        initialRun.threadId,
        { operation: "continue", taskId: waiting.task.runId },
        [{ interruptId: request.id, status: "resolved", payload }],
      );
      expect(rejected.some((event) => event.type === EventType.RUN_ERROR)).toBe(
        true,
      );
      expect(await serverState(waiting.task.runId)).toEqual(waiting);
    }

    const payload = responseTo(waiting, request, "point-a-north");
    const resumed = liveRun(
      { operation: "continue", taskId: waiting.task.runId },
      {
        agent: initialRun.agent,
        resume: [{ interruptId: request.id, status: "resolved", payload }],
      },
    );
    const provided = await firstSnapshot(resumed);
    expect(provided.openInterrupts).toEqual([]);
    expect(provided.task.collaboration?.observationInput).toMatchObject({
      status: "provided",
      selectedPointId: "point-a-north",
    });
    expect(provided.task.roads).toEqual(waiting.task.roads);
    expect(provided.task.device.position).toEqual(waiting.task.device.position);
    expect(provided.task.steps.find((step) => step.id === "s-a")?.status).toBe(
      "running",
    );
    expect(provided.inputActions.at(-1)).toEqual(payload);

    const observed = await advance(provided);
    expect(
      observed.task.roads.find((road) => road.id === "r-a")?.evidence[0]
        ?.detail,
    ).toContain("point-a-north");
    expect(observed.task.device.position).toEqual({ x: 18, y: 25 });
    expect(observed.task.steps.find((step) => step.id === "s-a")?.status).toBe(
      "running",
    );
    await vi.waitFor(() => expect(resumed.agent.state).toEqual(observed));
    const completed = await completeManual(observed);
    expect((await finish(resumed)).outcome).toEqual({ type: "success" });
    expect(completed.task.outcome).toBe("complete");
    expect(completed.task.collaboration?.contributions).toHaveLength(1);
    expect(
      completed.task.roads.every((road) => road.status === "observed"),
    ).toBe(true);
    expectMonotonicRevisions(resumed.states);
    const repeated = await rawRun(
      initialRun.threadId,
      { operation: "continue", taskId: completed.task.runId },
      [{ interruptId: request.id, status: "resolved", payload }],
    );
    expect(repeated.some((event) => event.type === EventType.RUN_ERROR)).toBe(
      true,
    );
    expect(await serverState(completed.task.runId)).toEqual(completed);
  }, 10_000);

  it("reads human priority in actual server scheduling, while the unchanged run executes the original order", async () => {
    for (const prioritize of [true, false]) {
      const run = liveRun({
        operation: "start",
        scenarioId: "priority-cooperation",
        manual: true,
      });
      let current = await firstSnapshot(run);
      expect(current.task.collaboration?.executionOrder).toEqual(["s-a"]);
      if (prioritize) {
        const result = await command(current, {
          type: "prioritize-step",
          actionId: actionId(),
          runId: current.task.runId,
          planVersion: current.task.planVersion,
          stepId: "s-c",
        });
        expect(result.accepted).toBe(true);
        const changed = await serverState(current.task.runId);
        expect(changed.task.collaboration?.stepOrder).toEqual([
          "s-a",
          "s-c",
          "s-b",
        ]);
        expect(changed.task.roads).toEqual(current.task.roads);
        expect(changed.task.device).toEqual(current.task.device);
        expect(
          changed.task.steps.find((step) => step.id === "s-a")?.status,
        ).toBe("running");
        current = changed;
      }
      current = await advance(current); // Observation of A, rather than an invented human result.
      current = await advance(current); // Separate completion feedback for A.
      current = await advance(current); // Scheduler selects the next pending step.
      expect(current.task.collaboration?.executionOrder).toEqual(
        prioritize ? ["s-a", "s-c"] : ["s-a", "s-b"],
      );
      const final = await completeManual(current);
      expect(final.task.collaboration?.executionOrder).toEqual(
        prioritize ? ["s-a", "s-c", "s-b"] : ["s-a", "s-b", "s-c"],
      );
      expect(final.task.outcome).toBe("complete");
      expect(final.task.roads.every((road) => road.evidence.length === 1)).toBe(
        true,
      );
      await finish(run);
      await vi.waitFor(() => expect(run.agent.state).toEqual(final));
      expectMonotonicRevisions(run.states);
    }
  }, 10_000);

  it("rejects duplicate, stale and forged commands without repeating side effects, and permits only one active run per thread", async () => {
    const run = liveRun({
      operation: "start",
      scenarioId: "priority-cooperation",
      manual: true,
    });
    const initial = await firstSnapshot(run);
    const busy = await rawRun(run.threadId, {
      operation: "continue",
      taskId: initial.task.runId,
    });
    expect(
      busy.some(
        (event) =>
          event.type === EventType.RUN_ERROR && event.code === "RUN_ACTIVE",
      ),
    ).toBe(true);
    expect(await serverState(initial.task.runId)).toEqual(initial);
    const priority: PriorityCommand = {
      type: "prioritize-step",
      actionId: actionId(),
      runId: initial.task.runId,
      planVersion: initial.task.planVersion,
      stepId: "s-c",
    };
    expect((await command(initial, priority)).accepted).toBe(true);
    const applied = await serverState(initial.task.runId);
    expect((await command(applied, priority)).accepted).toBe(false);
    expect(await serverState(initial.task.runId)).toEqual(applied);
    expect(
      (
        await command(
          applied,
          {
            ...priority,
            actionId: actionId(),
            stepId: "s-b",
            planVersion: applied.task.planVersion,
          },
          initial.revision,
        )
      ).accepted,
    ).toBe(false);
    expect(await serverState(initial.task.runId)).toEqual(applied);
    const advanceId = actionId();
    const observed = await advance(applied, advanceId);
    expect(
      (await command(observed, { type: "advance", actionId: advanceId }))
        .accepted,
    ).toBe(false);
    expect(await serverState(initial.task.runId)).toEqual(observed);
    expect(
      observed.task.roads.find((road) => road.id === "r-a")?.evidence,
    ).toHaveLength(1);
    const forged = await fetch(
      endpoint(`/tasks/${encodeURIComponent(initial.task.runId)}/commands`),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: observed.revision,
          action: {
            type: "observe-road",
            actionId: actionId(),
            roadId: "r-b",
            condition: "passable",
            detail: "client fabricated evidence",
          },
        }),
      },
    );
    expect(forged.status).toBe(400);
    expect(await serverState(initial.task.runId)).toEqual(observed);
  });

  it("reconnects with an authoritative snapshot before deltas and ignores forged client state without revision rollback", async () => {
    const original = liveRun({
      operation: "start",
      scenarioId: "priority-cooperation",
      manual: true,
    });
    const initial = await firstSnapshot(original);
    original.agent.abortRun();
    await original.done;
    const detached = await advance(await serverState(initial.task.runId));
    const forged = structuredClone(detached);
    forged.revision = 9_999;
    forged.task.phase = "ended";
    forged.task.outcome = "complete";
    for (const road of forged.task.roads) {
      road.status = "observed";
      road.condition = "passable";
    }
    const reconnected = liveRun(
      { operation: "continue", taskId: initial.task.runId },
      { threadId: original.threadId, initialState: forged },
    );
    const baseline = await firstSnapshot(reconnected);
    expect(baseline).toEqual(detached);
    expect(reconnected.events[0]?.type).toBe(EventType.RUN_STARTED);
    const firstStateEvent = reconnected.events.find(
      (event) =>
        event.type === EventType.STATE_SNAPSHOT ||
        event.type === EventType.STATE_DELTA,
    );
    expect(firstStateEvent?.type).toBe(EventType.STATE_SNAPSHOT);
    expect(baseline.revision).toBeGreaterThan(initial.revision);
    expect(baseline.task.phase).toBe("running");
    expect(baseline.task.roads.find((road) => road.id === "r-b")?.status).toBe(
      "unchecked",
    );
    const next = await advance(baseline);
    await vi.waitFor(() => expect(reconnected.agent.state).toEqual(next));
    expect(
      reconnected.events.some((event) => event.type === EventType.STATE_DELTA),
    ).toBe(true);
    expectMonotonicRevisions([...original.states, ...reconnected.states]);
  });

  it("autonomously reaches an interrupt and resumes through native HttpAgent without injected execution commands", async () => {
    const first = liveRun({
      operation: "start",
      scenarioId: "observation-cooperation",
    });
    const initial = await firstSnapshot(first);
    const interrupted = await finish(first);
    const waiting = await serverState(initial.task.runId);
    expect(interrupted.outcome).toEqual({
      type: "interrupt",
      interrupts: waiting.openInterrupts,
    });
    expect(waiting.task.phase).toBe("waiting");
    const request = waiting.task.requests.find(
      (item) => item.status === "pending",
    )!;
    const second = liveRun(
      { operation: "continue", taskId: initial.task.runId },
      {
        agent: first.agent,
        resume: [
          {
            interruptId: request.id,
            status: "resolved",
            payload: responseTo(waiting, request, "point-a-south"),
          },
        ],
      },
    );
    const provided = await firstSnapshot(second);
    expect(provided.task.collaboration?.observationInput?.selectedPointId).toBe(
      "point-a-south",
    );
    expect(provided.task.roads.find((road) => road.id === "r-a")?.status).toBe(
      "unchecked",
    );
    expect((await finish(second)).outcome).toEqual({ type: "success" });
    const final = await serverState(initial.task.runId);
    expect(final.task.phase).toBe("ended");
    expect(final.task.outcome).toBe("complete");
    expect(
      final.task.roads.find((road) => road.id === "r-a")?.evidence[0]?.detail,
    ).toContain("point-a-south");
    expect(
      second.states.some(
        (state) =>
          state.task.device.position.x === 18 &&
          state.task.device.position.y === 65 &&
          state.task.steps.find((step) => step.id === "s-a")?.status ===
            "running",
      ),
    ).toBe(true);
    expect(
      final.inputActions.filter((action) => action.type === "respond"),
    ).toHaveLength(1);
    expectMonotonicRevisions(second.states);
  });

  it("keeps automatic task execution alive after transport disconnect and supplies its latest state on continue", async () => {
    const first = liveRun({
      operation: "start",
      scenarioId: "priority-cooperation",
    });
    const initial = await firstSnapshot(first);
    expect(initial.task.phase).toBe("running");
    first.agent.abortRun();
    await first.done;
    let completed = initial;
    await vi.waitFor(
      async () => {
        completed = await serverState(initial.task.runId);
        expect(completed.task.phase).toBe("ended");
      },
      { timeout: 3_000, interval: 10 },
    );
    expect(completed.revision).toBeGreaterThan(initial.revision);
    expect(completed.task.collaboration?.executionOrder).toEqual([
      "s-a",
      "s-b",
      "s-c",
    ]);
    expect(completed.task.outcome).toBe("complete");
    const continued = liveRun(
      { operation: "continue", taskId: initial.task.runId },
      { threadId: first.threadId },
    );
    expect(await firstSnapshot(continued)).toEqual(completed);
    expect((await finish(continued)).outcome).toEqual({ type: "success" });
    expectMonotonicRevisions([...first.states, ...continued.states]);
  });
});
