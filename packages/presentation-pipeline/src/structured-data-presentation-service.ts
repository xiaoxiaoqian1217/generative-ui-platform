import type {
  PresentationContext,
  PresentationDecision,
  PresentationError,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import {
  areMarkdownSanitizerLimitsValid,
  type MarkdownSanitizer,
  type MarkdownSanitizerLimits,
  type SanitizedMarkdown,
} from "./markdown-sanitizer.js";
import type {
  CatalogCapabilitySummary,
  PresentationRouteOptions,
  PresentationRouteRequest,
  PresentationRouter,
} from "./presentation-router.js";
import {
  failedPresentationResult,
  finalizeSafeMarkdownPresentation,
  routingPresentationError,
  sanitizationPresentationError,
} from "./safe-markdown-presentation.js";
import {
  maximumSerializedMarkdownBytes,
  type StructuredDataSerializer,
} from "./structured-data-serializer.js";
import {
  areStructuredDataLimitsValid,
  type StructuredDataLimits,
  type StructuredDataValidationErrorCode,
  type StructuredDataValidationFailureReason,
  type StructuredDataValidator,
  type ValidatedStructuredData,
} from "./structured-data-validator.js";

export interface StructuredDataPresentationRequest {
  requestId: string;
  data: unknown;
  fallbackMarkdown?: string;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
}

export interface StructuredDataPresentationLimits {
  structuredData: StructuredDataLimits;
  markdown: MarkdownSanitizerLimits;
}

export interface StructuredDataPresentationServiceDependencies {
  validator: StructuredDataValidator;
  serializer: StructuredDataSerializer;
  sanitizer: MarkdownSanitizer;
  router: PresentationRouter;
  limits: StructuredDataPresentationLimits;
}

export interface StructuredDataPresentationService {
  present(
    request: StructuredDataPresentationRequest,
    options: PresentationRouteOptions,
  ): Promise<PresentationResult>;
}

const safeStructuredDataFailureMessage =
  "Structured data could not be safely processed.";

export class StructuredDataConfigurationError extends Error {
  readonly code = "STRUCTURED_DATA_CONFIGURATION_INVALID";

  constructor() {
    super("Structured data limits are invalid.");
    this.name = "StructuredDataConfigurationError";
  }
}

function structuredDataError(
  code: StructuredDataValidationErrorCode,
  reason?: StructuredDataValidationFailureReason,
): PresentationError {
  return {
    code,
    message: safeStructuredDataFailureMessage,
    stage: "input-validation",
    retryable: false,
    ...(reason === undefined ? {} : { details: { reason } }),
  };
}

function serializeAndSanitize(
  value: ValidatedStructuredData,
  serializer: StructuredDataSerializer,
  sanitizer: MarkdownSanitizer,
  limits: MarkdownSanitizerLimits,
) {
  return sanitizer.sanitize(serializer.serialize(value), limits);
}

export function areStructuredDataPresentationLimitsCompatible(
  limits: StructuredDataPresentationLimits,
): boolean {
  const maximumMarkdownBytes = maximumSerializedMarkdownBytes(
    limits.structuredData.maxSerializedBytes,
  );
  return (
    maximumMarkdownBytes <= limits.markdown.maxInputBytes &&
    maximumMarkdownBytes <= limits.markdown.maxOutputBytes
  );
}

export function createStructuredDataPresentationService(
  dependencies: StructuredDataPresentationServiceDependencies,
): StructuredDataPresentationService {
  if (
    !areStructuredDataLimitsValid(dependencies.limits.structuredData) ||
    !areMarkdownSanitizerLimitsValid(dependencies.limits.markdown) ||
    !areStructuredDataPresentationLimitsCompatible(dependencies.limits)
  ) {
    throw new StructuredDataConfigurationError();
  }

  return {
    async present(request, options) {
      const validated = dependencies.validator.validate(
        request.data,
        dependencies.limits.structuredData,
      );
      if (!validated.success) {
        return failedPresentationResult(request.requestId, [
          structuredDataError(validated.error.code, validated.error.reason),
        ]);
      }

      const diagnostics: PresentationError[] = [];
      let safeMarkdown: SanitizedMarkdown;
      if (request.fallbackMarkdown === undefined) {
        const serialized = serializeAndSanitize(
          validated.value,
          dependencies.serializer,
          dependencies.sanitizer,
          dependencies.limits.markdown,
        );
        if (!serialized.success) {
          return failedPresentationResult(request.requestId, [
            sanitizationPresentationError(serialized.error.reason),
          ]);
        }
        safeMarkdown = serialized.markdown;
      } else {
        const fallback = dependencies.sanitizer.sanitize(
          request.fallbackMarkdown,
          dependencies.limits.markdown,
        );
        if (fallback.success) {
          safeMarkdown = fallback.markdown;
        } else {
          diagnostics.push(
            sanitizationPresentationError(fallback.error.reason),
          );
          const serialized = serializeAndSanitize(
            validated.value,
            dependencies.serializer,
            dependencies.sanitizer,
            dependencies.limits.markdown,
          );
          if (!serialized.success) {
            return failedPresentationResult(request.requestId, [
              ...diagnostics,
              sanitizationPresentationError(serialized.error.reason),
            ]);
          }
          safeMarkdown = serialized.markdown;

          return finalizeSafeMarkdownPresentation({
            requestId: request.requestId,
            markdown: safeMarkdown,
            sanitizer: dependencies.sanitizer,
            limits: dependencies.limits.markdown,
            errors: diagnostics,
          });
        }
      }

      const routeRequest: PresentationRouteRequest = {
        requestId: request.requestId,
        content: {
          contentType: "structured-data",
          data: validated.value.data,
          fallbackMarkdown: safeMarkdown,
        },
        ...(request.context === undefined ? {} : { context: request.context }),
        catalog: request.catalog,
      };

      let decision: PresentationDecision;
      try {
        decision = await dependencies.router.route(routeRequest, options);
      } catch {
        return finalizeSafeMarkdownPresentation({
          requestId: request.requestId,
          markdown: safeMarkdown,
          sanitizer: dependencies.sanitizer,
          limits: dependencies.limits.markdown,
          errors: [...diagnostics, routingPresentationError()],
        });
      }

      return finalizeSafeMarkdownPresentation({
        requestId: request.requestId,
        markdown: safeMarkdown,
        sanitizer: dependencies.sanitizer,
        limits: dependencies.limits.markdown,
        ...(decision.mode === "markdown"
          ? {}
          : { errors: [routingPresentationError()] }),
      });
    },
  };
}
