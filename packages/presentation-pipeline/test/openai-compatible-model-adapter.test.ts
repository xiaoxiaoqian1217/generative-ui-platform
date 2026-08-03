import { describe, expect, it, vi } from "vitest";
import {
  createCatalogCapabilitySummary,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  createOpenAICompatiblePresentationModelAdapter,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  FIXTURE_COMPONENT_CATALOG,
  isModelAdapterError,
  type ModelPresentationRequest,
  OPENAI_COMPATIBLE_MODEL_RESPONSE_LIMITS,
  type OpenAICompatibleFetch,
  PresentationDecisionValidationError,
  type PresentationModelInvocationSummary,
} from "../src/index.js";

function modelRequest(): ModelPresentationRequest {
  const sanitized = createMarkdownSanitizer().sanitize(
    "Safe model input.",
    DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  );
  if (!sanitized.success) {
    throw new Error("Test Markdown must be safe.");
  }

  return {
    requestId: "openai-compatible-contract",
    content: { contentType: "markdown", markdown: sanitized.markdown },
    context: { locale: "zh-CN", userMessage: "Show this safely." },
    catalog: createCatalogCapabilitySummary(FIXTURE_COMPONENT_CATALOG),
    outputSchema: {
      schemaId: "https://generative-ui.dev/schemas/presentation/decision/1.0",
      schemaVersion: "1.0",
    },
  };
}

