import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentResumeActionResult,
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
} from "@generative-ui/runtime-contract";
import type {
  BusinessAgentAdapter,
  BusinessAgentInvocationOptions,
} from "./adapter.js";
import {
  adapterFailureResult,
  invalidResumeActionRequestResult,
  invalidRunRequestResult,
  normalizeResumeActionResult,
  normalizeRunResult,
} from "./contract-boundary.js";

function isAborted(options: BusinessAgentInvocationOptions): boolean {
  return options.signal?.aborted === true;
}

export interface MockBusinessAgentHandlers {
  run(
    request: BusinessAgentRunRequest,
    options: BusinessAgentInvocationOptions,
  ): BusinessAgentRunResult | Promise<BusinessAgentRunResult>;

  resumeAction(
    request: BusinessAgentResumeActionRequest,
    options: BusinessAgentInvocationOptions,
  ): BusinessAgentResumeActionResult | Promise<BusinessAgentResumeActionResult>;
}

export class MockBusinessAgentAdapter implements BusinessAgentAdapter {
  readonly #handlers: MockBusinessAgentHandlers;

  constructor(handlers: MockBusinessAgentHandlers) {
    this.#handlers = handlers;
  }

  async run(
    request: BusinessAgentRunRequest,
    options: BusinessAgentInvocationOptions = {},
  ): Promise<BusinessAgentRunResult> {
    const invalidRequest = invalidRunRequestResult(request);
    if (invalidRequest !== undefined) return invalidRequest;
    if (options.signal?.aborted === true) {
      return adapterFailureResult(
        request,
        "REQUEST_CANCELLED",
        "The Business Agent request was cancelled.",
        false,
      );
    }
    try {
      const result = await this.#handlers.run(request, options);
      return normalizeRunResult(request, result);
    } catch {
      const cancelled = isAborted(options);
      return adapterFailureResult(
        request,
        cancelled ? "REQUEST_CANCELLED" : "BUSINESS_AGENT_ERROR",
        cancelled
          ? "The Business Agent request was cancelled."
          : "The Business Agent could not complete the request.",
        false,
      );
    }
  }

  async resumeAction(
    request: BusinessAgentResumeActionRequest,
    options: BusinessAgentInvocationOptions = {},
  ): Promise<BusinessAgentResumeActionResult> {
    const invalidRequest = invalidResumeActionRequestResult(request);
    if (invalidRequest !== undefined) return invalidRequest;
    if (options.signal?.aborted === true) {
      return adapterFailureResult(
        request,
        "REQUEST_CANCELLED",
        "The Business Agent request was cancelled.",
        false,
      );
    }
    try {
      const result = await this.#handlers.resumeAction(request, options);
      return normalizeResumeActionResult(request, result);
    } catch {
      const cancelled = isAborted(options);
      return adapterFailureResult(
        request,
        cancelled ? "REQUEST_CANCELLED" : "BUSINESS_AGENT_ERROR",
        cancelled
          ? "The Business Agent request was cancelled."
          : "The Business Agent could not complete the request.",
        false,
      );
    }
  }
}
