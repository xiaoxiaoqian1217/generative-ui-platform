import {
  agentContentSchema,
  catalogReferenceSchema,
  presentationContextSchema,
  presentationErrorSchema,
  presentationResultSchema,
} from "@generative-ui/presentation-contract";
import {
  jsonValueSchema,
  type ValidationResult,
} from "@generative-ui/shared-types";
import type { TSchema } from "@sinclair/typebox";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import {
  type BusinessAgentEvent,
  type BusinessAgentResumeActionRequest,
  type BusinessAgentResumeActionResult,
  type BusinessAgentRunRequest,
  type BusinessAgentRunResult,
  businessAgentContextSchema,
  businessAgentEventSchema,
  businessAgentResumeActionRequestSchema,
  businessAgentResumeActionResultSchema,
  businessAgentRunRequestSchema,
  businessAgentRunResultSchema,
  completedBusinessAgentResumeActionResultSchema,
  completedBusinessAgentRunResultSchema,
  completedRuntimeActionResultSchema,
  completedRuntimeRunResultSchema,
  failedBusinessAgentResumeActionResultSchema,
  failedBusinessAgentRunResultSchema,
  failedRuntimeActionResultSchema,
  failedRuntimeRunResultSchema,
  normalizedModelUsageSchema,
  type PlatformError,
  platformErrorCodeSchema,
  platformErrorSchema,
  type RuntimeActionRequest,
  type RuntimeActionResult,
  type RuntimeRunRequest,
  type RuntimeRunResult,
  type RuntimeWebSocketInboundMessage,
  type RuntimeWebSocketOutboundMessage,
  runtimeActionEnvelopeSchema,
  runtimeActionRequestSchema,
  runtimeActionResultSchema,
  runtimeDiagnosticStageNameSchema,
  runtimeDiagnosticStageSchema,
  runtimeDiagnosticStageStatusSchema,
  runtimeDiagnosticsCorrelationSchema,
  runtimeDiagnosticsSummarySchema,
  runtimeProtocolVersionSchema,
  runtimeRunRequestSchema,
  runtimeRunResultSchema,
  runtimeWebSocketInboundMessageSchema,
  runtimeWebSocketOutboundMessageSchema,
} from "./schemas.js";

const ajvOptions = {
  strict: true,
  allErrors: false,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  validateSchema: true,
  $data: false,
} as const;

export type RuntimeContractValidationCode =
  | "BUSINESS_AGENT_RESUME_ACTION_REQUEST_INVALID"
  | "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID"
  | "BUSINESS_AGENT_RUN_REQUEST_INVALID"
  | "BUSINESS_AGENT_RESULT_INVALID"
  | "BUSINESS_AGENT_EVENT_INVALID"
  | "PLATFORM_ERROR_INVALID"
  | "RUNTIME_ACTION_REQUEST_INVALID"
  | "RUNTIME_ACTION_RESULT_INVALID"
  | "RUNTIME_RUN_REQUEST_INVALID"
  | "RUNTIME_RUN_RESULT_INVALID"
  | "RUNTIME_WEBSOCKET_MESSAGE_INVALID";

function failure<TCode extends RuntimeContractValidationCode>(
  code: TCode,
  path: string,
  constraint: string,
  contractName: string,
): ValidationResult<never, TCode> {
  return {
    success: false,
    error: {
      code,
      path,
      constraint,
      message: `${contractName} does not match its contract.`,
    },
  };
}

function normalizeConstraint(error: ErrorObject | undefined): string {
  switch (error?.keyword) {
    case "additionalProperties":
      return "additional-properties";
    case "required":
      return "required";
    case "type":
      return "type";
    case "anyOf":
    case "oneOf":
      return "union";
    case "const":
      return "constant";
    case "minLength":
      return "minimum-length";
    case "minimum":
      return "minimum";
    case "pattern":
      return "format";
    default:
      return "contract";
  }
}

