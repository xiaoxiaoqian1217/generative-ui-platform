import { describe, expect, it } from "vitest";
import {
  correlationKeyOf,
  createObservationRecorder,
  exchangeForObservation,
  lanesFromObservations,
  observationInputFromAgUiEvent,
  type TurnObservation,
} from "../../src/inspect/turn-inspection.js";

let fixtureSequence = 0;
function fixture(
  input: Partial<TurnObservation> & Pick<TurnObservation, "source" | "type">,
): TurnObservation {
  fixtureSequence += 1;
  return {
    hasArtifact: false,
    id: `observation-${fixtureSequence}`,
    observedAt: "2026-08-13T10:00:00.000Z",
    observedIndex: fixtureSequence - 1,
    ...input,
  } as TurnObservation;
}

describe("turn-inspection recorder", () => {
  it("assigns observedIndex and observedAt in workbench observed order", () => {
    const timestamps = [
      new Date("2026-08-13T10:00:00.000Z"),
      new Date("2026-08-13T10:00:00.040Z"),
    ];
    const recorder = createObservationRecorder(() => {
      const next = timestamps.shift();
      if (next === undefined) throw new Error("no timestamp left");
      return next;
    });

    const first = recorder.record({ source: "workbench", type: "RUN_INPUT" });
    const second = recorder.record({
      source: "agent",
      type: "RUN_STARTED",
    });

    expect(first.observedIndex).toBe(0);
    expect(second.observedIndex).toBe(1);
    expect(first.observedAt).toBe("2026-08-13T10:00:00.000Z");
    expect(second.observedAt).toBe("2026-08-13T10:00:00.040Z");
    expect(first.id).not.toBe(second.id);
    expect(recorder.observations()).toHaveLength(2);
  });

  it("does not mutate the recorded observations when new ones arrive", () => {
    const recorder = createObservationRecorder();
    recorder.record({ source: "workbench", type: "RUN_INPUT" });
    const snapshot = recorder.observations();
    recorder.record({ source: "agent", type: "RUN_STARTED" });

    expect(snapshot).toHaveLength(1);
    expect(recorder.observations()).toHaveLength(2);
  });
});

describe("observationInputFromAgUiEvent", () => {
  it("maps AG-UI events to agent-source observations with raw payload", () => {
    const event = {
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "message-1",
      delta: "你好",
      timestamp: 1_700_000_000_000,
    };
    const observation = observationInputFromAgUiEvent(event, {
      runId: "run-1",
      threadId: "thread-1",
    });

    expect(observation).toMatchObject({
      hasArtifact: false,
      messageId: "message-1",
      runId: "run-1",
      source: "agent",
      threadId: "thread-1",
      type: "TEXT_MESSAGE_CONTENT",
    });
    expect(observation.payload).toBe(event);
  });

  it("extracts toolCallId for tool correlation", () => {
    const observation = observationInputFromAgUiEvent(
      {
        type: "TOOL_CALL_END",
        toolCallId: "tool-call-1",
      },
      {},
    );

    expect(observation.toolCallId).toBe("tool-call-1");
  });

  it("prefers runId and threadId carried by the event itself", () => {
    const observation = observationInputFromAgUiEvent(
      { type: "RUN_STARTED", runId: "continuation-run", threadId: "thread-9" },
      { runId: "run-1", threadId: "thread-1" },
    );

    expect(observation.runId).toBe("continuation-run");
    expect(observation.threadId).toBe("thread-9");
  });

  it("marks RUN_ERROR as failed with its bounded public payload", () => {
    const observation = observationInputFromAgUiEvent(
      {
        type: "RUN_ERROR",
        code: "run_id_conflict",
        message: "run already exists",
      },
      { runId: "run-1" },
    );

    expect(observation.status).toBe("failed");
    expect(observation.hasArtifact).toBe(true);
  });

  it("marks RUN_FINISHED with interrupt outcome as interrupted with artifact", () => {
    const observation = observationInputFromAgUiEvent(
      {
        type: "RUN_FINISHED",
        outcome: {
          type: "interrupt",
          interrupts: [{ id: "interrupt-1", reason: "need_confirmation" }],
        },
      },
      {},
    );

    expect(observation.status).toBe("interrupted");
    expect(observation.hasArtifact).toBe(true);
    expect(observation.interruptId).toBe("interrupt-1");
  });

  it("treats RUN_FINISHED without result or interrupt as a process event", () => {
    const observation = observationInputFromAgUiEvent(
      { type: "RUN_FINISHED", outcome: { type: "success" } },
      {},
    );

    expect(observation.hasArtifact).toBe(false);
    expect(observation.status).toBeUndefined();
  });

  it.each([
    "STATE_SNAPSHOT",
    "STATE_DELTA",
    "ACTIVITY_SNAPSHOT",
    "ACTIVITY_DELTA",
    "TOOL_CALL_RESULT",
    "MESSAGES_SNAPSHOT",
  ])("treats %s as a contract artifact event", (type) => {
    const observation = observationInputFromAgUiEvent({ type }, {});
    expect(observation.hasArtifact).toBe(true);
  });

  it.each([
    "RUN_STARTED",
    "TEXT_MESSAGE_START",
    "TEXT_MESSAGE_CONTENT",
    "TEXT_MESSAGE_END",
    "TOOL_CALL_START",
    "TOOL_CALL_ARGS",
    "TOOL_CALL_END",
    "STEP_STARTED",
    "STEP_FINISHED",
  ])("treats %s as a process event without contract artifact", (type) => {
    const observation = observationInputFromAgUiEvent({ type }, {});
    expect(observation.hasArtifact).toBe(false);
  });
});

