import type { RuntimeRunResult } from "@generative-ui/runtime-contract";

type PresentationResult = NonNullable<RuntimeRunResult["presentation"]>;

function summarizeErrors(
  errors: Extract<PresentationResult, { errors: unknown }>["errors"],
) {
  return errors.map((error) => ({
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    stage: error.stage,
  }));
}

export function summarizePresentationResult(result: PresentationResult) {
  if (result.status === "failed") {
    return {
      requestId: result.requestId,
      status: result.status,
      errors: summarizeErrors(result.errors),
    };
  }

  if (result.mode === "generative-ui") {
    return {
      requestId: result.requestId,
      status: result.status,
      mode: result.mode,
      surfaceId: result.surfaceId,
      operationCount: result.operations.length,
      operations: "hidden; use the controlled A2UI Raw Viewer",
    };
  }

  return {
    requestId: result.requestId,
    status: result.status,
    mode: result.mode,
    markdownCharacters: result.markdown.length,
    ...(result.status === "degraded"
      ? { errors: summarizeErrors(result.errors) }
      : {}),
  };
}