const commonReferencedSchemas = [
  jsonValueSchema,
  agentContentSchema,
  presentationContextSchema,
  catalogReferenceSchema,
  presentationErrorSchema,
  presentationResultSchema,
  runtimeProtocolVersionSchema,
  platformErrorCodeSchema,
  platformErrorSchema,
  runtimeDiagnosticStageNameSchema,
  runtimeDiagnosticStageStatusSchema,
  runtimeDiagnosticStageSchema,
  normalizedModelUsageSchema,
  runtimeDiagnosticsCorrelationSchema,
  runtimeDiagnosticsSummarySchema,
  runtimeActionEnvelopeSchema,
  businessAgentContextSchema,
  businessAgentEventSchema,
] as const;

function addSchemaOnce(ajv: Ajv, seenIds: Set<string>, schema: TSchema): void {
  const schemaId = typeof schema.$id === "string" ? schema.$id : undefined;
  if (!schemaId || seenIds.has(schemaId)) {
    return;
  }

  ajv.addSchema(schema);
  seenIds.add(schemaId);
}

function createAjv(referencedSchemas: readonly TSchema[] = []): Ajv {
  const ajv = new Ajv(ajvOptions);
  const seenIds = new Set<string>();
  for (const schema of commonReferencedSchemas) {
    addSchemaOnce(ajv, seenIds, schema);
  }
  for (const schema of referencedSchemas) {
    addSchemaOnce(ajv, seenIds, schema);
  }
  return ajv;
}

function createValidator<T, TCode extends RuntimeContractValidationCode>(
  schema: TSchema,
  code: TCode,
  contractName: string,
  referencedSchemas: readonly TSchema[] = [],
): (input: unknown) => ValidationResult<T, TCode> {
  const validate: ValidateFunction =
    createAjv(referencedSchemas).compile(schema);

  return (input) => {
    if (validate(input)) {
      return {
        success: true,
        value: input as T,
      };
    }

    const firstError = validate.errors?.[0];
    return failure(
      code,
      firstError?.instancePath ?? "",
      normalizeConstraint(firstError),
      contractName,
    );
  };
}

function selectByStatus(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }

  const status = (input as Record<string, unknown>).status;
  return typeof status === "string" ? status : undefined;
}

function validatePresentationCorrelation<
  TCode extends RuntimeContractValidationCode,
>(
  input: {
    presentation?: { requestId: string };
    presentationRequestId?: string;
  },
  code: TCode,
  contractName: string,
): ValidationResult<never, TCode> | undefined {
  if (
    input.presentation !== undefined &&
    input.presentationRequestId !== undefined &&
    input.presentation.requestId !== input.presentationRequestId
  ) {
    return failure(
      code,
      "/presentation/requestId",
      "presentation-request-correlation-consistency",
      contractName,
    );
  }

  return undefined;
}

export const validatePlatformError = createValidator<
  PlatformError,
  "PLATFORM_ERROR_INVALID"
>(platformErrorSchema, "PLATFORM_ERROR_INVALID", "Platform Error");

export const validateBusinessAgentRunRequest = createValidator<
  BusinessAgentRunRequest,
  "BUSINESS_AGENT_RUN_REQUEST_INVALID"
>(
  businessAgentRunRequestSchema,
  "BUSINESS_AGENT_RUN_REQUEST_INVALID",
  "Business Agent Run Request",
);

export const validateBusinessAgentResumeActionRequest = createValidator<
  BusinessAgentResumeActionRequest,
  "BUSINESS_AGENT_RESUME_ACTION_REQUEST_INVALID"
>(
  businessAgentResumeActionRequestSchema,
  "BUSINESS_AGENT_RESUME_ACTION_REQUEST_INVALID",
  "Business Agent Resume Action Request",
);

export const validateBusinessAgentEvent = createValidator<
  BusinessAgentEvent,
  "BUSINESS_AGENT_EVENT_INVALID"
>(
  businessAgentEventSchema,
  "BUSINESS_AGENT_EVENT_INVALID",
  "Business Agent Event",
);

const validateCompletedBusinessAgentRunResult = createValidator<
  BusinessAgentRunResult,
  "BUSINESS_AGENT_RESULT_INVALID"
