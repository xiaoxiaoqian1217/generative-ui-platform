import { describe, expect, it } from "vitest";
import {
  createConversationState,
  failOperation,
  resolveRun,
  retryTurn,
  startRun,
} from "../../src/conversation/conversation-store.js";

const userMessage = {
  id: "message-1",
  role: "user" as const,
  content: "定位无人机 01",
};

describe("Conversation Store", () => {
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
});
