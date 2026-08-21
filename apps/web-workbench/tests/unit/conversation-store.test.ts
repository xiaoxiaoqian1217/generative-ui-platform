import { describe, expect, it } from "vitest";
import {
  appendTurnObservation,
  createConversationState,
  failOperation,
  resolveRun,
  resumeInterrupt,
  retryTurn,
  startRun,
} from "../../src/conversation/conversation-store.js";
import type { TurnObservation } from "../../src/inspect/turn-inspection.js";

const observation = (observedIndex: number, type: string): TurnObservation => ({
  hasArtifact: false,
  id: `observation-${observedIndex}`,
  observedAt: "2026-08-13T10:00:00.000Z",
  observedIndex,
  source: "agent",
  type,
});

const userMessage = {
  id: "message-1",
  role: "user" as const,
  content: "定位无人机 01",
};

describe("Conversation Store", () => {
  it("appends live observations to the active turn", () => {
    const running = startRun(createConversationState(), {
      message: userMessage,
      requestId: "request-1",
      turnId: "turn-1",
    });

    const observed = appendTurnObservation(
      running,
      "turn-1",
      observation(0, "FRONTEND_TOOL_INVOCATION"),
    );

    expect(observed.turns[0]?.observations?.map((item) => item.type)).toEqual([
      "FRONTEND_TOOL_INVOCATION",
    ]);
    expect(observed.turns[0]?.status).toBe("pending");

    const resolved = resolveRun(observed, "turn-1", {
      messages: [],
      observations: [
        observation(0, "FRONTEND_TOOL_INVOCATION"),
        observation(1, "RUN_FINISHED"),
      ],
      runId: "run-1",
      threadId: "thread-1",
    });

    expect(resolved.turns[0]?.observations?.map((item) => item.type)).toEqual([
      "FRONTEND_TOOL_INVOCATION",
      "RUN_FINISHED",
    ]);
  });

  it("permits only one active operation", () => {
    const running = startRun(createConversationState(), {
      message: userMessage,
      requestId: "request-1",
      turnId: "turn-1",
    });

    expect(
      startRun(running, {
        message: { ...userMessage, id: "message-2" },
        requestId: "request-2",
        turnId: "turn-2",
      }),
    ).toBe(running);
  });

  it("stores native AG-UI messages without wrapping an application result", () => {
    const resolved = resolveRun(
      startRun(createConversationState(), {
        message: userMessage,
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      {
        agentState: { task: { status: "completed" } },
        eventTypes: ["RUN_STARTED", "STATE_SNAPSHOT", "RUN_FINISHED"],
        messages: [
          { id: "assistant-1", role: "assistant", content: "已定位。" },
        ],
        runId: "run-1",
        runResult: { artifact: { id: "artifact-1" } },
        threadId: "thread-1",
      },
    );

    expect(resolved.turns[0]).toMatchObject({
      agentState: { task: { status: "completed" } },
      eventTypes: ["RUN_STARTED", "STATE_SNAPSHOT", "RUN_FINISHED"],
      responseMessages: [{ role: "assistant", content: "已定位。" }],
      runId: "run-1",
      runResult: { artifact: { id: "artifact-1" } },
      status: "completed",
      threadId: "thread-1",
    });
  });

  it("keeps failures out of assistant messages and retries with a new turn", () => {
    const failed = failOperation(
      startRun(createConversationState(), {
        message: userMessage,
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      { code: "WORKBENCH_REQUEST_TIMEOUT", message: "超时", retryable: true },
    );
    const retried = retryTurn(failed, "turn-1", {
      message: { ...userMessage, id: "message-2" },
      requestId: "request-2",
      turnId: "turn-2",
    });

    expect(failed.turns[0]).toMatchObject({
      failure: { code: "WORKBENCH_REQUEST_TIMEOUT" },
      responseMessages: [],
      status: "failed",
    });
    expect(retried.turns).toHaveLength(2);
    expect(retried.turns[1]).toMatchObject({
      requestId: "request-2",
      status: "pending",
      userMessage: { content: "定位无人机 01" },
    });
  });

  it("does not retry a cancelled turn or accept a late run result", () => {
    const cancelled = failOperation(
      startRun(createConversationState(), {
        message: userMessage,
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      {
        code: "WORKBENCH_REQUEST_CANCELLED",
        message: "取消",
        retryable: false,
      },
      "cancelled",
    );

    expect(
      retryTurn(cancelled, "turn-1", {
        message: { ...userMessage, id: "message-2" },
        requestId: "request-2",
        turnId: "turn-2",
      }),
    ).toBe(cancelled);
    expect(
      resolveRun(cancelled, "turn-1", {
        messages: [],
        runId: "late",
        threadId: "thread-1",
      }),
    ).toBe(cancelled);
  });

  it("attaches observations to completed and failed turns", () => {
    const running = startRun(createConversationState(), {
      message: userMessage,
      requestId: "request-1",
      turnId: "turn-1",
    });
    const completed = resolveRun(running, "turn-1", {
      messages: [{ id: "assistant-1", role: "assistant", content: "完成。" }],
      observations: [
        observation(0, "RUN_STARTED"),
        observation(1, "RUN_FINISHED"),
      ],
      runId: "run-1",
      threadId: "thread-1",
    });

    expect(completed.turns[0]?.observations?.map((item) => item.type)).toEqual([
      "RUN_STARTED",
      "RUN_FINISHED",
    ]);

    const failed = failOperation(
      startRun(createConversationState(), {
        message: userMessage,
        requestId: "request-2",
        turnId: "turn-2",
      }),
      "turn-2",
      { code: "WORKBENCH_RUN_ERROR", message: "失败", retryable: false },
      "failed",
      [observation(0, "RUN_STARTED"), observation(1, "RUN_ERROR")],
    );

    expect(failed.turns[0]?.observations?.map((item) => item.type)).toEqual([
      "RUN_STARTED",
      "RUN_ERROR",
    ]);
  });

  it("marks a run with pending interrupts as interrupted and resumes the same turn", () => {
    const running = startRun(createConversationState(), {
      message: userMessage,
      requestId: "request-1",
      turnId: "turn-1",
    });
    const interrupted = resolveRun(running, "turn-1", {
      interrupts: [{ id: "interrupt-1", reason: "need_confirmation" }],
      messages: [
        { id: "assistant-1", role: "assistant", content: "请确认是否继续。" },
      ],
      observations: [observation(0, "RUN_STARTED")],
      runId: "run-1",
      threadId: "thread-1",
    });

    expect(interrupted.turns[0]).toMatchObject({
      pendingInterrupts: [{ id: "interrupt-1", reason: "need_confirmation" }],
      status: "interrupted",
    });
    expect(interrupted.activeOperation).toBeUndefined();

    const resumed = resumeInterrupt(interrupted, "turn-1", {
      requestId: "request-2",
    });
    expect(resumed.activeOperation).toMatchObject({
      requestId: "request-2",
      turnId: "turn-1",
    });
    expect(resumed.turns[0]?.status).toBe("pending");

    const continued = resolveRun(resumed, "turn-1", {
      messages: [{ id: "assistant-2", role: "assistant", content: "已继续。" }],
      observations: [observation(0, "RUN_FINISHED")],
      runId: "run-2",
      threadId: "thread-1",
    });

    expect(continued.turns[0]).toMatchObject({
      runId: "run-2",
      status: "completed",
    });
    expect(continued.turns[0]?.pendingInterrupts).toBeUndefined();
    expect(
      continued.turns[0]?.responseMessages.map((message) => message.id),
    ).toEqual(["assistant-1", "assistant-2"]);
    // 跨 run 片段合并后 observedIndex 重新对齐为整个 Turn 的观察顺序
    expect(continued.turns[0]?.observations?.map((item) => item.type)).toEqual([
      "RUN_STARTED",
      "RUN_FINISHED",
    ]);
    expect(
      continued.turns[0]?.observations?.map((item) => item.observedIndex),
    ).toEqual([0, 1]);
  });

  it("rejects resume for turns that are not interrupted", () => {
    const completed = resolveRun(
      startRun(createConversationState(), {
        message: userMessage,
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      {
        messages: [{ id: "assistant-1", role: "assistant", content: "完成。" }],
        runId: "run-1",
        threadId: "thread-1",
      },
    );

    expect(
      resumeInterrupt(completed, "turn-1", { requestId: "request-2" }),
    ).toBe(completed);
  });
});