>(
  completedBusinessAgentRunResultSchema,
  "BUSINESS_AGENT_RESULT_INVALID",
  "Business Agent Run Result",
);

const validateFailedBusinessAgentRunResult = createValidator<
  BusinessAgentRunResult,
  "BUSINESS_AGENT_RESULT_INVALID"
>(
  failedBusinessAgentRunResultSchema,
  "BUSINESS_AGENT_RESULT_INVALID",
  "Business Agent Run Result",
);

const validateBusinessAgentRunResultUnion = createValidator<
  BusinessAgentRunResult,
  "BUSINESS_AGENT_RESULT_INVALID"
>(
  businessAgentRunResultSchema,
  "BUSINESS_AGENT_RESULT_INVALID",
  "Business Agent Run Result",
);

export function validateBusinessAgentRunResult(
  input: unknown,
): ValidationResult<BusinessAgentRunResult, "BUSINESS_AGENT_RESULT_INVALID"> {
  switch (selectByStatus(input)) {
    case "completed":
      return validateCompletedBusinessAgentRunResult(input);
    case "failed":
      return validateFailedBusinessAgentRunResult(input);
    default:
      return validateBusinessAgentRunResultUnion(input);
  }
}

const validateCompletedBusinessAgentResumeActionResult = createValidator<
  BusinessAgentResumeActionResult,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID"
>(
  completedBusinessAgentResumeActionResultSchema,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID",
  "Business Agent Resume Action Result",
);

const validateFailedBusinessAgentResumeActionResult = createValidator<
  BusinessAgentResumeActionResult,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID"
>(
  failedBusinessAgentResumeActionResultSchema,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID",
  "Business Agent Resume Action Result",
);

const validateBusinessAgentResumeActionResultUnion = createValidator<
  BusinessAgentResumeActionResult,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID"
>(
  businessAgentResumeActionResultSchema,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID",
  "Business Agent Resume Action Result",
);

export function validateBusinessAgentResumeActionResult(
  input: unknown,
): ValidationResult<
  BusinessAgentResumeActionResult,
  "BUSINESS_AGENT_RESUME_ACTION_RESULT_INVALID"
> {
  switch (selectByStatus(input)) {
    case "completed":
      return validateCompletedBusinessAgentResumeActionResult(input);
    case "failed":
      return validateFailedBusinessAgentResumeActionResult(input);
    default:
      return validateBusinessAgentResumeActionResultUnion(input);
  }
}

export const validateRuntimeRunRequest = createValidator<
  RuntimeRunRequest,
  "RUNTIME_RUN_REQUEST_INVALID"
>(
  runtimeRunRequestSchema,
  "RUNTIME_RUN_REQUEST_INVALID",
  "Runtime Run Request",
);

export const validateRuntimeActionRequest = createValidator<
  RuntimeActionRequest,
  "RUNTIME_ACTION_REQUEST_INVALID"
>(
  runtimeActionRequestSchema,
  "RUNTIME_ACTION_REQUEST_INVALID",
  "Runtime Action Request",
);

const validateCompletedRuntimeRunResult = createValidator<
  RuntimeRunResult,
  "RUNTIME_RUN_RESULT_INVALID"
>(
  completedRuntimeRunResultSchema,
  "RUNTIME_RUN_RESULT_INVALID",
  "Runtime Run Result",
);

const validateFailedRuntimeRunResult = createValidator<
  RuntimeRunResult,
  "RUNTIME_RUN_RESULT_INVALID"
>(
  failedRuntimeRunResultSchema,
  "RUNTIME_RUN_RESULT_INVALID",
  "Runtime Run Result",
);

const validateRuntimeRunResultUnion = createValidator<
  RuntimeRunResult,
  "RUNTIME_RUN_RESULT_INVALID"
>(runtimeRunResultSchema, "RUNTIME_RUN_RESULT_INVALID", "Runtime Run Result");

