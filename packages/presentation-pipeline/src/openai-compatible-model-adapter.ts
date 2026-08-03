import { presentationDecisionSchema } from "@generative-ui/presentation-contract";
import type {
  ModelAdapter,
  ModelAdapterErrorCode,
  ModelCallOptions,
  ModelPresentationRequest,
} from "./presentation-router.js";
import { ModelAdapterError } from "./presentation-router.js";

export type PresentationModelProvider =
  | "kimi"
  | "doubao"
  | "glm"
  | "qwen"
  | "openai-compatible";

export interface PresentationModelProviderRegistration {
  readonly registrationId: string;
  readonly provider: PresentationModelProvider;
  readonly modelName: string;
  readonly baseUrl?: string;
  readonly endpointId?: string;
  readonly apiKey: string;
}

export interface PresentationModelUsageSummary {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface PresentationModelInvocationSummary {
  readonly registrationId: string;
  readonly provider: PresentationModelProvider;
  readonly modelName: string;
  readonly result: "completed" | "failed" | "cancelled";
  readonly durationMs: number;
  readonly responseId?: string;
  readonly usage?: PresentationModelUsageSummary;
  readonly errorCode?: ModelAdapterErrorCode;
}

export interface OpenAICompatibleFetchOptions {
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly signal: AbortSignal;
}

export type OpenAICompatibleFetch = (
  url: string,
  options: OpenAICompatibleFetchOptions,
) => Promise<Response>;

export interface OpenAICompatiblePresentationModelAdapterDependencies {
  readonly fetch?: OpenAICompatibleFetch;
  readonly now?: () => number;
  readonly onInvocationSummary?: (
    summary: PresentationModelInvocationSummary,
  ) => void;
}

export class PresentationModelProviderConfigurationError extends Error {
  readonly code = "PRESENTATION_MODEL_PROVIDER_CONFIGURATION_INVALID";

  constructor() {
    super("Presentation Model Provider configuration is invalid.");
    this.name = "PresentationModelProviderConfigurationError";
  }
}

interface StableProviderConfiguration {
  readonly registrationId: string;
  readonly provider: PresentationModelProvider;
  readonly modelName: string;
  readonly baseUrl: string;
  readonly requestModel: string;
  readonly apiKey: string;
}

function snapshotPresentationModelProviderRegistration(
  input: PresentationModelProviderRegistration,
): Readonly<PresentationModelProviderRegistration> {
  try {
    const registrationId = input.registrationId;
    const provider = input.provider;
    const modelName = input.modelName;
    const baseUrl = input.baseUrl;
    const endpointId = input.endpointId;
    const apiKey = input.apiKey;
    return Object.freeze({
      registrationId,
      provider,
      modelName,
      apiKey,
      ...(baseUrl === undefined ? {} : { baseUrl }),
      ...(endpointId === undefined ? {} : { endpointId }),
    });
  } catch {
    throw new PresentationModelProviderConfigurationError();
  }
}

const providerIds: ReadonlySet<PresentationModelProvider> = new Set([
  "kimi",
  "doubao",
  "glm",
  "qwen",
  "openai-compatible",
]);

const registrationIdPattern = /^[a-z][a-z0-9._-]{0,63}$/;
const safeResponseIdPattern = /^[A-Za-z0-9._:-]{1,256}$/;
export const OPENAI_COMPATIBLE_MODEL_RESPONSE_LIMITS = Object.freeze({
  maxResponseBytes: 1_048_576,
});

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
      return true;
    }
  }
  return false;
}

function isBoundedText(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value.trim() === value &&
    !hasControlCharacters(value)
  );
}

function normalizeBaseUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return undefined;
    }
    return url.toString().replace(/\/+$/u, "");
  } catch {
    return undefined;
  }
}

