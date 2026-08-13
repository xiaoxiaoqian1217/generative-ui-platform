export interface InspectableOutputError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly stage?: string;
}

export type InspectableOutput =
  | {
      readonly errors: readonly InspectableOutputError[];
      readonly requestId: string;
      readonly status: "failed";
    }
  | {
      readonly errors?: readonly InspectableOutputError[];
      readonly markdown: string;
      readonly mode: "markdown";
      readonly requestId: string;
      readonly status: "completed" | "degraded";
    }
  | {
      readonly operations: readonly unknown[];
      readonly mode: "generative-ui";
      readonly requestId: string;
      readonly status: "completed" | "degraded";
      readonly surfaceId: string;
    };

function summarizeErrors(errors: readonly InspectableOutputError[]) {
  return errors.map((error) => ({
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    stage: error.stage,
  }));
}

export function summarizeInspectableOutput(result: InspectableOutput) {
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
      ? { errors: summarizeErrors(result.errors ?? []) }
      : {}),
  };
}
