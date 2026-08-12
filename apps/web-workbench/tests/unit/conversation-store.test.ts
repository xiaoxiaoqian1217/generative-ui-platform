import type { RuntimeRunResult } from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import {
  createConversationState,
  failOperation,
  resolveAction,
  resolveRun,
  retryTurn,
  startAction,
  startRun,
} from "../../src/conversation/conversation-store.js";

function a2uiResult(surfaceId: string): RuntimeRunResult {
  return {
    presentation: {
      mode: "generative-ui",
      operations: [],
      requestId: "presentation-request",
      status: "completed",
      surfaceId,
    },
    presentationRequestId: "presentation-request",
    protocolVersion: "1.0",
    requestId: "request-1",
    runId: "run-1",
    status: "completed",
    threadId: "thread-1",
  };
}

function actionResult(
  surfaceId: string,
  requestId = "action-1",
): RuntimeRunResult {
  return {
    presentation: {
      mode: "generative-ui",
      operations: [],
      requestId: "presentation-request",
      status: "completed",
      surfaceId,
    },
    presentationRequestId: "presentation-request",
    protocolVersion: "1.0",
    requestId,
    runId: "run-1",
    status: "completed",
    threadId: "thread-1",
  };
}

describe("Conversation Store", () => {
  it("permits only one active operation", () => {
    const running = startRun(createConversationState(), {
      message: "第一条消息",
      requestId: "request-1",
      turnId: "turn-1",
    });

    expect(
      startRun(running, {
        message: "第二条消息",
        requestId: "request-2",
        turnId: "turn-2",
      }),
    ).toBe(running);
  });

  it("keeps an A2UI-only turn free of assistant text and makes the prior surface historical", () => {
    const first = resolveRun(
      startRun(createConversationState(), {
        message: "展示表单",
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      a2uiResult("surface-1"),
    );
    const runningAction = startAction(first, {
      requestId: "action-1",
      surfaceId: "surface-1",
      turnId: "turn-1",
    });
    const resolved = resolveAction(
      runningAction,
      "turn-1",
      actionResult("surface-2", "action-1"),
    );

    expect(resolved.turns[0]).not.toHaveProperty("assistantMessage");
    expect(resolved.turns[0]?.businessSurfaces).toMatchObject([
      { status: "historical", surfaceId: "surface-1" },
      { status: "active", surfaceId: "surface-2" },
    ]);
  });

  it("keeps failures out of assistant messages and retries with a new turn", () => {
    const failed = failOperation(
      startRun(createConversationState(), {
        message: "失败后重试",
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      { code: "WORKBENCH_REQUEST_TIMEOUT", message: "超时", retryable: true },
    );
    const retried = retryTurn(failed, "turn-1", {
      message: "ignored",
      requestId: "request-2",
      turnId: "turn-2",
    });

    expect(failed.turns[0]).toMatchObject({
      failure: { code: "WORKBENCH_REQUEST_TIMEOUT" },
      status: "failed",
    });
    expect(retried.turns).toHaveLength(2);
    expect(retried.turns[1]).toMatchObject({
      requestId: "request-2",
      status: "pending",
      userMessage: { content: "失败后重试" },
    });
  });

  it("does not retry a cancelled turn or accept a late run result", () => {
    const cancelled = failOperation(
      startRun(createConversationState(), {
        message: "取消后不重试",
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
        message: "ignored",
        requestId: "request-2",
        turnId: "turn-2",
      }),
    ).toBe(cancelled);
    expect(resolveRun(cancelled, "turn-1", a2uiResult("surface-late"))).toBe(
      cancelled,
    );
  });
});
