import type { CatalogContentHash } from "@generative-ui/compiler-contract";
import type {
  CatalogObjectValueSchema,
  ComponentNesting,
} from "@generative-ui/component-catalog-schema";
import type {
  PresentationContext,
  PresentationDecision,
} from "@generative-ui/presentation-contract";
import { validatePresentationDecision } from "@generative-ui/presentation-contract";
import type { JsonValue } from "@generative-ui/shared-types";
import type { SanitizedMarkdown } from "./markdown-sanitizer.js";

export const MARKDOWN_DIRECT_REASON_WITH_USER_CONTEXT =
  "MARKDOWN_DIRECT_EXPLICIT_CONTENT_WITH_USER_CONTEXT";
export const MARKDOWN_DIRECT_REASON_WITHOUT_USER_CONTEXT =
  "MARKDOWN_DIRECT_EXPLICIT_CONTENT_WITHOUT_USER_CONTEXT_REDUCED_CONFIDENCE";
export const STRUCTURED_DATA_DIRECT_REASON_WITH_USER_CONTEXT =
  "STRUCTURED_DATA_DIRECT_SAFE_REPRESENTATION_WITH_USER_CONTEXT";
export const STRUCTURED_DATA_DIRECT_REASON_WITHOUT_USER_CONTEXT =
  "STRUCTURED_DATA_DIRECT_SAFE_REPRESENTATION_WITHOUT_USER_CONTEXT_REDUCED_CONFIDENCE";

export type RoutableAgentContent =
  | {
      contentType: "markdown";
      markdown: SanitizedMarkdown;
    }
  | {
      contentType: "structured-data";
      data: JsonValue;
      fallbackMarkdown?: SanitizedMarkdown;
    };

export interface CatalogCapabilitySummary {
  summaryVersion: "1.0";
  catalog: {
    catalogId: string;
    catalogVersion: string;
    catalogContentHash: CatalogContentHash;
  };
  components: readonly {
    componentType: string;
    displayName: string;
    description: string;
    category: "common" | "domain";
    domainTags: readonly string[];
    allowedActions: readonly string[];
    nesting: ComponentNesting;
  }[];
  actions: readonly {
    actionType: string;
    description: string;
    payloadSchema: CatalogObjectValueSchema;
    destructive: boolean;
    requiresApproval: boolean;
  }[];
}

export interface PresentationRouteRequest {
  requestId: string;
  content: RoutableAgentContent;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
}

export interface PresentationRouteOptions {
  signal: AbortSignal;
}

export interface PresentationRouter {
  route(
    request: PresentationRouteRequest,
    options: PresentationRouteOptions,
  ): Promise<PresentationDecision>;
}

export interface ModelPresentationRequest {
  requestId: string;
  content: RoutableAgentContent;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
  outputSchema: {
    schemaId: "https://generative-ui.dev/schemas/presentation/decision/1.0";
    schemaVersion: "1.0";
  };
}

export interface ModelInvocationPolicy {
  modelTimeoutMs: number;
  modelRetryCount: number;
}

