export type ObservationStage =
  | "input-validation"
  | "content-serialization"
  | "catalog-resolution"
  | "presentation-routing"
  | "model-analysis"
  | "ui-plan-validation"
  | "ui-compilation";

export type StableObservationErrorCode =
  | "PRESENTATION_REQUEST_INVALID"
  | "PRESENTATION_DECISION_INVALID"
  | "PRESENTATION_RESULT_INVALID"
  | "MARKDOWN_SANITIZATION_FAILED"
  | "STRUCTURED_DATA_INVALID"
  | "DATA_DEPTH_EXCEEDED"
  | "DATA_ITEMS_EXCEEDED"
  | "DATA_SERIALIZED_BYTES_EXCEEDED"
  | "PRESENTATION_ROUTING_FAILED"
  | "MODEL_CANCELLED"
  | "MODEL_TIMEOUT"
  | "MODEL_RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_AUTHENTICATION_FAILED"
  | "MODEL_PERMISSION_DENIED"
  | "MODEL_REQUEST_REJECTED"
  | "MODEL_CONTENT_FILTERED"
  | "MODEL_INVALID_RESPONSE"
  | "MODEL_PROVIDER_ERROR"
  | "MODEL_RETRY_EXHAUSTED"
  | "UI_COMPILE_REQUEST_INVALID"
  | "UI_PLAN_INVALID"
  | "COMPONENT_CATALOG_INVALID"
  | "CATALOG_REFERENCE_MISMATCH"
  | "CATALOG_CONTENT_HASH_MISMATCH"
  | "SCHEMA_DEFINITION_INVALID"
  | "SCHEMA_LIMIT_EXCEEDED"
  | "SCHEMA_COMPILATION_FAILED"
  | "NO_COMPATIBLE_COMPOSITION"
  | "COMPONENT_NOT_ALLOWED"
  | "NO_COMPATIBLE_COMPONENT"
  | "PROPS_RESOLUTION_FAILED"
  | "COMPONENT_PROPS_INVALID"
  | "ACTION_PAYLOAD_INVALID"
  | "ACTION_BINDING_UNRESOLVED"
  | "UI_IR_INVALID"
  | "A2UI_INVALID"
  | "COMPILE_TIMEOUT"
  | "REQUEST_CANCELLED"
  | "INTERNAL_ERROR";

export type StageResult =
  | "completed"
  | "failed"
  | "cancelled"
  | "timed-out"
  | "skipped";

export interface SafeStageObservation {
  readonly stage: ObservationStage;
  readonly result: StageResult;
  readonly durationMs: number;
  readonly errorCode?: StableObservationErrorCode;
  readonly modelAttemptCount?: number;
  readonly modelCalled?: boolean;
  readonly modelRetried?: boolean;
  readonly requestId?: string;
  readonly catalogId?: string;
  readonly catalogVersion?: string;
  readonly catalogContentHash?: `sha256:${string}`;
}

/** Vendor-neutral port implemented by the Runtime Host composition root. */
export interface PresentationPipelineObservabilityPort {
  setCurrentStage?(stage: ObservationStage): void;
  recordStageCompletion(input: SafeStageObservation): void;
}

export type StageObservationRecorder = PresentationPipelineObservabilityPort;

const stableErrorCodes: ReadonlySet<string> = new Set([
  "PRESENTATION_REQUEST_INVALID",
  "PRESENTATION_DECISION_INVALID",
  "PRESENTATION_RESULT_INVALID",
  "MARKDOWN_SANITIZATION_FAILED",
  "STRUCTURED_DATA_INVALID",
  "DATA_DEPTH_EXCEEDED",
  "DATA_ITEMS_EXCEEDED",
  "DATA_SERIALIZED_BYTES_EXCEEDED",
  "PRESENTATION_ROUTING_FAILED",
  "MODEL_CANCELLED",
  "MODEL_TIMEOUT",
  "MODEL_RATE_LIMITED",
  "MODEL_UNAVAILABLE",
  "MODEL_AUTHENTICATION_FAILED",
  "MODEL_PERMISSION_DENIED",
  "MODEL_REQUEST_REJECTED",
  "MODEL_CONTENT_FILTERED",
  "MODEL_INVALID_RESPONSE",
  "MODEL_PROVIDER_ERROR",
  "MODEL_RETRY_EXHAUSTED",
  "UI_COMPILE_REQUEST_INVALID",
  "UI_PLAN_INVALID",
  "COMPONENT_CATALOG_INVALID",
  "CATALOG_REFERENCE_MISMATCH",
  "CATALOG_CONTENT_HASH_MISMATCH",
  "SCHEMA_DEFINITION_INVALID",
  "SCHEMA_LIMIT_EXCEEDED",
  "SCHEMA_COMPILATION_FAILED",
  "NO_COMPATIBLE_COMPOSITION",
  "COMPONENT_NOT_ALLOWED",
  "NO_COMPATIBLE_COMPONENT",
  "PROPS_RESOLUTION_FAILED",
  "COMPONENT_PROPS_INVALID",
  "ACTION_PAYLOAD_INVALID",
  "ACTION_BINDING_UNRESOLVED",
  "UI_IR_INVALID",
  "A2UI_INVALID",
  "COMPILE_TIMEOUT",
  "REQUEST_CANCELLED",
  "INTERNAL_ERROR",
]);

function safeMonotonicTimestamp(): number {
  try {
    const value = performance.now();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function isStableObservationErrorCode(
  value: unknown,
): value is StableObservationErrorCode {
  return typeof value === "string" && stableErrorCodes.has(value);
}

export function startObservationStage(): number {
  return safeMonotonicTimestamp();
}

export function observationStageDuration(startedAt: number): number {
  return Math.max(0, Math.trunc(safeMonotonicTimestamp() - startedAt));
}

export function recordStageCompletionSafely(
  port: PresentationPipelineObservabilityPort | undefined,
  input: SafeStageObservation,
): void {
  try {
    port?.recordStageCompletion(input);
  } catch {
    // Observability is intentionally unable to change presentation behavior.
  }
}

export function setObservationStageSafely(
  port: PresentationPipelineObservabilityPort | undefined,
  stage: ObservationStage,
): void {
  try {
    port?.setCurrentStage?.(stage);
  } catch {
    // Observability is intentionally unable to change presentation behavior.
  }
}