export function validateRuntimeRunResult(
  input: unknown,
): ValidationResult<RuntimeRunResult, "RUNTIME_RUN_RESULT_INVALID"> {
  let result: ValidationResult<RuntimeRunResult, "RUNTIME_RUN_RESULT_INVALID">;
  switch (selectByStatus(input)) {
    case "completed":
    case "degraded":
      result = validateCompletedRuntimeRunResult(input);
      break;
    case "failed":
      result = validateFailedRuntimeRunResult(input);
      break;
    default:
      result = validateRuntimeRunResultUnion(input);
  }

  if (!result.success) {
    return result;
  }

  return (
    validatePresentationCorrelation(
      result.value,
      "RUNTIME_RUN_RESULT_INVALID",
      "Runtime Run Result",
    ) ?? result
  );
}

const validateCompletedRuntimeActionResult = createValidator<
  RuntimeActionResult,
  "RUNTIME_ACTION_RESULT_INVALID"
>(
  completedRuntimeActionResultSchema,
  "RUNTIME_ACTION_RESULT_INVALID",
  "Runtime Action Result",
);

const validateFailedRuntimeActionResult = createValidator<
  RuntimeActionResult,
  "RUNTIME_ACTION_RESULT_INVALID"
>(
  failedRuntimeActionResultSchema,
  "RUNTIME_ACTION_RESULT_INVALID",
  "Runtime Action Result",
);

const validateRuntimeActionResultUnion = createValidator<
  RuntimeActionResult,
  "RUNTIME_ACTION_RESULT_INVALID"
>(
  runtimeActionResultSchema,
  "RUNTIME_ACTION_RESULT_INVALID",
  "Runtime Action Result",
);

export function validateRuntimeActionResult(
  input: unknown,
): ValidationResult<RuntimeActionResult, "RUNTIME_ACTION_RESULT_INVALID"> {
  let result: ValidationResult<
    RuntimeActionResult,
    "RUNTIME_ACTION_RESULT_INVALID"
  >;
  switch (selectByStatus(input)) {
    case "completed":
    case "degraded":
      result = validateCompletedRuntimeActionResult(input);
      break;
    case "failed":
      result = validateFailedRuntimeActionResult(input);
      break;
    default:
      result = validateRuntimeActionResultUnion(input);
  }

  if (!result.success) {
    return result;
  }

  return (
    validatePresentationCorrelation(
      result.value,
      "RUNTIME_ACTION_RESULT_INVALID",
      "Runtime Action Result",
    ) ?? result
  );
}

export const validateRuntimeWebSocketInboundMessage = createValidator<
  RuntimeWebSocketInboundMessage,
  "RUNTIME_WEBSOCKET_MESSAGE_INVALID"
>(
  runtimeWebSocketInboundMessageSchema,
  "RUNTIME_WEBSOCKET_MESSAGE_INVALID",
  "Runtime WebSocket Inbound Message",
  [runtimeRunRequestSchema, runtimeActionRequestSchema],
);

const validateRuntimeWebSocketOutboundMessageEnvelope = createValidator<
  RuntimeWebSocketOutboundMessage,
  "RUNTIME_WEBSOCKET_MESSAGE_INVALID"
>(
  runtimeWebSocketOutboundMessageSchema,
  "RUNTIME_WEBSOCKET_MESSAGE_INVALID",
  "Runtime WebSocket Outbound Message",
  [runtimeRunResultSchema, runtimeActionResultSchema],
);

export function validateRuntimeWebSocketOutboundMessage(
  input: unknown,
): ValidationResult<
  RuntimeWebSocketOutboundMessage,
  "RUNTIME_WEBSOCKET_MESSAGE_INVALID"
> {
  const result = validateRuntimeWebSocketOutboundMessageEnvelope(input);
  if (!result.success) {
    return result;
  }

  if (
    result.value.type === "runtime.run.result" ||
    result.value.type === "runtime.action.result"
  ) {
    return (
      validatePresentationCorrelation(
        result.value.payload,
        "RUNTIME_WEBSOCKET_MESSAGE_INVALID",
        "Runtime WebSocket Outbound Message",
      ) ?? result
    );
  }

  return result;
}
