import type {
  PresentationContext,
  PresentationDecision,
  PresentationResult,
} from "@generative-ui/presentation-contract";
import {
  areMarkdownSanitizerLimitsValid,
  type MarkdownSanitizer,
  type MarkdownSanitizerLimits,
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

export interface MarkdownPresentationRequest {
  requestId: string;
  markdown: string;
  context?: PresentationContext;
  catalog: CatalogCapabilitySummary;
}

export interface MarkdownPresentationServiceDependencies {
  sanitizer: MarkdownSanitizer;
  router: PresentationRouter;
  limits: MarkdownSanitizerLimits;
}

export interface MarkdownPresentationService {
  present(
    request: MarkdownPresentationRequest,
    options: PresentationRouteOptions,
  ): Promise<PresentationResult>;
}

export class MarkdownSanitizerConfigurationError extends Error {
  readonly code = "MARKDOWN_SANITIZER_CONFIGURATION_INVALID";

  constructor() {
    super("Markdown sanitizer limits must be finite positive integers.");
    this.name = "MarkdownSanitizerConfigurationError";
  }
}

export function createMarkdownPresentationService(
  dependencies: MarkdownPresentationServiceDependencies,
): MarkdownPresentationService {
  if (!areMarkdownSanitizerLimitsValid(dependencies.limits)) {
    throw new MarkdownSanitizerConfigurationError();
  }

  return {
    async present(request, options) {
      const sanitized = dependencies.sanitizer.sanitize(
        request.markdown,
        dependencies.limits,
      );
      if (!sanitized.success) {
        return failedPresentationResult(request.requestId, [
          sanitizationPresentationError(sanitized.error.reason),
        ]);
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
        return finalizeSafeMarkdownPresentation({
          requestId: request.requestId,
          markdown: sanitized.markdown,
          sanitizer: dependencies.sanitizer,
          limits: dependencies.limits,
          errors: [routingPresentationError()],
        });
      }

      return finalizeSafeMarkdownPresentation({
        requestId: request.requestId,
        markdown: sanitized.markdown,
        sanitizer: dependencies.sanitizer,
        limits: dependencies.limits,
        ...(decision.mode === "markdown"
          ? {}
          : { errors: [routingPresentationError()] }),
      });
    },
  };
}