describe("lanesFromObservations", () => {
  it("derives lanes only from observed participants in stable order", () => {
    const recorder = createObservationRecorder();
    recorder.record({ source: "agent", type: "RUN_STARTED" });
    recorder.record({ source: "workbench", type: "RUN_INPUT" });

    expect(lanesFromObservations(recorder.observations())).toEqual([
      "workbench",
      "agent",
    ]);
  });

  it("omits lanes that have no observable facts", () => {
    const recorder = createObservationRecorder();
    recorder.record({ source: "agent", type: "RUN_STARTED" });

    expect(lanesFromObservations(recorder.observations())).toEqual(["agent"]);
  });
});

describe("exchangeForObservation", () => {
  it("pairs a frontend tool invocation with its result by toolCallId", () => {
    const invocation = fixture({
      hasArtifact: true,
      source: "frontend-tool",
      toolCallId: "tool-call-1",
      type: "FRONTEND_TOOL_INVOCATION",
    });
    const result = fixture({
      hasArtifact: true,
      source: "frontend-tool",
      status: "ok",
      toolCallId: "tool-call-1",
      type: "FRONTEND_TOOL_RESULT",
    });
    const observations = [invocation, result];

    expect(exchangeForObservation(observations, result)).toEqual({
      request: invocation,
      response: result,
    });
    expect(exchangeForObservation(observations, invocation)).toEqual({
      request: invocation,
      response: result,
    });
  });

  it("pairs an interrupt outcome with its resume input by interruptId", () => {
    const interrupt = fixture({
      hasArtifact: true,
      interruptId: "interrupt-1",
      source: "agent",
      status: "interrupted",
      type: "RUN_FINISHED",
    });
    const resume = fixture({
      hasArtifact: true,
      interruptId: "interrupt-1",
      source: "workbench",
      type: "RESUME_INPUT",
    });

    expect(exchangeForObservation([interrupt, resume], resume)).toEqual({
      request: interrupt,
      response: resume,
    });
  });

  it("pairs a run input with its protocol outcome only when runId really matches", () => {
    const input = fixture({
      hasArtifact: true,
      runId: "run-1",
      source: "workbench",
      type: "RUN_INPUT",
    });
    const finished = fixture({
      hasArtifact: true,
      runId: "run-1",
      source: "agent",
      type: "RUN_FINISHED",
    });
    const settled = fixture({
      durationMs: 42,
      runId: "run-1",
      source: "workbench",
      status: "ok",
      type: "RUN_SETTLED",
    });

    expect(exchangeForObservation([input, finished, settled], input)).toEqual({
      request: input,
      response: finished,
    });
    expect(
      exchangeForObservation([input, finished, settled], finished),
    ).toEqual({
      request: input,
      response: finished,
    });
  });

  it("falls back to the workbench settle fact when the agent reports a different runId", () => {
    const input = fixture({
      hasArtifact: true,
      runId: "run-1",
      source: "workbench",
      type: "RUN_INPUT",
    });
    const finishedWithMockId = fixture({
      hasArtifact: true,
      runId: "mock-generated-run",
      source: "agent",
      type: "RUN_FINISHED",
    });
    const settled = fixture({
      durationMs: 42,
      runId: "run-1",
      source: "workbench",
      status: "ok",
      type: "RUN_SETTLED",
    });

    expect(
      exchangeForObservation([input, finishedWithMockId, settled], input),
    ).toEqual({ request: input, response: settled });
    expect(
      exchangeForObservation([input, finishedWithMockId, settled], settled),
    ).toEqual({ request: input, response: settled });
    expect(
      exchangeForObservation(
        [input, finishedWithMockId, settled],
        finishedWithMockId,
      ),
    ).toBeUndefined();
  });

  it("returns undefined for unpaired process events", () => {
    const chunk = fixture({
      messageId: "message-1",
      source: "agent",
      type: "TEXT_MESSAGE_CONTENT",
    });
    expect(exchangeForObservation([chunk], chunk)).toBeUndefined();
  });
});

describe("correlationKeyOf", () => {
  it("correlates by toolCallId and interruptId only when really present", () => {
    expect(
      correlationKeyOf({
        hasArtifact: false,
        id: "o-1",
        observedAt: "2026-08-13T10:00:00.000Z",
        observedIndex: 0,
        source: "agent",
        toolCallId: "tool-call-1",
        type: "TOOL_CALL_END",
      }),
    ).toBe("tool:tool-call-1");
    expect(
      correlationKeyOf({
        hasArtifact: true,
        id: "o-2",
        interruptId: "interrupt-1",
        observedAt: "2026-08-13T10:00:00.000Z",
        observedIndex: 1,
        source: "agent",
        type: "RUN_FINISHED",
      }),
    ).toBe("interrupt:interrupt-1");
    expect(
      correlationKeyOf({
        hasArtifact: false,
        id: "o-3",
        observedAt: "2026-08-13T10:00:00.000Z",
        observedIndex: 2,
        source: "agent",
        type: "RUN_STARTED",
      }),
    ).toBeUndefined();
  });
});