export interface ModelInvocationRuntime {
  random(): number;
  schedule(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
  cancel(timer: ReturnType<typeof setTimeout>): void;
}

const systemModelInvocationRuntime: ModelInvocationRuntime = {
  random: () => Math.random(),
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (timer) => clearTimeout(timer),
};

/** Options for one physical provider request attempt. */
export interface ModelCallOptions {
  signal: AbortSignal;
}

export type ModelAdapterErrorCode =
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
  | "MODEL_RETRY_EXHAUSTED";

export type ModelErrorCategory =
  | "cancelled"
  | "timeout"
  | "rate-limited"
  | "unavailable"
  | "authentication"
  | "permission"
  | "invalid-request"
  | "content-filtered"
  | "invalid-response"
  | "provider-error"
  | "retry-exhausted";

export interface ModelAdapterFailure {
  readonly category: ModelErrorCategory;
  readonly code: ModelAdapterErrorCode;
  readonly retryable: boolean;
  readonly attempts: number;
  readonly lastRetryableCode?: RetryableModelErrorCode | undefined;
  readonly transientProviderError?: true | undefined;
}

export type RetryableModelErrorCode =
  | "MODEL_RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_PROVIDER_ERROR";

/**
 * Executes exactly one physical provider request attempt.
 * Timeout, backoff, and retry orchestration are owned by the Router wrapper.
 */
export interface ModelAdapter {
  generatePresentationDecisionCandidate(
    request: ModelPresentationRequest,
    options: ModelCallOptions,
  ): Promise<unknown>;
}

const modelErrorDefinitions = {
  MODEL_CANCELLED: { category: "cancelled", retryable: false },
  MODEL_TIMEOUT: { category: "timeout", retryable: true },
  MODEL_RATE_LIMITED: { category: "rate-limited", retryable: true },
  MODEL_UNAVAILABLE: { category: "unavailable", retryable: true },
  MODEL_AUTHENTICATION_FAILED: { category: "authentication", retryable: false },
  MODEL_PERMISSION_DENIED: { category: "permission", retryable: false },
  MODEL_REQUEST_REJECTED: { category: "invalid-request", retryable: false },
  MODEL_CONTENT_FILTERED: { category: "content-filtered", retryable: false },
  MODEL_INVALID_RESPONSE: { category: "invalid-response", retryable: false },
  MODEL_PROVIDER_ERROR: { category: "provider-error", retryable: false },
  MODEL_RETRY_EXHAUSTED: { category: "retry-exhausted", retryable: true },
} as const satisfies Record<
  ModelAdapterErrorCode,
  {
    category: ModelErrorCategory;
    retryable: boolean;
  }
>;

const retryableModelErrorCodes: ReadonlySet<RetryableModelErrorCode> = new Set([
  "MODEL_RATE_LIMITED",
  "MODEL_UNAVAILABLE",
  "MODEL_PROVIDER_ERROR",
]);

export class ModelAdapterError extends Error implements ModelAdapterFailure {
  constructor(
    readonly code: ModelAdapterErrorCode,
    readonly retryable: boolean,
    readonly attempts = 1,
    readonly category: ModelErrorCategory = categoryFor(code),
    readonly lastRetryableCode?: RetryableModelErrorCode,
    readonly transientProviderError?: true,
  ) {
    super("Model analysis failed.");
    this.name = "ModelAdapterError";
  }
}

function categoryFor(code: ModelAdapterErrorCode): ModelErrorCategory {
  return modelErrorDefinitions[code].category;
}

export function isModelAdapterError(
  value: unknown,
): value is ModelAdapterFailure {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  try {
    const code = Object.getOwnPropertyDescriptor(value, "code");
    const retryable = Object.getOwnPropertyDescriptor(value, "retryable");
    const attempts = Object.getOwnPropertyDescriptor(value, "attempts");
    const category = Object.getOwnPropertyDescriptor(value, "category");
    const name = Object.getOwnPropertyDescriptor(value, "name");
    const lastRetryableCode = Object.getOwnPropertyDescriptor(
      value,
      "lastRetryableCode",
    );
    const transientProviderError = Object.getOwnPropertyDescriptor(
      value,
      "transientProviderError",
    );

    if (
      code === undefined ||
      !("value" in code) ||
      typeof code.value !== "string" ||
      !(code.value in modelErrorDefinitions)
    ) {
      return false;
    }

    const stableCode = code.value as ModelAdapterErrorCode;
    const validName =
      value instanceof ModelAdapterError ||
      (name !== undefined &&
        "value" in name &&
        name.value === "ModelAdapterError");
    const validRetryable =
      retryable !== undefined &&
      "value" in retryable &&
      retryable.value === modelErrorDefinitions[stableCode].retryable;
    const validAttempts =
      attempts !== undefined &&
      "value" in attempts &&
      Number.isSafeInteger(attempts.value) &&
      attempts.value >= 0;
    const validCategory =
      category !== undefined &&
      "value" in category &&
      category.value === categoryFor(stableCode);
    const validLastRetryableCode =
      stableCode === "MODEL_RETRY_EXHAUSTED"
        ? lastRetryableCode !== undefined &&
          "value" in lastRetryableCode &&
          retryableModelErrorCodes.has(
            lastRetryableCode.value as RetryableModelErrorCode,
          )
        : lastRetryableCode === undefined ||
          ("value" in lastRetryableCode &&
            lastRetryableCode.value === undefined);
    const validTransientProviderFlag =
      transientProviderError === undefined ||
      ("value" in transientProviderError &&
        transientProviderError.value === undefined) ||
      (stableCode === "MODEL_PROVIDER_ERROR" &&
        "value" in transientProviderError &&
        transientProviderError.value === true);

    return (
      validName &&
      validRetryable &&
      validAttempts &&
      validCategory &&
      validLastRetryableCode &&
      validTransientProviderFlag
    );
  } catch {
    return false;
  }
}

function isRetryableModelError(
  error: ModelAdapterFailure,
): error is ModelAdapterFailure & { code: RetryableModelErrorCode } {
  return (
    error.code === "MODEL_RATE_LIMITED" ||
    error.code === "MODEL_UNAVAILABLE" ||
    (error.code === "MODEL_PROVIDER_ERROR" &&
      error.transientProviderError === true)
  );
}

function signalError(
  callerSignal: AbortSignal,
  deadlineSignal: AbortSignal,
  attempts: number,
): ModelAdapterError {
  if (callerSignal.aborted) {
    return new ModelAdapterError("MODEL_CANCELLED", false, attempts);
  }
  if (deadlineSignal.aborted) {
    return new ModelAdapterError("MODEL_TIMEOUT", true, attempts);
  }
  return new ModelAdapterError("MODEL_CANCELLED", false, attempts);
}

function awaitWithAbort<T>(
  operation: Promise<T>,
  callerSignal: AbortSignal,
  deadlineSignal: AbortSignal,
  attempts: number,
): Promise<T> {
  if (callerSignal.aborted || deadlineSignal.aborted) {
    return Promise.reject(signalError(callerSignal, deadlineSignal, attempts));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(signalError(callerSignal, deadlineSignal, attempts));
    };
    const cleanup = () => {
      callerSignal.removeEventListener("abort", onAbort);
      deadlineSignal.removeEventListener("abort", onAbort);
    };
    callerSignal.addEventListener("abort", onAbort, { once: true });
    deadlineSignal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (result) => {
        cleanup();
        resolve(result);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function retryDelayMs(
  retryIndex: number,
  runtime: ModelInvocationRuntime,
): number {
  const boundedExponential = Math.min(100 * 2 ** retryIndex, 1_000);
  const random = runtime.random();
  const boundedRandom = Number.isFinite(random)
    ? Math.min(1, Math.max(0, random))
    : 0;
  return Math.floor(boundedExponential * (0.75 + boundedRandom * 0.25));
}

function waitForRetry(
  delayMs: number,
  callerSignal: AbortSignal,
  deadlineSignal: AbortSignal,
  attempts: number,
  runtime: ModelInvocationRuntime,
): Promise<void> {
  if (callerSignal.aborted || deadlineSignal.aborted) {
    return Promise.reject(signalError(callerSignal, deadlineSignal, attempts));
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      callerSignal.removeEventListener("abort", onAbort);
      deadlineSignal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (timer !== undefined) {
        runtime.cancel(timer);
      }
      cleanup();
      reject(signalError(callerSignal, deadlineSignal, attempts));
    };

    callerSignal.addEventListener("abort", onAbort, { once: true });
    deadlineSignal.addEventListener("abort", onAbort, { once: true });
    const timer = runtime.schedule(() => {
      cleanup();
      resolve();
    }, delayMs);
  });
}

async function invokeModelAdapter(
  modelAdapter: ModelAdapter,
  request: ModelPresentationRequest,
  callerSignal: AbortSignal,
  policy: Readonly<ModelInvocationPolicy>,
  runtime: ModelInvocationRuntime,
): Promise<unknown> {
  if (callerSignal.aborted) {
    throw new ModelAdapterError("MODEL_CANCELLED", false, 0);
  }

  const deadlineController = new AbortController();
  const deadlineTimer = runtime.schedule(
    () => deadlineController.abort(),
    policy.modelTimeoutMs,
  );
  let attempts = 0;

  try {
    for (;;) {
      if (callerSignal.aborted || deadlineController.signal.aborted) {
        throw signalError(callerSignal, deadlineController.signal, attempts);
      }

      attempts += 1;
      try {
        return await awaitWithAbort(
          modelAdapter.generatePresentationDecisionCandidate(request, {
            signal: AbortSignal.any([callerSignal, deadlineController.signal]),
          }),
          callerSignal,
          deadlineController.signal,
          attempts,
        );
      } catch (caught) {
        if (callerSignal.aborted || deadlineController.signal.aborted) {
          throw signalError(callerSignal, deadlineController.signal, attempts);
        }
        if (!isModelAdapterError(caught)) {
          throw new ModelAdapterError("MODEL_PROVIDER_ERROR", false, attempts);
        }
        if (!isRetryableModelError(caught)) {
          throw new ModelAdapterError(
            caught.code,
            caught.retryable,
            attempts,
            caught.category,
            caught.lastRetryableCode,
            caught.transientProviderError,
          );
        }
        if (attempts > policy.modelRetryCount) {
          throw new ModelAdapterError(
            "MODEL_RETRY_EXHAUSTED",
            true,
            attempts,
            "retry-exhausted",
            caught.code,
          );
        }

        await waitForRetry(
          retryDelayMs(attempts - 1, runtime),
          callerSignal,
          deadlineController.signal,
          attempts,
          runtime,
        );
      }
    }
  } finally {
    runtime.cancel(deadlineTimer);
  }
}

export class PresentationRoutingError extends Error {
  readonly code = "PRESENTATION_ROUTING_FAILED";

