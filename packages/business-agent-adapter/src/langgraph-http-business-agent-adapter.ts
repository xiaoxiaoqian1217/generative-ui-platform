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

export interface LangGraphHttpBusinessAgentAdapterConfiguration {
  readonly baseUrl: string | URL;
  readonly requestTimeoutMs?: number;
  readonly maxResponseBytes?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 100;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_TIMEOUT_MS = 300_000;
const MAX_RESPONSE_BYTES = 10_485_760;
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;

class InvalidProtocolResponseError extends Error {}

class HttpResponseStatusError extends Error {
  constructor(readonly status: number) {
    super();
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function boundedInteger(
  value: number | undefined,
  defaultValue: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const resolved = value ?? defaultValue;
  if (
    !Number.isSafeInteger(resolved) ||
    resolved < minimum ||
    resolved > maximum
  ) {
    throw new RangeError(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return resolved;
}

function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function readBoundedJson(
  response: Response,
  maximumBytes: number,
): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > maximumBytes
  ) {
    await response.body?.cancel();
    throw new InvalidProtocolResponseError();
  }
  if (response.body === null) throw new InvalidProtocolResponseError();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new InvalidProtocolResponseError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new InvalidProtocolResponseError();
  }
}

function normalizeBaseUrl(value: string | URL): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("Business Agent baseUrl must use HTTP or HTTPS.");
  }
  if (url.username !== "" || url.password !== "") {
    throw new TypeError("Business Agent baseUrl must not contain credentials.");
  }
  if (url.search !== "" || url.hash !== "") {
    throw new TypeError(
      "Business Agent baseUrl must not contain query or hash data.",
    );
  }
  url.pathname = `${url.pathname.replace(/\/+$/u, "")}/`;
  return url;
}

function correlationHeaders(
  request: Pick<BusinessAgentRunRequest, "requestId" | "threadId" | "runId">,
): HeadersInit {
  return {
    "content-type": "application/json",
    "x-request-id": request.requestId,
    "x-thread-id": request.threadId,
    "x-run-id": request.runId,
  };
}

export class LangGraphHttpBusinessAgentAdapter implements BusinessAgentAdapter {
  readonly #baseUrl: URL;
  readonly #maxRetries: number;
  readonly #maxResponseBytes: number;
  readonly #requestTimeoutMs: number;
  readonly #retryDelayMs: number;

  constructor(configuration: LangGraphHttpBusinessAgentAdapterConfiguration) {
    this.#baseUrl = normalizeBaseUrl(configuration.baseUrl);
    this.#requestTimeoutMs = boundedInteger(
      configuration.requestTimeoutMs,
      DEFAULT_REQUEST_TIMEOUT_MS,
      "requestTimeoutMs",
      1,
      MAX_REQUEST_TIMEOUT_MS,
    );
    this.#maxResponseBytes = boundedInteger(
      configuration.maxResponseBytes,
      DEFAULT_MAX_RESPONSE_BYTES,
      "maxResponseBytes",
      128,
      MAX_RESPONSE_BYTES,
    );
    this.#maxRetries = boundedInteger(
      configuration.maxRetries,
      DEFAULT_MAX_RETRIES,
      "maxRetries",
      0,
      MAX_RETRIES,
    );
    this.#retryDelayMs = boundedInteger(
      configuration.retryDelayMs,
      DEFAULT_RETRY_DELAY_MS,
      "retryDelayMs",
      0,
      MAX_RETRY_DELAY_MS,
    );
  }

  async #post(
    path: string,
    request: BusinessAgentRunRequest | BusinessAgentResumeActionRequest,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await fetch(new URL(path, this.#baseUrl), {
      method: "POST",
      headers: correlationHeaders(request),
      body: JSON.stringify(request),
      ...(signal === undefined ? {} : { signal }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new HttpResponseStatusError(response.status);
    }
    return readBoundedJson(response, this.#maxResponseBytes);
  }

  async #invoke(
    path: string,
    request: BusinessAgentRunRequest | BusinessAgentResumeActionRequest,
    options: BusinessAgentInvocationOptions,
    normalize: (input: unknown) => BusinessAgentRunResult,
  ): Promise<BusinessAgentRunResult> {
    const deadline = new AbortController();
    const timeout = setTimeout(() => deadline.abort(), this.#requestTimeoutMs);
    const signal =
      options.signal === undefined
        ? deadline.signal
        : AbortSignal.any([options.signal, deadline.signal]);
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return normalize(await this.#post(path, request, signal));
        } catch (caught) {
          if (options.signal?.aborted === true) {
            return adapterFailureResult(
              request,
              "REQUEST_CANCELLED",
              "The Business Agent request was cancelled.",
              false,
            );
          }
          if (deadline.signal.aborted) {
            return adapterFailureResult(
              request,
              "BUSINESS_AGENT_TIMEOUT",
              "The Business Agent request exceeded its timeout.",
              true,
            );
          }
          if (caught instanceof InvalidProtocolResponseError) {
            return adapterFailureResult(
              request,
              "BUSINESS_AGENT_PROTOCOL_INVALID",
              "The Business Agent response does not contain valid JSON.",
              false,
            );
          }
          if (
            caught instanceof HttpResponseStatusError &&
            !isRetryableHttpStatus(caught.status)
          ) {
            return adapterFailureResult(
              request,
              "BUSINESS_AGENT_PROTOCOL_INVALID",
              "The Business Agent HTTP endpoint rejected the protocol request.",
              false,
            );
          }
          if (attempt >= this.#maxRetries) {
            return adapterFailureResult(
              request,
              "BUSINESS_AGENT_UNAVAILABLE",
              "The Business Agent is unavailable.",
              true,
            );
          }
          try {
            await wait(this.#retryDelayMs, signal);
          } catch {
            // The next iteration maps the combined signal to timeout or cancellation.
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async run(
    request: BusinessAgentRunRequest,
    options: BusinessAgentInvocationOptions = {},
  ): Promise<BusinessAgentRunResult> {
    const invalidRequest = invalidRunRequestResult(request);
    if (invalidRequest !== undefined) return invalidRequest;
    return this.#invoke("api/runs", request, options, (input) =>
      normalizeRunResult(request, input),
    );
  }

  async resumeAction(
    request: BusinessAgentResumeActionRequest,
    options: BusinessAgentInvocationOptions = {},
  ): Promise<BusinessAgentResumeActionResult> {
    const invalidRequest = invalidResumeActionRequestResult(request);
    if (invalidRequest !== undefined) return invalidRequest;
    return this.#invoke("api/actions", request, options, (input) =>
      normalizeResumeActionResult(request, input),
    );
  }
}
