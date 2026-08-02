import type { PresentationResult } from "@generative-ui/presentation-contract";
import { describe, expect, it } from "vitest";
import {
  validateBusinessAgentResumeActionRequest,
  validateBusinessAgentResumeActionResult,
  validateBusinessAgentRunRequest,
  validateBusinessAgentRunResult,
  validateRuntimeActionRequest,
  validateRuntimeActionResult,
  validateRuntimeRunRequest,
  validateRuntimeRunResult,
  validateRuntimeWebSocketInboundMessage,
  validateRuntimeWebSocketOutboundMessage,
} from "../src/index.js";

const markdownContent = {
  contentType: "markdown",
  markdown: "## 巡逻计划\n\n请确认任务。",
} as const;

const structuredContent = {
  contentType: "structured-data",
  data: {
    taskId: "task-1",
    status: "draft",
  },
  fallbackMarkdown: "任务草稿等待确认。",
} as const;

const completedPresentation: PresentationResult = {
  requestId: "presentation-1",
  status: "completed",
  mode: "generative-ui",
  surfaceId: "surface-1",
  operations: [
    {
      version: "v0.9",
      createSurface: {
        surfaceId: "surface-1",
      },
    },
  ],
};

describe("Business Agent contracts", () => {
  it("validates Run and Resume requests sent by Runtime Host", () => {
    expect(
      validateBusinessAgentRunRequest({
        protocolVersion: "1.0",
        requestId: "request-1",
        threadId: "thread-1",
        runId: "run-1",
        agentId: "business-agent",
        input: {
          message: "查询设备状态",
        },
        context: {
          locale: "zh-CN",
          timezone: "Asia/Shanghai",
          domain: "security-patrol",
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateBusinessAgentResumeActionRequest({
        protocolVersion: "1.0",
        requestId: "request-2",
        threadId: "thread-1",
        runId: "run-1",
        agentId: "business-agent",
        action: {
          actionId: "confirm-patrol",
          actionType: "patrol.confirm",
          surfaceId: "surface-1",
          payload: {
            taskId: "task-1",
          },
          approved: true,
        },
      }),
    ).toMatchObject({ success: true });
  });

  it("accepts only AgentContent or stable errors from Business Agent results", () => {
    expect(
      validateBusinessAgentRunResult({
        protocolVersion: "1.0",
        requestId: "request-1",
        threadId: "thread-1",
        runId: "run-1",
        status: "completed",
        content: structuredContent,
      }),
    ).toMatchObject({ success: true });

    expect(
      validateBusinessAgentResumeActionResult({
        protocolVersion: "1.0",
        requestId: "request-2",
        threadId: "thread-1",
        runId: "run-1",
        status: "failed",
        error: {
          code: "BUSINESS_AGENT_ERROR",
          message: "Business Agent rejected the action.",
          retryable: false,
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateBusinessAgentRunResult({
        protocolVersion: "1.0",
        requestId: "request-3",
        threadId: "thread-1",
        runId: "run-1",
        status: "completed",
        content: markdownContent,
        presentationDecision: {
          mode: "markdown",
          reason: "Business Agent must not choose presentation mode.",
        },
      }),
    ).toMatchObject({
      success: false,
      error: {
        code: "BUSINESS_AGENT_RESULT_INVALID",
        constraint: "additional-properties",
      },
    });
  });
});

describe("Runtime HTTP contracts", () => {
  it("validates Run and Action requests from Web", () => {
    expect(
      validateRuntimeRunRequest({
        protocolVersion: "1.0",
        requestId: "request-1",
        agentId: "business-agent",
        message: {
          role: "user",
          content: "生成巡逻计划",
        },
        presentation: {
          catalog: {
            catalogId: "security-workbench",
            catalogVersion: "1.0.0",
          },
          context: {
            locale: "zh-CN",
            viewport: {
              width: 1280,
              height: 720,
            },
          },
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateRuntimeActionRequest({
        protocolVersion: "1.0",
        requestId: "request-2",
        threadId: "thread-1",
        runId: "run-1",
        action: {
          actionId: "confirm-patrol",
          actionType: "patrol.confirm",
          surfaceId: "surface-1",
          payload: {
            taskId: "task-1",
          },
          approved: true,
        },
      }),
    ).toMatchObject({ success: true });
  });

  it("rejects malformed Runtime requests with stable error codes", () => {
    expect(
      validateRuntimeRunRequest({
        protocolVersion: "1.0",
        requestId: "request-1",
        message: {
          role: "user",
          content: "",
        },
      }),
    ).toMatchObject({
      success: false,
      error: {
        code: "RUNTIME_RUN_REQUEST_INVALID",
        constraint: "minimum-length",
      },
    });

    expect(
      validateRuntimeActionRequest({
        protocolVersion: "1.0",
        requestId: "request-2",
        threadId: "thread-1",
        runId: "run-1",
        action: {
          actionId: "confirm-patrol",
          actionType: "patrol.confirm",
        },
      }),
    ).toMatchObject({
      success: false,
      error: {
        code: "RUNTIME_ACTION_REQUEST_INVALID",
        constraint: "required",
      },
    });
  });

  it("allows Runtime results to carry PresentationResult and safe diagnostics", () => {
    expect(
      validateRuntimeRunResult({
        protocolVersion: "1.0",
        requestId: "request-1",
        threadId: "thread-1",
        runId: "run-1",
        presentationRequestId: "presentation-1",
        status: "completed",
        presentation: completedPresentation,
        diagnostics: {
          stages: [
            {
              name: "business-agent",
              status: "completed",
              durationMs: 12,
            },
            {
              name: "presentation-pipeline",
              status: "completed",
              durationMs: 8,
            },
          ],
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateRuntimeActionResult({
        protocolVersion: "1.0",
        requestId: "request-2",
        threadId: "thread-1",
        runId: "run-1",
        actionId: "confirm-patrol",
        presentationRequestId: "presentation-2",
        status: "completed",
        presentation: {
          ...completedPresentation,
          requestId: "presentation-2",
        },
      }),
    ).toMatchObject({ success: true });
  });

  it("enforces presentationRequestId correlation when Runtime carries PresentationResult", () => {
    expect(
      validateRuntimeRunResult({
        protocolVersion: "1.0",
        requestId: "request-1",
        threadId: "thread-1",
        runId: "run-1",
        presentationRequestId: "presentation-expected",
        status: "completed",
        presentation: completedPresentation,
      }),
    ).toMatchObject({
      success: false,
      error: {
        code: "RUNTIME_RUN_RESULT_INVALID",
        constraint: "presentation-request-correlation-consistency",
      },
    });
  });
});

describe("Runtime WebSocket contracts", () => {
  it("wraps Run and Action requests for WebSocket transport", () => {
    expect(
      validateRuntimeWebSocketInboundMessage({
        type: "runtime.run.request",
        payload: {
          protocolVersion: "1.0",
          requestId: "request-1",
          message: {
            role: "user",
            content: "查询设备状态",
          },
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateRuntimeWebSocketInboundMessage({
        type: "runtime.action.request",
        payload: {
          protocolVersion: "1.0",
          requestId: "request-2",
          threadId: "thread-1",
          runId: "run-1",
          action: {
            actionId: "confirm-patrol",
            actionType: "patrol.confirm",
            surfaceId: "surface-1",
          },
        },
      }),
    ).toMatchObject({ success: true });
  });

  it("wraps Run, Action and Error results for WebSocket transport", () => {
    expect(
      validateRuntimeWebSocketOutboundMessage({
        type: "runtime.run.result",
        payload: {
          protocolVersion: "1.0",
          requestId: "request-1",
          threadId: "thread-1",
          runId: "run-1",
          presentationRequestId: "presentation-1",
          status: "completed",
          presentation: completedPresentation,
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateRuntimeWebSocketOutboundMessage({
        type: "runtime.error",
        payload: {
          code: "REQUEST_INVALID",
          message: "WebSocket message does not match the Runtime contract.",
          retryable: false,
          requestId: "request-1",
        },
      }),
    ).toMatchObject({ success: true });

    expect(
      validateRuntimeWebSocketOutboundMessage({
        type: "runtime.unknown",
        payload: {},
      }),
    ).toMatchObject({
      success: false,
      error: {
        code: "RUNTIME_WEBSOCKET_MESSAGE_INVALID",
      },
    });
  });
});
