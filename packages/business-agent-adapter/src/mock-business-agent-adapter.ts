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

const cancelled = Symbol("cancelled");

async function withCancellation<T>(
  operation: Promise<T> | T,
  signal: AbortSignal | undefined,
): Promise<T | typeof cancelled> {
  const operationPromise = Promise.resolve(operation);
  if (signal === undefined) return operationPromise;
  if (signal.aborted) {
    void operationPromise.catch(() => undefined);
    return cancelled;
  }
  return new Promise<T | typeof cancelled>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      resolve(cancelled);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    void operationPromise.then(
      (result) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (caught: unknown) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(caught);
      },
    );
  });
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
      const result = await withCancellation(
        this.#handlers.run(request, options),
        options.signal,
      );
      if (result === cancelled) {
        return adapterFailureResult(
          request,
          "REQUEST_CANCELLED",
          "The Business Agent request was cancelled.",
          false,
        );
      }
      return normalizeRunResult(request, result);
    } catch {
      const cancellationObserved = isAborted(options);
      return adapterFailureResult(
        request,
        cancellationObserved ? "REQUEST_CANCELLED" : "BUSINESS_AGENT_ERROR",
        cancellationObserved
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
      const result = await withCancellation(
        this.#handlers.resumeAction(request, options),
        options.signal,
      );
      if (result === cancelled) {
        return adapterFailureResult(
          request,
          "REQUEST_CANCELLED",
          "The Business Agent request was cancelled.",
          false,
        );
      }
      return normalizeResumeActionResult(request, result);
    } catch {
      const cancellationObserved = isAborted(options);
      return adapterFailureResult(
        request,
        cancellationObserved ? "REQUEST_CANCELLED" : "BUSINESS_AGENT_ERROR",
        cancellationObserved
          ? "The Business Agent request was cancelled."
          : "The Business Agent could not complete the request.",
        false,
      );
    }
  }
}
