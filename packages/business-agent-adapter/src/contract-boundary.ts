import {
  type BusinessAgentResumeActionRequest,
  type BusinessAgentResumeActionResult,
  type BusinessAgentRunRequest,
  type BusinessAgentRunResult,
  type PlatformError,
  validateBusinessAgentResumeActionRequest,
  validateBusinessAgentResumeActionResult,
  validateBusinessAgentRunRequest,
  validateBusinessAgentRunResult,
} from "@generative-ui/runtime-contract";

type CorrelatedRequest = Pick<
  BusinessAgentRunRequest,
  "protocolVersion" | "requestId" | "threadId" | "runId"
>;

type CorrelatedResult = Pick<
  BusinessAgentRunResult,
  "requestId" | "threadId" | "runId"
>;

function failedResult(
  request: CorrelatedRequest,
  error: PlatformError,
): BusinessAgentRunResult {
  return {
    protocolVersion: request.protocolVersion,
    requestId: request.requestId,
    threadId: request.threadId,
    runId: request.runId,
    status: "failed",
    error,
  };
}

export function adapterFailureResult(
  request: CorrelatedRequest,
  code: PlatformError["code"],
  message: string,
  retryable: boolean,
  details: Pick<PlatformError, "path" | "constraint"> = {},
): BusinessAgentRunResult {
  return failedResult(request, {
    code,
    message,
    retryable,
    requestId: request.requestId,
    threadId: request.threadId,
    runId: request.runId,
    ...details,
  });
}

function validateCorrelation(
  request: CorrelatedRequest,
  result: CorrelatedResult &
    Partial<{ status: string; error: Partial<CorrelatedResult> }>,
): { path: string; constraint: string } | undefined {
  for (const key of ["requestId", "threadId", "runId"] as const) {
    if (result[key] !== request[key]) {
      return { path: `/${key}`, constraint: "correlation-consistency" };
    }
  }
  if (result.status === "failed" && result.error !== undefined) {
    for (const key of ["requestId", "threadId", "runId"] as const) {
      if (
        result.error[key] !== undefined &&
        result.error[key] !== request[key]
      ) {
        return {
          path: `/error/${key}`,
          constraint: "correlation-consistency",
        };
      }
    }
  }
  return undefined;
}

function invalidProtocolResult(
  request: CorrelatedRequest,
  validation: { path: string; constraint: string },
): BusinessAgentRunResult {
  return adapterFailureResult(
    request,
    "BUSINESS_AGENT_PROTOCOL_INVALID",
    "The Business Agent response does not match the required contract.",
    false,
    validation,
  );
}

export function normalizeRunResult(
  request: BusinessAgentRunRequest,
  input: unknown,
): BusinessAgentRunResult {
  const validation = validateBusinessAgentRunResult(input);
  if (!validation.success) {
    return invalidProtocolResult(request, validation.error);
  }
  const correlation = validateCorrelation(request, validation.value);
  return correlation === undefined
    ? validation.value
    : invalidProtocolResult(request, correlation);
}

export function invalidRunRequestResult(
  request: BusinessAgentRunRequest,
): BusinessAgentRunResult | undefined {
  const validation = validateBusinessAgentRunRequest(request);
  if (validation.success) return undefined;
  return adapterFailureResult(
    request,
    "REQUEST_INVALID",
    "The Business Agent Run request does not match its contract.",
    false,
    {
      path: validation.error.path,
      constraint: validation.error.constraint,
    },
  );
}

export function invalidResumeActionRequestResult(
  request: BusinessAgentResumeActionRequest,
): BusinessAgentResumeActionResult | undefined {
  const validation = validateBusinessAgentResumeActionRequest(request);
  if (validation.success) return undefined;
  return adapterFailureResult(
    request,
    "REQUEST_INVALID",
    "The Business Agent Resume Action request does not match its contract.",
    false,
    {
      path: validation.error.path,
      constraint: validation.error.constraint,
    },
  );
}

export function normalizeResumeActionResult(
  request: BusinessAgentResumeActionRequest,
  input: unknown,
): BusinessAgentResumeActionResult {
  const validation = validateBusinessAgentResumeActionResult(input);
  if (!validation.success) {
    return invalidProtocolResult(request, validation.error);
  }
  const correlation = validateCorrelation(request, validation.value);
  return correlation === undefined
    ? validation.value
    : invalidProtocolResult(request, correlation);
}
