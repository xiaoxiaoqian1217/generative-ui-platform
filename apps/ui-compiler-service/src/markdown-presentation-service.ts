import type {
  PresentationContext,
  PresentationDecision,
  PresentationError,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import {
  createDefensiveMarkdownSanitizerLimits,
  type MarkdownSanitizationFailureReason,
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

export interface MarkdownPresentationRequest {
  requestId: string;
  markdown: string;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
}

export interface GenerativeUICompilationRequest {
  routeRequest: PresentationRouteRequest;
  decision: Extract<PresentationDecision, { mode: "generative-ui" }>;
}

export interface MarkdownPresentationServiceDependencies {
  sanitizer: MarkdownSanitizer;
  router: PresentationRouter;
  compileGenerativeUI(
    request: GenerativeUICompilationRequest,
    options: PresentationRouteOptions,
  ): Promise<PresentationResult>;
  limits: MarkdownSanitizerLimits;
}

export interface MarkdownPresentationService {
  present(
    request: MarkdownPresentationRequest,
    options: PresentationRouteOptions,
  ): Promise<PresentationResult>;
}

const safeSanitizationFailureMessage =
  "Markdown content could not be safely processed.";
const safeRoutingFailureMessage =
  "Presentation routing could not be completed.";

function sanitizationError(
  reason: MarkdownSanitizationFailureReason,
): PresentationError {
  return {
    code: "MARKDOWN_SANITIZATION_FAILED",
    message: safeSanitizationFailureMessage,
    stage: "content-serialization",
    retryable: false,
    details: { reason },
  };
}

function routingError(): PresentationError {
  return {
    code: "PRESENTATION_ROUTING_FAILED",
    message: safeRoutingFailureMessage,
    stage: "presentation-routing",
    retryable: false,
  };
}

function failedResult(
  requestId: string,
  error: PresentationError,
): PresentationResult {
  return {
    requestId,
    status: "failed",
    errors: [error],
  };
}

function defensiveSanitize(
  sanitizer: MarkdownSanitizer,
  markdown: SanitizedMarkdown,
  limits: MarkdownSanitizerLimits,
) {
  return sanitizer.sanitize(
    markdown,
    createDefensiveMarkdownSanitizerLimits(limits),
  );
}

export function createMarkdownPresentationService(
  dependencies: MarkdownPresentationServiceDependencies,
): MarkdownPresentationService {
  return {
    async present(request, options) {
      const sanitized = dependencies.sanitizer.sanitize(
        request.markdown,
        dependencies.limits,
      );
      if (!sanitized.success) {
        return failedResult(
          request.requestId,
          sanitizationError(sanitized.error.reason),
        );
      }

      const routeRequest: PresentationRouteRequest = {
        requestId: request.requestId,
        content: {
          contentType: "markdown",
          markdown: sanitized.markdown,
        },
        ...(request.context === undefined ? {} : { context: request.context }),
        catalog: request.catalog,
      };

      let decision: PresentationDecision;
      try {
        decision = await dependencies.router.route(routeRequest, options);
      } catch {
        const output = defensiveSanitize(
          dependencies.sanitizer,
          sanitized.markdown,
          dependencies.limits,
        );
        if (!output.success) {
          return failedResult(
            request.requestId,
            sanitizationError(output.error.reason),
          );
        }
        return {
          requestId: request.requestId,
          status: "degraded",
          mode: "markdown",
          markdown: output.markdown,
          errors: [routingError()],
        };
      }

      if (decision.mode === "generative-ui") {
        return dependencies.compileGenerativeUI(
          { routeRequest, decision },
          options,
        );
      }

      const output = defensiveSanitize(
        dependencies.sanitizer,
        sanitized.markdown,
        dependencies.limits,
      );
      if (!output.success) {
        return failedResult(
          request.requestId,
          sanitizationError(output.error.reason),
        );
      }

      return {
        requestId: request.requestId,
        status: "completed",
        mode: "markdown",
        markdown: output.markdown,
      };
    },
  };
}
