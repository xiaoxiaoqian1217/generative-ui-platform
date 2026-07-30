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

export interface ModelCallOptions {
  signal: AbortSignal;
  policy: Readonly<ModelInvocationPolicy>;
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

export interface ModelAdapterFailure {
  readonly code: ModelAdapterErrorCode;
  readonly retryable: boolean;
}

export interface ModelAdapter {
  generatePresentationDecisionCandidate(
    request: ModelPresentationRequest,
    options: ModelCallOptions,
  ): Promise<unknown>;
}

const modelAdapterErrorCodes: ReadonlySet<string> = new Set([
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
]);

export class ModelAdapterError extends Error implements ModelAdapterFailure {
  constructor(
    readonly code: ModelAdapterErrorCode,
    readonly retryable: boolean,
  ) {
    super("Model analysis failed.");
    this.name = "ModelAdapterError";
  }
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
    return (
      code !== undefined &&
      "value" in code &&
      typeof code.value === "string" &&
      modelAdapterErrorCodes.has(code.value) &&
      retryable !== undefined &&
      "value" in retryable &&
      typeof retryable.value === "boolean"
    );
  } catch {
    return false;
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

function createStableModelInvocationPolicy(
  policy: ModelInvocationPolicy,
): Readonly<ModelInvocationPolicy> {
  try {
    if (
      Number.isSafeInteger(policy.modelTimeoutMs) &&
      policy.modelTimeoutMs > 0 &&
      Number.isSafeInteger(policy.modelRetryCount) &&
      policy.modelRetryCount >= 0
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
): PresentationRouter {
  const stablePolicy = createStableModelInvocationPolicy(policy);

  return {
    async route(request, options) {
      const candidate =
        await modelAdapter.generatePresentationDecisionCandidate(
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
          {
            signal: options.signal,
            policy: stablePolicy,
          },
        );
      const validated = validatePresentationDecision(candidate);
      if (!validated.success) {
        throw new PresentationDecisionValidationError();
      }
      return validated.value;
    },
  };
}
