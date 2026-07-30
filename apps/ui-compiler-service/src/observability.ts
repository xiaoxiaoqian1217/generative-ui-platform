export type ObservationStage =
  | "http-receive"
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
  | "REQUEST_RECEIVE_TIMEOUT"
  | "REQUEST_BODY_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UNSUPPORTED_CONTENT_ENCODING"
  | "REQUEST_TIMEOUT"
  | "SERVICE_SHUTTING_DOWN"
  | "INTERNAL_ERROR";

export type StageResult =
  | "completed"
  | "failed"
  | "cancelled"
  | "timed-out"
  | "skipped";

export type HttpRequestTerminalOutcome =
  | "completed"
  | "cancelled"
  | "timed-out"
  | "client-disconnected"
  | "rejected";

export interface SafeRequestObservationStart {
  readonly observationVersion: "1.0";
  readonly transportRequestId: string;
  readonly compilerVersion: string;
  readonly receivedAtUnixMs: number;
}

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

export interface SafeRequestObservationTerminal {
  readonly outcome: HttpRequestTerminalOutcome;
  readonly httpStatusCode?: number;
  readonly requestId?: string;
  readonly catalogId?: string;
  readonly catalogVersion?: string;
  readonly catalogContentHash?: `sha256:${string}`;
  readonly hasPresentationContext?: boolean;
  readonly hasUserMessage?: boolean;
  readonly finalMode?: "markdown" | "generative-ui";
  readonly degraded?: boolean;
  readonly degradationReasonCode?: StableObservationErrorCode;
  readonly errorCode?: StableObservationErrorCode;
  readonly errorStage?: ObservationStage;
  readonly totalDurationMs: number;
  readonly routeDurationMs?: number;
  readonly modelDurationMs?: number;
  readonly compileDurationMs?: number;
  readonly modelCalled: boolean;
  readonly modelAttemptCount: number;
  readonly modelRetried: boolean;
}

export interface StageObservationRecorder {
  setCurrentStage?(stage: ObservationStage): void;
  recordStageCompletion(input: SafeStageObservation): void;
}

export interface RequestObservation extends StageObservationRecorder {
  end(input: SafeRequestObservationTerminal): void;
}

export interface HttpObservability {
  startHttpRequest(input: SafeRequestObservationStart): RequestObservation;
}

export interface JsonLineHttpObservability extends HttpObservability {
  sinkFailureCount(): number;
}

type JsonLineWriter = (line: string) => void;

export interface JsonLineHttpObservabilityOptions {
  now?: () => number;
  write?: JsonLineWriter;
}

export type TrackedRequestTerminal = Omit<
  SafeRequestObservationTerminal,
  | "totalDurationMs"
  | "routeDurationMs"
  | "modelDurationMs"
  | "compileDurationMs"
  | "modelCalled"
  | "modelAttemptCount"
  | "modelRetried"
> & {
  readonly deriveErrorStage?: boolean;
};

export interface TrackedHttpRequestObservation {
  readonly stages: StageObservationRecorder;
  currentStage(): ObservationStage | undefined;
  elapsedMs(): number;
  seal(input: TrackedRequestTerminal): void;
  flush(httpStatusCode?: number): void;
  finish(input: TrackedRequestTerminal): void;
}

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
  "REQUEST_RECEIVE_TIMEOUT",
  "REQUEST_BODY_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNSUPPORTED_CONTENT_ENCODING",
  "REQUEST_TIMEOUT",
  "SERVICE_SHUTTING_DOWN",
  "INTERNAL_ERROR",
]);

const observationStages: ReadonlySet<string> = new Set([
  "http-receive",
  "input-validation",
  "content-serialization",
  "catalog-resolution",
  "presentation-routing",
  "model-analysis",
  "ui-plan-validation",
  "ui-compilation",
]);

const stageResults: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "cancelled",
  "timed-out",
  "skipped",
]);

