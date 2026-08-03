import type {
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

const safeSanitizationFailureMessage =
  "Markdown content could not be safely processed.";
const safeRoutingFailureMessage =
  "Presentation routing could not be completed.";

export function sanitizationPresentationError(
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

export function routingPresentationError(): PresentationError {
  return {
    code: "PRESENTATION_ROUTING_FAILED",
    message: safeRoutingFailureMessage,
    stage: "presentation-routing",
    retryable: false,
  };
}

export function failedPresentationResult(
  requestId: string,
  errors: readonly PresentationError[],
): PresentationResult {
  return {
    requestId,
    status: "failed",
    errors: [...errors],
  };
}

export interface FinalizeSafeMarkdownOptions {
  requestId: string;
  markdown: SanitizedMarkdown;
  sanitizer: MarkdownSanitizer;
  limits: MarkdownSanitizerLimits;
  errors?: readonly PresentationError[];
}

export function finalizeSafeMarkdownPresentation(
  options: FinalizeSafeMarkdownOptions,
): PresentationResult {
  const output = options.sanitizer.sanitize(
    options.markdown,
    createDefensiveMarkdownSanitizerLimits(options.limits),
  );
  if (!output.success) {
    return failedPresentationResult(options.requestId, [
      ...(options.errors ?? []),
      sanitizationPresentationError(output.error.reason),
    ]);
  }

  const errors = options.errors ?? [];
  if (errors.length === 0) {
    return {
      requestId: options.requestId,
      status: "completed",
      mode: "markdown",
      markdown: output.markdown,
    };
  }

  return {
    requestId: options.requestId,
    status: "degraded",
    mode: "markdown",
    markdown: output.markdown,
    errors: [...errors],
  };
}
