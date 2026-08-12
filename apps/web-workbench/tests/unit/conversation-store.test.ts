import type {
  RuntimeActionResult,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";
import { describe, expect, it } from "vitest";
import {
  conversationMessages,
  createConversationState,
  failOperation,
  resolveAction,
  resolveLocalFrontendTool,
  resolveRun,
  restoreConversationHistory,
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
  sourcePresentationRequestId = "presentation-request",
): RuntimeActionResult {
  return {
    actionId: "confirm",
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
    sourcePresentationRequestId,
    status: "completed",
    threadId: "thread-1",
  };
}

describe("Conversation Store", () => {
  it("records local Frontend Tool output without creating Runtime Truth", () => {
    const state = resolveLocalFrontendTool(
      startRun(createConversationState(), {
        message: "定位无人机 01",
        requestId: "local-request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      "已定位无人机 01",
    );

    expect(state.activeOperation).toBeUndefined();
    expect(state.turns[0]).toMatchObject({
      localAssistantText: "已定位无人机 01",
      requestId: "local-request-1",
      status: "completed",
    });
    expect(state.turns[0]?.presentation).toBeUndefined();
    expect(state.turns[0]?.runtimeResult).toBeUndefined();
    expect(state.turns[0]?.runId).toBeUndefined();
    expect(state.turns[0]?.threadId).toBeUndefined();
  });

  it("projects only caller-owned user messages for the controlled chat", () => {
    const state = resolveRun(
      startRun(createConversationState(), {
        message: "展示 A2UI",
        requestId: "request-1",
        turnId: "turn-1",
      }),
      "turn-1",
      a2uiResult("surface-1"),
    );

    expect(conversationMessages(state)).toEqual([
      { content: "展示 A2UI", id: "turn-1:user", role: "user" },
    ]);
  });

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

  it("keeps an incompatible persisted snapshot out of rendering and exposes it only for raw inspection", () => {
    const restored = restoreConversationHistory({
      thread: {
        contractVersion: "1.0",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "active",
        threadId: "thread-1",
        title: "history",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      turns: [
        {
          contractVersion: "1.0",
          createdAt: "2026-01-01T00:00:00.000Z",
          requestId: "request-1",
          runId: "run-1",
          snapshot: {
            catalogId: "retired-catalog",
            catalogVersion: "0.9.0",
            compilerVersion: "0.9.0",
            contractVersion: "1.0",
            presentation: {
              mode: "generative-ui",
              operations: [],
              requestId: "presentation-history",
              status: "completed",
              surfaceId: "surface-history",
            },
          },
          status: "completed",
          threadId: "thread-1",
          turnId: "turn-1",
          updatedAt: "2026-01-01T00:00:00.000Z",
          userMessage: "history",
        },
      ],
    });

    expect(restored.turns[0]).toMatchObject({
      businessSurfaces: [],
      failure: { code: "HISTORY_SNAPSHOT_INCOMPATIBLE" },
      historicalSnapshotRaw: { catalogId: "retired-catalog" },
    });
    expect(restored.turns[0]?.presentation).toBeUndefined();
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
      actionResult("surface-2"),
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

  it("keeps an Action result from a different request or source presentation out of the turn", () => {
    const started = startAction(
      resolveRun(
        startRun(createConversationState(), {
          message: "展示表单",
          requestId: "request-1",
          turnId: "turn-1",
        }),
        "turn-1",
        a2uiResult("surface-1"),
      ),
      { requestId: "action-1", surfaceId: "surface-1", turnId: "turn-1" },
    );

    expect(
      resolveAction(
        started,
        "turn-1",
        actionResult("surface-2", "action-late"),
      ),
    ).toBe(started);
    expect(
      resolveAction(
        started,
        "turn-1",
        actionResult("surface-2", "action-1", "presentation-late"),
      ),
    ).toBe(started);
  });
});