  constructor() {
    super("Presentation routing failed.");
    this.name = "PresentationRoutingError";
  }
}

export class PresentationDecisionValidationError extends Error {
  readonly code = "PRESENTATION_DECISION_INVALID";

  constructor() {
    super("Model candidate does not match the Presentation Decision contract.");
    this.name = "PresentationDecisionValidationError";
  }
}

export class PresentationRouterConfigurationError extends Error {
  readonly code = "PRESENTATION_ROUTER_CONFIGURATION_INVALID";

  constructor() {
    super("Presentation Router configuration is invalid.");
    this.name = "PresentationRouterConfigurationError";
  }
}

export const MODEL_INVOCATION_POLICY_VERSION = "1.0";
export const MODEL_INVOCATION_POLICY_LIMITS = Object.freeze({
  maxModelTimeoutMs: 300_000,
  maxModelRetryCount: 3,
});

function createStableModelInvocationPolicy(
  policy: ModelInvocationPolicy,
): Readonly<ModelInvocationPolicy> {
  try {
    if (
      Number.isSafeInteger(policy.modelTimeoutMs) &&
      policy.modelTimeoutMs > 0 &&
      policy.modelTimeoutMs <=
        MODEL_INVOCATION_POLICY_LIMITS.maxModelTimeoutMs &&
      Number.isSafeInteger(policy.modelRetryCount) &&
      policy.modelRetryCount >= 0 &&
      policy.modelRetryCount <=
        MODEL_INVOCATION_POLICY_LIMITS.maxModelRetryCount
    ) {
      return Object.freeze({
        modelTimeoutMs: policy.modelTimeoutMs,
        modelRetryCount: policy.modelRetryCount,
      });
    }
  } catch {
    // Normalize unsafe configuration access into the stable configuration error.
  }

  throw new PresentationRouterConfigurationError();
}

export function createPresentationRouter(
  _modelAdapter: ModelAdapter,
): PresentationRouter {
  return {
    async route(request) {
      return {
        mode: "markdown",
        reason:
          request.content.contentType === "markdown"
            ? request.context?.userMessage === undefined
              ? MARKDOWN_DIRECT_REASON_WITHOUT_USER_CONTEXT
              : MARKDOWN_DIRECT_REASON_WITH_USER_CONTEXT
            : request.context?.userMessage === undefined
              ? STRUCTURED_DATA_DIRECT_REASON_WITHOUT_USER_CONTEXT
              : STRUCTURED_DATA_DIRECT_REASON_WITH_USER_CONTEXT,
      };
    },
  };
}

export function createModelPresentationRouter(
  modelAdapter: ModelAdapter,
  policy: ModelInvocationPolicy,
  runtime: ModelInvocationRuntime = systemModelInvocationRuntime,
): PresentationRouter {
  const stablePolicy = createStableModelInvocationPolicy(policy);

  return {
    async route(request, options) {
      const candidate = await invokeModelAdapter(
        modelAdapter,
        {
          requestId: request.requestId,
          content: request.content,
          ...(request.context === undefined
            ? {}
            : { context: request.context }),
          catalog: request.catalog,
          outputSchema: {
            schemaId:
              "https://generative-ui.dev/schemas/presentation/decision/1.0",
            schemaVersion: "1.0",
          },
        },
        options.signal,
        stablePolicy,
        runtime,
      );
      const validated = validatePresentationDecision(candidate);
      if (!validated.success) {
        throw new PresentationDecisionValidationError();
      }
      return validated.value;
    },
  };
}
