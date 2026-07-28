import { randomUUID } from "node:crypto";
import { validateUICompileRequest } from "@generative-ui/compiler-contract";
import {
  type PresentationError,
  validatePresentationResult,
} from "@generative-ui/presentation-contract";
import type { ValidationResult } from "@generative-ui/shared-types";
import type {
  AGUICompileRequest,
  AGUIRequestContext,
  ConsumablePresentationResult,
  ParsedAGUICompileRequest,
  PresentationErrorCustomEvent,
  PresentationResultCustomEvent,
  RunErrorEvent,
  RunFinishedEvent,
  RunStartedEvent,
  StepFinishedEvent,
  StepStartedEvent,
} from "./schemas.js";
import { validateAGUICompileRequest } from "./validation.js";

export type AGUIIdentifierKind = "requestId" | "threadId" | "runId";
export type AGUIIdentifierFactory = (kind: AGUIIdentifierKind) => string;

export type AGUIRequestParseCode =
  | "AG_UI_REQUEST_INVALID"
  | "AG_UI_IDENTIFIER_GENERATION_FAILED";

export type AGUICustomEventMappingCode =
  | "AG_UI_PRESENTATION_RESULT_INVALID"
  | "AG_UI_REQUEST_ID_MISMATCH";

export type NonEmptyPresentationErrors = [
  PresentationError,
  ...PresentationError[],
];

const defaultIdentifierFactory: AGUIIdentifierFactory = (kind) =>
  `${kind}-${randomUUID()}`;

function parseFailure(
  code: AGUIRequestParseCode,
  path: string,
  constraint: string,
): ValidationResult<never, AGUIRequestParseCode> {
  return {
    success: false,
    error: {
      code,
      path,
      constraint,
      message: "AG-UI compile request does not match its contract.",
    },
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function resolveIdentifier(
  input: AGUICompileRequest,
  kind: AGUIIdentifierKind,
  identifierFactory: AGUIIdentifierFactory,
): ValidationResult<string, AGUIRequestParseCode> {
  const existing = input[kind];
  if (existing !== undefined) {
    if (typeof existing !== "string" || existing.length === 0) {
      return parseFailure("AG_UI_REQUEST_INVALID", `/${kind}`, "non-empty");
    }

    return {
      success: true,
      value: existing,
    };
  }

  let generated: string;
  try {
    generated = identifierFactory(kind);
  } catch {
    return parseFailure(
      "AG_UI_IDENTIFIER_GENERATION_FAILED",
      `/${kind}`,
      "identifier-generation",
    );
  }

  if (typeof generated !== "string" || generated.length === 0) {
    return parseFailure(
      "AG_UI_IDENTIFIER_GENERATION_FAILED",
      `/${kind}`,
      "non-empty-generated-identifier",
    );
  }

  return {
    success: true,
    value: generated,
  };
}

export function parseAGUICompileRequest(
  input: unknown,
  identifierFactory: AGUIIdentifierFactory = defaultIdentifierFactory,
): ValidationResult<ParsedAGUICompileRequest, AGUIRequestParseCode> {
  if (!isRecord(input)) {
    return parseFailure("AG_UI_REQUEST_INVALID", "", "object");
  }

  const inputResult = validateAGUICompileRequest(input);
  if (!inputResult.success) {
    return parseFailure(
      "AG_UI_REQUEST_INVALID",
      inputResult.error.path,
      inputResult.error.constraint,
    );
  }
  const wireRequest = inputResult.value;

  const requestIdResult = resolveIdentifier(
    wireRequest,
    "requestId",
    identifierFactory,
  );
  if (!requestIdResult.success) {
    return requestIdResult;
  }

  const threadIdResult = resolveIdentifier(
    wireRequest,
    "threadId",
    identifierFactory,
  );
  if (!threadIdResult.success) {
    return threadIdResult;
  }

  const runIdResult = resolveIdentifier(
    wireRequest,
    "runId",
    identifierFactory,
  );
  if (!runIdResult.success) {
    return runIdResult;
  }

  const requestCandidate = {
    ...wireRequest.compileRequest,
    requestId: requestIdResult.value,
    threadId: threadIdResult.value,
    runId: runIdResult.value,
  };
  const requestResult = validateUICompileRequest(requestCandidate);
  if (!requestResult.success) {
    return parseFailure(
      "AG_UI_REQUEST_INVALID",
      requestResult.error.path,
      requestResult.error.constraint,
    );
  }

  const context: AGUIRequestContext = {
    requestId: requestIdResult.value,
    threadId: threadIdResult.value,
    runId: runIdResult.value,
  };

  return {
    success: true,
    value: {
      request: requestResult.value,
      context,
    },
  };
}

export function createRunStartedEvent(
  context: AGUIRequestContext,
): RunStartedEvent {
  return {
    type: "RUN_STARTED",
    threadId: context.threadId,
    runId: context.runId,
  };
}

export function createRunFinishedEvent(
  context: AGUIRequestContext,
): RunFinishedEvent {
  return {
    type: "RUN_FINISHED",
    threadId: context.threadId,
    runId: context.runId,
  };
}

export function createStepStartedEvent(stepName: string): StepStartedEvent {
  return {
    type: "STEP_STARTED",
    stepName,
  };
}

export function createStepFinishedEvent(stepName: string): StepFinishedEvent {
  return {
    type: "STEP_FINISHED",
    stepName,
  };
}

export function createPresentationResultEvent(
  result: ConsumablePresentationResult,
): PresentationResultCustomEvent {
  return {
    type: "CUSTOM",
    name: "generative-ui.presentation-result",
    value: {
      mappingVersion: "1.0",
      result,
    },
  };
}

export function createPresentationErrorEvent(
  errors: NonEmptyPresentationErrors,
): PresentationErrorCustomEvent {
  return {
    type: "CUSTOM",
    name: "generative-ui.presentation-error",
    value: {
      mappingVersion: "1.0",
      errors,
    },
  };
}

export function createRunErrorEvent(error: PresentationError): RunErrorEvent {
  return {
    type: "RUN_ERROR",
    message: error.message,
    code: error.code,
  };
}

function customEventMappingFailure(
  code: AGUICustomEventMappingCode,
  path: string,
  constraint: string,
): ValidationResult<never, AGUICustomEventMappingCode> {
  return {
    success: false,
    error: {
      code,
      path,
      constraint,
      message: "Presentation Result cannot be mapped to an AG-UI CustomEvent.",
    },
  };
}

export function mapPresentationResultToCustomEvent(
  context: AGUIRequestContext,
  input: unknown,
): ValidationResult<
  PresentationResultCustomEvent | PresentationErrorCustomEvent,
  AGUICustomEventMappingCode
> {
  const result = validatePresentationResult(input);
  if (!result.success) {
    return customEventMappingFailure(
      "AG_UI_PRESENTATION_RESULT_INVALID",
      result.error.path,
      result.error.constraint,
    );
  }

  if (result.value.requestId !== context.requestId) {
    return customEventMappingFailure(
      "AG_UI_REQUEST_ID_MISMATCH",
      "/requestId",
      "request-correlation-consistency",
    );
  }

  if (result.value.status === "failed") {
    const firstError = result.value.errors[0];
    if (firstError === undefined) {
      return customEventMappingFailure(
        "AG_UI_PRESENTATION_RESULT_INVALID",
        "/errors",
        "minimum-items",
      );
    }

    return {
      success: true,
      value: createPresentationErrorEvent([
        firstError,
        ...result.value.errors.slice(1),
      ]),
    };
  }

  return {
    success: true,
    value: createPresentationResultEvent(result.value),
  };
}