function providerResponse(candidate: unknown): Response {
  return new Response(
    JSON.stringify({
      id: "response-safe-123",
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify(candidate) },
        },
      ],
      usage: {
        prompt_tokens: 101,
        completion_tokens: 29,
        total_tokens: 130,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("OpenAI-compatible Presentation Model Adapter", () => {
  it.each([
    {
      name: "Markdown",
      candidate: {
        mode: "markdown",
        reason: "Markdown is sufficient for this content.",
      },
    },
    {
      name: "generative UI",
      candidate: {
        mode: "generative-ui",
        reason: "A card improves scanning.",
        plan: {
          version: "1.0",
          scenario: "summary",
          regions: [
            {
              regionId: "summary",
              purpose: "Summary",
              bindings: [{ sourcePointer: "/markdown", role: "content" }],
              componentPreferences: [{ componentType: "Card" }],
              layout: { flow: "vertical", density: "comfortable" },
            },
          ],
        },
      },
    },
  ])(
    "extracts a $name candidate while emitting only safe metadata",
    async ({ candidate }) => {
      const summaries: PresentationModelInvocationSummary[] = [];
      const fetch = vi.fn<OpenAICompatibleFetch>(async () =>
        providerResponse(candidate),
      );
      const times = [10, 34];
      const adapter = createOpenAICompatiblePresentationModelAdapter(
        {
          registrationId: "custom-primary",
          provider: "openai-compatible",
          modelName: "presentation-model",
          baseUrl: "https://provider.example.test/v1",
          endpointId: "deployment-42",
          apiKey: "top-secret-api-key",
        },
        {
          fetch,
          now: () => times.shift() ?? 34,
          onInvocationSummary: (summary) => summaries.push(summary),
        },
      );

      await expect(
        adapter.generatePresentationDecisionCandidate(modelRequest(), {
          signal: new AbortController().signal,
        }),
      ).resolves.toEqual(candidate);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0] ?? [];
      expect(url).toBe("https://provider.example.test/v1/chat/completions");
      expect(init?.headers).toEqual({
        authorization: "Bearer top-secret-api-key",
        "content-type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: "deployment-42",
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0,
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(summaries).toEqual([
        {
          registrationId: "custom-primary",
          provider: "openai-compatible",
          modelName: "presentation-model",
          result: "completed",
          durationMs: 24,
          responseId: "response-safe-123",
          usage: { inputTokens: 101, outputTokens: 29, totalTokens: 130 },
        },
      ]);
      const serializedSummary = JSON.stringify(summaries);
      expect(serializedSummary).not.toContain("top-secret-api-key");
      expect(serializedSummary).not.toContain("Safe model input");
      expect(serializedSummary).not.toContain(JSON.stringify(candidate));
    },
  );

  it.each([
    [401, "MODEL_AUTHENTICATION_FAILED", false],
    [403, "MODEL_PERMISSION_DENIED", false],
    [400, "MODEL_REQUEST_REJECTED", false],
    [429, "MODEL_RATE_LIMITED", true],
    [503, "MODEL_UNAVAILABLE", true],
    [418, "MODEL_PROVIDER_ERROR", false],
  ] as const)(
    "normalizes HTTP %s without exposing the provider body",
    async (status, code, retryable) => {
      const secret = "RAW_PROVIDER_ERROR_MUST_NOT_ESCAPE";
      const summaries: PresentationModelInvocationSummary[] = [];
      const adapter = createOpenAICompatiblePresentationModelAdapter(
        {
          registrationId: "error-mapping",
          provider: "openai-compatible",
          modelName: "presentation-model",
          baseUrl: "https://provider.example.test/v1",
          apiKey: "secret-api-key",
        },
        {
          fetch: async () => new Response(secret, { status }),
          onInvocationSummary: (summary) => summaries.push(summary),
        },
      );

      let caught: unknown;
      try {
        await adapter.generatePresentationDecisionCandidate(modelRequest(), {
          signal: new AbortController().signal,
        });
      } catch (error) {
        caught = error;
      }

      expect(isModelAdapterError(caught)).toBe(true);
      if (isModelAdapterError(caught)) {
        expect(caught).toMatchObject({ code, retryable });
      }
      expect(summaries).toMatchObject([{ result: "failed", errorCode: code }]);
      expect(JSON.stringify({ caught, summaries })).not.toContain(secret);
    },
  );

  it.each([
    {
      name: "malformed JSON body",
      response: new Response("not-json", { status: 200 }),
      code: "MODEL_INVALID_RESPONSE",
    },
    {
      name: "content filtering",
      response: new Response(
        JSON.stringify({
          choices: [
            { finish_reason: "content_filter", message: { content: "" } },
          ],
        }),
        { status: 200 },
      ),
      code: "MODEL_CONTENT_FILTERED",
    },
  ] as const)("normalizes $name", async ({ response, code }) => {
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "response-mapping",
        provider: "openai-compatible",
        modelName: "presentation-model",
        baseUrl: "https://provider.example.test/v1",
        apiKey: "secret-api-key",
      },
      { fetch: async () => response },
    );

    await expect(
      adapter.generatePresentationDecisionCandidate(modelRequest(), {
        signal: new AbortController().signal,
      }),
    ).rejects.toSatisfy(
      (error: unknown) => isModelAdapterError(error) && error.code === code,
    );
  });

  it("normalizes a transport failure and honors a pre-aborted signal", async () => {
    const fetch = vi.fn<OpenAICompatibleFetch>(async () => {
      throw new TypeError("transport detail must not escape");
    });
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "transport",
        provider: "openai-compatible",
        modelName: "presentation-model",
        baseUrl: "https://provider.example.test/v1",
        apiKey: "secret-api-key",
      },
      { fetch },
    );

    await expect(
      adapter.generatePresentationDecisionCandidate(modelRequest(), {
        signal: new AbortController().signal,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isModelAdapterError(error) && error.code === "MODEL_UNAVAILABLE",
    );

    const controller = new AbortController();
    controller.abort();
    await expect(
      adapter.generatePresentationDecisionCandidate(modelRequest(), {
        signal: controller.signal,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isModelAdapterError(error) && error.code === "MODEL_CANCELLED",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("leaves a parsed candidate untrusted for the existing Router validator", async () => {
    const fetch = vi.fn<OpenAICompatibleFetch>(async () =>
      providerResponse({ mode: "generative-ui" }),
    );
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "untrusted-candidate",
        provider: "openai-compatible",
        modelName: "presentation-model",
        baseUrl: "https://provider.example.test/v1",
        apiKey: "secret-api-key",
      },
      { fetch },
    );
    const request = modelRequest();

    await expect(
      createModelPresentationRouter(adapter, {
        modelTimeoutMs: 1_000,
        modelRetryCount: 2,
      }).route(
        {
          requestId: request.requestId,
          content: request.content,
          ...(request.context === undefined
            ? {}
            : { context: request.context }),
          catalog: request.catalog,
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toBeInstanceOf(PresentationDecisionValidationError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("feeds normalized rate limiting into the Router retry boundary", async () => {
    const fetch = vi
      .fn<OpenAICompatibleFetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(
        providerResponse({
          mode: "markdown",
          reason: "The retry returned a valid decision.",
        }),
      );
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "retry-contract",
        provider: "openai-compatible",
        modelName: "presentation-model",
        baseUrl: "https://provider.example.test/v1",
        apiKey: "secret-api-key",
      },
      { fetch },
    );
    const request = modelRequest();

    await expect(
      createModelPresentationRouter(adapter, {
        modelTimeoutMs: 1_000,
        modelRetryCount: 1,
      }).route(
        {
          requestId: request.requestId,
          content: request.content,
          ...(request.context === undefined
            ? {}
            : { context: request.context }),
          catalog: request.catalog,
        },
        { signal: new AbortController().signal },
      ),
    ).resolves.toMatchObject({ mode: "markdown" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects a provider response declared above the bounded response size", async () => {
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "bounded-response",
        provider: "openai-compatible",
        modelName: "presentation-model",
        baseUrl: "https://provider.example.test/v1",
        apiKey: "secret-api-key",
      },
      {
        fetch: async () =>
          new Response("{}", {
            status: 200,
            headers: {
              "content-length": String(
                OPENAI_COMPATIBLE_MODEL_RESPONSE_LIMITS.maxResponseBytes + 1,
              ),
            },
          }),
      },
    );

    await expect(
      adapter.generatePresentationDecisionCandidate(modelRequest(), {
        signal: new AbortController().signal,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isModelAdapterError(error) && error.code === "MODEL_INVALID_RESPONSE",
    );
  });

  it("cancels an undeclared streaming response as soon as the byte limit is exceeded", async () => {
    let cancelled = false;
    const oversizedChunk = new Uint8Array(
      OPENAI_COMPATIBLE_MODEL_RESPONSE_LIMITS.maxResponseBytes + 1,
    );
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(oversizedChunk);
        },
        cancel() {
          cancelled = true;
        },
      }),
      { status: 200 },
    );
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "stream-bounded-response",
        provider: "openai-compatible",
        modelName: "presentation-model",
        baseUrl: "https://provider.example.test/v1",
        apiKey: "secret-api-key",
      },
      { fetch: async () => response },
    );

    await expect(
      adapter.generatePresentationDecisionCandidate(modelRequest(), {
        signal: new AbortController().signal,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isModelAdapterError(error) && error.code === "MODEL_INVALID_RESPONSE",
    );
    expect(cancelled).toBe(true);
  });

  it("disables Qwen thinking mode when requesting JSON output", async () => {
    const fetch = vi.fn<OpenAICompatibleFetch>(async () =>
      providerResponse({ mode: "markdown", reason: "Valid JSON mode." }),
    );
    const adapter = createOpenAICompatiblePresentationModelAdapter(
      {
        registrationId: "qwen-json-mode",
        provider: "qwen",
        modelName: "qwen-model",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: "secret-api-key",
      },
      { fetch },
    );

    await adapter.generatePresentationDecisionCandidate(modelRequest(), {
      signal: new AbortController().signal,
    });

    expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toMatchObject({
      response_format: { type: "json_object" },
      enable_thinking: false,
    });
  });
});