function validatePresentationModelProviderRegistration(
  input: PresentationModelProviderRegistration,
): Readonly<StableProviderConfiguration> {
  try {
    const snapshot = snapshotPresentationModelProviderRegistration(input);
    const baseUrl = normalizeBaseUrl(snapshot.baseUrl ?? "");
    if (
      !registrationIdPattern.test(snapshot.registrationId) ||
      !providerIds.has(snapshot.provider) ||
      !isBoundedText(snapshot.modelName, 256) ||
      !isBoundedText(snapshot.apiKey, 4_096) ||
      (snapshot.endpointId !== undefined &&
        !isBoundedText(snapshot.endpointId, 256)) ||
      baseUrl === undefined
    ) {
      throw new PresentationModelProviderConfigurationError();
    }

    return Object.freeze({
      registrationId: snapshot.registrationId,
      provider: snapshot.provider,
      modelName: snapshot.modelName,
      baseUrl,
      requestModel: snapshot.endpointId ?? snapshot.modelName,
      apiKey: snapshot.apiKey,
    });
  } catch (caught) {
    if (caught instanceof PresentationModelProviderConfigurationError) {
      throw caught;
    }
    throw new PresentationModelProviderConfigurationError();
  }
}

function systemFetch(
  url: string,
  options: OpenAICompatibleFetchOptions,
): Promise<Response> {
  return fetch(url, options);
}

function safeNow(now: () => number): number {
  try {
    const value = now();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function safeDuration(startedAt: number, now: () => number): number {
  return Math.max(0, Math.trunc(safeNow(now) - startedAt));
}

function emitSummarySafely(
  observer: ((summary: PresentationModelInvocationSummary) => void) | undefined,
  summary: PresentationModelInvocationSummary,
): void {
  try {
    observer?.(Object.freeze(summary));
  } catch {
    // Provider observability must never change presentation behavior.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeTokenCount(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : undefined;
}

function usageSummary(
  value: unknown,
): PresentationModelUsageSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const inputTokens = safeTokenCount(value.prompt_tokens);
  const outputTokens = safeTokenCount(value.completion_tokens);
  const totalTokens = safeTokenCount(value.total_tokens);
  if (
    inputTokens === undefined ||
    outputTokens === undefined ||
    totalTokens === undefined
  ) {
    return undefined;
  }
  return Object.freeze({ inputTokens, outputTokens, totalTokens });
}

interface ExtractedProviderResponse {
  readonly candidate: unknown;
  readonly responseId?: string;
  readonly usage?: PresentationModelUsageSummary;
}

async function readBoundedResponseText(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/u.test(declaredLength) &&
    Number(declaredLength) >
      OPENAI_COMPATIBLE_MODEL_RESPONSE_LIMITS.maxResponseBytes
  ) {
    await response.body?.cancel();
    throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
  }
  if (response.body === null) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (
        totalBytes > OPENAI_COMPATIBLE_MODEL_RESPONSE_LIMITS.maxResponseBytes
      ) {
        await reader.cancel();
        throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function extractProviderResponse(
  response: Response,
): Promise<ExtractedProviderResponse> {
  let payload: unknown;
  try {
    const responseText = await readBoundedResponseText(response);
    payload = JSON.parse(responseText);
  } catch (caught) {
    if (caught instanceof ModelAdapterError) {
      throw caught;
    }
    throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
  }
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
  }
  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice)) {
    throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
  }
  if (firstChoice.finish_reason === "content_filter") {
    throw new ModelAdapterError("MODEL_CONTENT_FILTERED", false);
  }
  if (
    firstChoice.finish_reason !== "stop" ||
    !isRecord(firstChoice.message) ||
    typeof firstChoice.message.content !== "string"
  ) {
    throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(firstChoice.message.content);
  } catch {
    throw new ModelAdapterError("MODEL_INVALID_RESPONSE", false);
  }

  const responseId =
    typeof payload.id === "string" && safeResponseIdPattern.test(payload.id)
      ? payload.id
      : undefined;
  const usage = usageSummary(payload.usage);
  return {
    candidate,
    ...(responseId === undefined ? {} : { responseId }),
    ...(usage === undefined ? {} : { usage }),
  };
}