function defaultJsonLineWriter(line: string): void {
  process.stdout.write(`${line}\n`);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isStableObservationErrorCode(
  value: unknown,
): value is StableObservationErrorCode {
  return typeof value === "string" && stableErrorCodes.has(value);
}

function safeTimestamp(now: () => number): number {
  const value = now();
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function safeMonotonicTimestamp(now: () => number): number {
  try {
    const value = now();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function safeDuration(start: number, now: () => number): number {
  const end = safeMonotonicTimestamp(now);
  return Math.max(0, Math.trunc(end - start));
}

export function startObservationStage(): number {
  return safeMonotonicTimestamp(() => performance.now());
}

export function observationStageDuration(startedAt: number): number {
  return safeDuration(startedAt, () => performance.now());
}

export function recordStageCompletionSafely(
  recorder: StageObservationRecorder | undefined,
  input: SafeStageObservation,
): void {
  try {
    recorder?.recordStageCompletion(input);
  } catch {
    // Observability must not alter request behavior.
  }
}

export function setObservationStageSafely(
  recorder: StageObservationRecorder | undefined,
  stage: ObservationStage,
): void {
  try {
    recorder?.setCurrentStage?.(stage);
  } catch {
    // Observability must not alter request behavior.
  }
}

function addString(
  target: Record<string, string | number | boolean>,
  key: string,
  value: unknown,
): void {
  if (typeof value === "string" && value.length > 0) target[key] = value;
}

function addBoolean(
  target: Record<string, string | number | boolean>,
  key: string,
  value: unknown,
): void {
  if (typeof value === "boolean") target[key] = value;
}

function addInteger(
  target: Record<string, string | number | boolean>,
  key: string,
  value: unknown,
): void {
  if (isNonNegativeInteger(value)) target[key] = value;
}

function projectStage(
  input: SafeStageObservation,
): Record<string, string | number | boolean> | undefined {
  if (
    !observationStages.has(input.stage) ||
    !stageResults.has(input.result) ||
    !isNonNegativeInteger(input.durationMs)
  ) {
    return undefined;
  }
  const allowsError =
    input.result !== "completed" && input.result !== "skipped";
  if (
    input.errorCode !== undefined &&
    (!allowsError || !isStableObservationErrorCode(input.errorCode))
  ) {
    return undefined;
  }
  const event: Record<string, string | number | boolean> = {
    stage: input.stage,
    result: input.result,
    durationMs: input.durationMs,
  };
  addString(event, "requestId", input.requestId);
  addString(event, "catalogId", input.catalogId);
  addString(event, "catalogVersion", input.catalogVersion);
  addString(event, "catalogContentHash", input.catalogContentHash);
  if (input.errorCode !== undefined) event.errorCode = input.errorCode;
  if (input.stage === "model-analysis") {
    addBoolean(event, "modelCalled", input.modelCalled);
    addInteger(event, "modelAttemptCount", input.modelAttemptCount);
    addBoolean(event, "modelRetried", input.modelRetried);
  }
  return event;
}

function projectTerminal(
  input: SafeRequestObservationTerminal,
): Record<string, string | number | boolean> | undefined {
  if (
    !isNonNegativeInteger(input.totalDurationMs) ||
    !isNonNegativeInteger(input.modelAttemptCount) ||
    typeof input.modelCalled !== "boolean" ||
    typeof input.modelRetried !== "boolean"
  ) {
    return undefined;
  }
  const event: Record<string, string | number | boolean> = {
    outcome: input.outcome,
    totalDurationMs: input.totalDurationMs,
    modelCalled: input.modelCalled,
    modelAttemptCount: input.modelAttemptCount,
    modelRetried: input.modelRetried,
  };
  addInteger(event, "httpStatusCode", input.httpStatusCode);
  addString(event, "requestId", input.requestId);
  addString(event, "catalogId", input.catalogId);
  addString(event, "catalogVersion", input.catalogVersion);
  addString(event, "catalogContentHash", input.catalogContentHash);
  addBoolean(event, "hasPresentationContext", input.hasPresentationContext);
  addBoolean(event, "hasUserMessage", input.hasUserMessage);
  addString(event, "finalMode", input.finalMode);
  addBoolean(event, "degraded", input.degraded);
  if (isStableObservationErrorCode(input.degradationReasonCode)) {
    event.degradationReasonCode = input.degradationReasonCode;
  }
  if (isStableObservationErrorCode(input.errorCode)) {
    event.errorCode = input.errorCode;
  }
  if (
    input.errorStage !== undefined &&
    observationStages.has(input.errorStage)
  ) {
    event.errorStage = input.errorStage;
  }
  addInteger(event, "routeDurationMs", input.routeDurationMs);
  addInteger(event, "modelDurationMs", input.modelDurationMs);
  addInteger(event, "compileDurationMs", input.compileDurationMs);
  return event;
}

function terminalEventName(
  outcome: HttpRequestTerminalOutcome,
):
  | "ui_compiler.http.request_completed"
  | "ui_compiler.http.request_cancelled"
  | "ui_compiler.http.request_timed_out"
  | "ui_compiler.http.client_disconnected" {
  switch (outcome) {
    case "cancelled":
      return "ui_compiler.http.request_cancelled";
    case "timed-out":
      return "ui_compiler.http.request_timed_out";
    case "client-disconnected":
      return "ui_compiler.http.client_disconnected";
    default:
      return "ui_compiler.http.request_completed";
  }
}

export function createJsonLineHttpObservability(
  options: JsonLineHttpObservabilityOptions = {},
): JsonLineHttpObservability {
  const now = options.now ?? Date.now;
  const write = options.write ?? defaultJsonLineWriter;
  let failures = 0;

  const failSafely = (): void => {
    failures += 1;
  };
  const writeEvent = (
    eventName: string,
    fields: Record<string, string | number | boolean>,
  ): void => {
    try {
      write(
        JSON.stringify({
          observationVersion: "1.0",
          eventName,
          timestampUnixMs: safeTimestamp(now),
          ...fields,
        }),
      );
    } catch {
      failSafely();
    }
  };

  return Object.freeze({
    startHttpRequest(input: SafeRequestObservationStart) {
      try {
        const base = {
          transportRequestId: input.transportRequestId,
          compilerVersion: input.compilerVersion,
        };
        writeEvent("ui_compiler.http.request_started", {
          ...base,
          receivedAtUnixMs: isNonNegativeInteger(input.receivedAtUnixMs)
            ? input.receivedAtUnixMs
            : 0,
        });
        let ended = false;
        return Object.freeze({
          recordStageCompletion(stage: SafeStageObservation) {
            try {
              if (ended) {
                failSafely();
                return;
              }
              const projected = projectStage(stage);
              if (projected === undefined) {
                failSafely();
                return;
              }
              writeEvent("ui_compiler.http.stage_completed", {
                transportRequestId: input.transportRequestId,
                ...projected,
              });
            } catch {
              failSafely();
            }
          },
          end(terminal: SafeRequestObservationTerminal) {
            try {
              if (ended) {
                failSafely();
                return;
              }
              ended = true;
              const projected = projectTerminal(terminal);
              if (projected === undefined) {
                failSafely();
                return;
              }
              writeEvent(terminalEventName(terminal.outcome), {
                transportRequestId: input.transportRequestId,
                compilerVersion: input.compilerVersion,
                ...projected,
              });
            } catch {
              failSafely();
            }
          },
        });
      } catch {
        failSafely();
        return noopRequestObservation;
      }
    },
    sinkFailureCount: () => failures,
  });
}

const noopRequestObservation: RequestObservation = Object.freeze({
  recordStageCompletion() {},
  end() {},
});

export const noopHttpObservability: HttpObservability = Object.freeze({
  startHttpRequest: () => noopRequestObservation,
});

export function createTrackedHttpRequestObservation(
  port: HttpObservability,
  start: SafeRequestObservationStart,
  monotonicNow: () => number = () => performance.now(),
): TrackedHttpRequestObservation {
  const startedAt = safeMonotonicTimestamp(monotonicNow);
  let observation = noopRequestObservation;
  try {
    observation = port.startHttpRequest(start);
  } catch {
    observation = noopRequestObservation;
  }
  let routeDurationMs: number | undefined;
  let modelDurationMs: number | undefined;
  let compileDurationMs: number | undefined;
  let modelCalled = false;
  let modelAttemptCount = 0;
  let modelRetried = false;
  let catalogContentHash: `sha256:${string}` | undefined;
  let currentStage: ObservationStage | undefined = "http-receive";
  const completedStages = new Set<ObservationStage>();
  let sealedInput: TrackedRequestTerminal | undefined;
  let sealedStage: ObservationStage | undefined;
  let acceptSealedStageCompletion = false;
  let flushed = false;

  const stages: StageObservationRecorder = Object.freeze({
    setCurrentStage(stage: ObservationStage) {
      if (sealedInput !== undefined) return;
      currentStage = stage;
    },
    recordStageCompletion(input: SafeStageObservation) {
      try {
        if (sealedInput !== undefined) {
          if (
            flushed ||
            !acceptSealedStageCompletion ||
            input.stage !== sealedStage
          ) {
            return;
          }
          acceptSealedStageCompletion = false;
        }
        currentStage = input.stage;
        if (input.stage === "presentation-routing") {
          routeDurationMs = input.durationMs;
        } else if (input.stage === "model-analysis") {
          modelDurationMs = input.durationMs;
          modelCalled = input.modelCalled === true;
          modelAttemptCount = isNonNegativeInteger(input.modelAttemptCount)
            ? input.modelAttemptCount
            : 0;
          modelRetried = input.modelRetried === true;
        } else if (input.stage === "ui-compilation") {
          compileDurationMs = input.durationMs;
        }
        if (input.catalogContentHash !== undefined) {
          catalogContentHash = input.catalogContentHash;
        }
        completedStages.add(input.stage);
        observation.recordStageCompletion(input);
      } catch {
        // Observability must not alter request behavior.
      }
    },
  });

  const freezeTerminalInput = (
    input: TrackedRequestTerminal,
  ): TrackedRequestTerminal => {
    const { deriveErrorStage = true, ...fields } = input;
    return {
      ...fields,
      ...(fields.errorStage !== undefined ||
      fields.outcome === "completed" ||
      currentStage === undefined ||
      !deriveErrorStage
        ? {}
        : { errorStage: currentStage }),
    };
  };
  const createTerminal = (
    input: TrackedRequestTerminal,
    httpStatusCode?: number,
  ): SafeRequestObservationTerminal => ({
    ...input,
    ...(httpStatusCode === undefined ? {} : { httpStatusCode }),
    totalDurationMs: safeDuration(startedAt, monotonicNow),
    ...(routeDurationMs === undefined ? {} : { routeDurationMs }),
    ...(modelDurationMs === undefined ? {} : { modelDurationMs }),
    ...(compileDurationMs === undefined ? {} : { compileDurationMs }),
    ...(input.catalogContentHash !== undefined
      ? {}
      : catalogContentHash === undefined
        ? {}
        : { catalogContentHash }),
    modelCalled,
    modelAttemptCount,
    modelRetried,
  });
  const flush = (httpStatusCode?: number): void => {
    if (flushed || sealedInput === undefined) return;
    flushed = true;
    try {
      observation.end(createTerminal(sealedInput, httpStatusCode));
    } catch {
      // Observability must not alter request behavior.
    }
  };

  return Object.freeze({
    stages,
    currentStage: () => currentStage,
    elapsedMs: () => safeDuration(startedAt, monotonicNow),
    seal(input: TrackedRequestTerminal) {
      if (flushed) return;
      if (sealedInput === undefined) {
        sealedStage = currentStage;
        acceptSealedStageCompletion =
          sealedStage !== undefined && !completedStages.has(sealedStage);
      }
      sealedInput = freezeTerminalInput(input);
    },
    flush,
    finish(input: TrackedRequestTerminal) {
      if (flushed) {
        try {
          observation.end(createTerminal(input));
        } catch {
          // Observability must not alter request behavior.
        }
        return;
      }
      if (sealedInput === undefined) {
        sealedStage = currentStage;
      }
      sealedInput = freezeTerminalInput(input);
      flush();
    },
  });
}
