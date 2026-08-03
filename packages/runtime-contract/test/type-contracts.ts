import type {
  AgentContent,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentRunResult,
  PlatformErrorCode,
  RuntimeActionRequest,
  RuntimeRunRequest,
  RuntimeRunResult,
  RuntimeWebSocketInboundMessage,
} from "../src/index.js";

const content: AgentContent = {
  contentType: "markdown",
  markdown: "设备状态正常。",
};

const presentation: PresentationResult = {
  requestId: "presentation-1",
  status: "completed",
  mode: "markdown",
  markdown: "设备状态正常。",
};

const runRequest: RuntimeRunRequest = {
  protocolVersion: "1.0",
  requestId: "request-1",
  message: {
    role: "user",
    content: "查询设备状态",
  },
};

const actionRequest: RuntimeActionRequest = {
  protocolVersion: "1.0",
  requestId: "request-2",
  threadId: "thread-1",
  runId: "run-1",
  action: {
    actionId: "confirm-patrol",
    actionType: "patrol.confirm",
    surfaceId: "surface-1",
  },
};

const resumeRequest: BusinessAgentResumeActionRequest = {
  protocolVersion: "1.0",
  requestId: "request-2",
  threadId: "thread-1",
  runId: "run-1",
  action: actionRequest.action,
};

const businessResult: BusinessAgentRunResult = {
  protocolVersion: "1.0",
  requestId: "request-1",
  threadId: "thread-1",
  runId: "run-1",
  status: "completed",
  content,
};

const runtimeResult: RuntimeRunResult = {
  protocolVersion: "1.0",
  requestId: "request-1",
  threadId: "thread-1",
  runId: "run-1",
  presentationRequestId: "presentation-1",
  status: "completed",
  presentation,
};

const inbound: RuntimeWebSocketInboundMessage = {
  type: "runtime.run.request",
  payload: runRequest,
};

const errorCode: PlatformErrorCode = "REQUEST_TIMEOUT";

// @ts-expect-error Business Agent results must not carry presentation decisions.
businessResult.presentationDecision = { mode: "markdown", reason: "invalid" };

// @ts-expect-error Runtime action requests must include the action envelope.
actionRequest.actionId = "confirm-patrol";

void runRequest;
void actionRequest;
void resumeRequest;
void businessResult;
void runtimeResult;
void inbound;
void errorCode;