function errorForHttpStatus(status: number): ModelAdapterError {
  if (status === 401) {
    return new ModelAdapterError("MODEL_AUTHENTICATION_FAILED", false);
  }
  if (status === 403) {
    return new ModelAdapterError("MODEL_PERMISSION_DENIED", false);
  }
  if (status === 429) {
    return new ModelAdapterError("MODEL_RATE_LIMITED", true);
  }
  if (status === 408 || status === 425 || status >= 500) {
    return new ModelAdapterError("MODEL_UNAVAILABLE", true);
  }
  if (
    status === 400 ||
    status === 404 ||
    status === 409 ||
    status === 413 ||
    status === 422
  ) {
    return new ModelAdapterError("MODEL_REQUEST_REJECTED", false);
  }
  return new ModelAdapterError("MODEL_PROVIDER_ERROR", false);
}

function requestBody(
  request: ModelPresentationRequest,
  model: string,
  provider: PresentationModelProvider,
): string {
  return JSON.stringify({
    model,
    ...(provider === "qwen" ? { enable_thinking: false } : {}),
    messages: [
      {
        role: "system",
        content:
          "Return exactly one JSON PresentationDecision. Choose markdown or generative-ui. A generative-ui decision must include a complete UI Plan Candidate constrained to the supplied Catalog. Never return A2UI, HTML, executable code, or vendor objects.",
      },
      {
        role: "user",
        content: JSON.stringify({
          content: request.content,
          ...(request.context === undefined
            ? {}
            : { context: request.context }),
          catalog: request.catalog,
          outputSchema: presentationDecisionSchema,
        }),
      },
    ],
    response_format: { type: "json_object" },
    stream: false,
    temperature: 0,
  });
}

export function createOpenAICompatiblePresentationModelAdapter(
  registration: PresentationModelProviderRegistration,
  dependencies: OpenAICompatiblePresentationModelAdapterDependencies = {},
): ModelAdapter {
  const configuration =
    validatePresentationModelProviderRegistration(registration);
  const request = dependencies.fetch ?? systemFetch;
  const now = dependencies.now ?? (() => performance.now());

  return Object.freeze({
    async generatePresentationDecisionCandidate(
      modelRequest: ModelPresentationRequest,
      options: ModelCallOptions,
    ): Promise<unknown> {
      const startedAt = safeNow(now);
      let extracted: ExtractedProviderResponse | undefined;
      let failure: ModelAdapterError | undefined;
      try {
        if (options.signal.aborted) {
          throw new ModelAdapterError("MODEL_CANCELLED", false);
        }
        const response = await request(
          `${configuration.baseUrl}/chat/completions`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${configuration.apiKey}`,
              "content-type": "application/json",
            },
            body: requestBody(
              modelRequest,
              configuration.requestModel,
              configuration.provider,
            ),
            signal: options.signal,
          },
        );
        if (!response.ok) {
          failure = errorForHttpStatus(response.status);
          try {
            await response.body?.cancel();
          } catch {
            // The response is already being discarded.
          }
          throw failure;
        }
        extracted = await extractProviderResponse(response);
        return extracted.candidate;
      } catch (caught) {
        if (options.signal.aborted) {
          failure = new ModelAdapterError("MODEL_CANCELLED", false);
        } else if (caught instanceof ModelAdapterError) {
          failure = caught;
        } else if (caught instanceof TypeError) {
          failure = new ModelAdapterError("MODEL_UNAVAILABLE", true);
        } else {
          failure = new ModelAdapterError("MODEL_PROVIDER_ERROR", false);
        }
        throw failure;
      } finally {
        emitSummarySafely(dependencies.onInvocationSummary, {
          registrationId: configuration.registrationId,
          provider: configuration.provider,
          modelName: configuration.modelName,
          result:
            failure?.code === "MODEL_CANCELLED"
              ? "cancelled"
              : failure === undefined
                ? "completed"
                : "failed",
          durationMs: safeDuration(startedAt, now),
          ...(extracted?.responseId === undefined
            ? {}
            : { responseId: extracted.responseId }),
          ...(extracted?.usage === undefined ? {} : { usage: extracted.usage }),
          ...(failure === undefined ? {} : { errorCode: failure.code }),
        });
      }
    },
  });
}
