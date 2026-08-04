import {
  type BusinessAgentEvent,
  type BusinessAgentResumeActionRequest,
  type BusinessAgentResumeActionResult,
  type BusinessAgentRunRequest,
  type BusinessAgentRunResult,
  validateBusinessAgentEvent,
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

export interface LangGraphWebSocketBusinessAgentAdapterConfiguration {
  readonly url: string | URL;
  readonly requestTimeoutMs?: number;
  readonly maxResponseBytes?: number;
}

function websocketUrl(value: string | URL): string {
  const url = new URL(value);
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new TypeError("Business Agent WebSocket url must use WS or WSS.");
  }
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new TypeError(
      "Business Agent WebSocket url must not contain credentials, query, or hash data.",
    );
  }
  return url.toString();
}

export class LangGraphWebSocketBusinessAgentAdapter
  implements BusinessAgentAdapter
{
  readonly #url: string;
  readonly #timeoutMs: number;
  readonly #maxResponseBytes: number;

  constructor(
    configuration: LangGraphWebSocketBusinessAgentAdapterConfiguration,
  ) {
    this.#url = websocketUrl(configuration.url);
    this.#timeoutMs = configuration.requestTimeoutMs ?? 10_000;
    this.#maxResponseBytes = configuration.maxResponseBytes ?? 1_048_576;
  }

  async #invoke(
    type: "business-agent.run" | "business-agent.resume-action",
    request: BusinessAgentRunRequest | BusinessAgentResumeActionRequest,
    options: BusinessAgentInvocationOptions,
    normalize: (value: unknown) => BusinessAgentRunResult,
  ): Promise<BusinessAgentRunResult> {
    return new Promise((resolve) => {
      const socket = new WebSocket(this.#url);
      let totalBytes = 0;
      let settled = false;
      const finish = (value: BusinessAgentRunResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", abort);
        socket.close();
        resolve(value);
      };
      const fail = (
        code:
          | "REQUEST_CANCELLED"
          | "BUSINESS_AGENT_TIMEOUT"
          | "BUSINESS_AGENT_PROTOCOL_INVALID"
          | "BUSINESS_AGENT_UNAVAILABLE",
        message: string,
        retryable: boolean,
      ) => finish(adapterFailureResult(request, code, message, retryable));
      const abort = () =>
        fail(
          "REQUEST_CANCELLED",
          "The Business Agent request was cancelled.",
          false,
        );
      const timeout = setTimeout(
        () =>
          fail(
            "BUSINESS_AGENT_TIMEOUT",
            "The Business Agent request exceeded its timeout.",
            true,
          ),
        this.#timeoutMs,
      );
      options.signal?.addEventListener("abort", abort, { once: true });
      socket.addEventListener("open", () =>
        socket.send(JSON.stringify({ type, payload: request })),
      );
      socket.addEventListener("message", async (event) => {
        const text =
          typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(await event.data.arrayBuffer());
        totalBytes += new TextEncoder().encode(text).byteLength;
        if (totalBytes > this.#maxResponseBytes)
          return fail(
            "BUSINESS_AGENT_PROTOCOL_INVALID",
            "The Business Agent WebSocket response exceeds the limit.",
            false,
          );
        let message: unknown;
        try {
          message = JSON.parse(text);
        } catch {
          return fail(
            "BUSINESS_AGENT_PROTOCOL_INVALID",
            "The Business Agent WebSocket response is invalid JSON.",
            false,
          );
        }
        if (typeof message !== "object" || message === null)
          return fail(
            "BUSINESS_AGENT_PROTOCOL_INVALID",
            "The Business Agent WebSocket response is invalid.",
            false,
          );
        const record = message as { type?: unknown; payload?: unknown };
        if (record.type === "business-agent.event") {
          const event = validateBusinessAgentEvent(record.payload);
          if (!event.success)
            return fail(
              "BUSINESS_AGENT_PROTOCOL_INVALID",
              "The Business Agent event is invalid.",
              false,
            );
          options.onEvent?.(event.value as BusinessAgentEvent);
        } else if (record.type === "business-agent.result")
          finish(normalize(record.payload));
        else
          fail(
            "BUSINESS_AGENT_PROTOCOL_INVALID",
            "The Business Agent WebSocket message is invalid.",
            false,
          );
      });
      socket.addEventListener(
        "error",
        () =>
          fail(
            "BUSINESS_AGENT_UNAVAILABLE",
            "The Business Agent is unavailable.",
            true,
          ),
        { once: true },
      );
      socket.addEventListener(
        "close",
        () => {
          if (!settled)
            fail(
              "BUSINESS_AGENT_UNAVAILABLE",
              "The Business Agent WebSocket closed before a result.",
              true,
            );
        },
        { once: true },
      );
    });
  }

  async run(
    request: BusinessAgentRunRequest,
    options: BusinessAgentInvocationOptions = {},
  ): Promise<BusinessAgentRunResult> {
    const invalid = invalidRunRequestResult(request);
    if (invalid !== undefined) return invalid;
    return this.#invoke("business-agent.run", request, options, (value) =>
      normalizeRunResult(request, value),
    );
  }

  async resumeAction(
    request: BusinessAgentResumeActionRequest,
    options: BusinessAgentInvocationOptions = {},
  ): Promise<BusinessAgentResumeActionResult> {
    const invalid = invalidResumeActionRequestResult(request);
    if (invalid !== undefined) return invalid;
    return this.#invoke(
      "business-agent.resume-action",
      request,
      options,
      (value) => normalizeResumeActionResult(request, value),
    );
  }
}
