import { request as httpRequest } from "node:http";
import {
  type ComponentCatalog,
  computeCatalogContentHash,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it, vi } from "vitest";
import { createHttpServer } from "../src/http-server.js";
import {
  createCatalogCapabilitySummary,
  createGenerativeUIPresentationService,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  createStructuredDataSerializer,
  createStructuredDataValidator,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  DEFAULT_STRUCTURED_DATA_LIMITS,
  type ModelAdapter,
  ModelAdapterError,
  type ModelInvocationRuntime,
  type ModelPresentationRequest,
  PresentationRouterConfigurationError,
} from "../src/main.js";

const emptyObjectSchema = {
  $schema: "http://json-schema.org/draft-07/schema#" as const,
  type: "object" as const,
  additionalProperties: false,
};

const catalog = {
  schemaVersion: "1.0",
  catalogId: "summary",
  catalogVersion: "1.0.0",
  components: [
    {
      componentType: "Card",
      displayName: "Card",
      description: "Groups summary content.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          title: { type: "string", minLength: 1 },
          content: { type: "object" },
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: { canHaveChildren: false },
    },
    {
      componentType: "Text",
      displayName: "Text",
      description: "Renders a text summary.",
      category: "common",
      domainTags: [],
      propsSchema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: { canHaveChildren: false },
    },
  ],
  actions: [],
} satisfies ComponentCatalog;

function candidateFor(request: ModelPresentationRequest) {
  const sourcePointer =
    request.content.contentType === "markdown" ? "/markdown" : "/summary";
  const componentType =
    request.content.contentType === "markdown" ? "Text" : "Card";
  return {
    mode: "generative-ui" as const,
    reason: "A card makes the supplied summary easier to scan.",
    plan: {
      version: "1.0" as const,
      scenario: "summary" as const,
      regions: [
        {
          regionId: "summary",
          purpose: "Summary",
          bindings: [{ sourcePointer, role: "content" as const }],
          componentPreferences: [{ componentType }],
          layout: {
            flow: "vertical" as const,
            density: "comfortable" as const,
          },
        },
      ],
    },
  };
}

function createService(
  adapter: ModelAdapter,
  compile?: Parameters<
    typeof createGenerativeUIPresentationService
  >[0]["compile"],
  catalogRepository: { load(): unknown } = { load: () => catalog },
  createSurfaceId: Parameters<
    typeof createGenerativeUIPresentationService
  >[0]["createSurfaceId"] = () => "surface-presentation-test",
  policy = { modelTimeoutMs: 1_000, modelRetryCount: 0 },
  runtime?: ModelInvocationRuntime,
  compileTimeoutMs?: number,
) {
  return createGenerativeUIPresentationService({
    catalogRepository,
    sanitizer: createMarkdownSanitizer(),
    structuredDataValidator: createStructuredDataValidator(),
    structuredDataSerializer: createStructuredDataSerializer(),
    router: createModelPresentationRouter(adapter, policy, runtime),
    markdownLimits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    structuredDataLimits: DEFAULT_STRUCTURED_DATA_LIMITS,
    catalogSchemaLimits: defaultCatalogSchemaLimits,
    coreLimits: {
      maxDataDepth: 16,
      maxDataItems: 256,
      catalogSchema: defaultCatalogSchemaLimits,
    },
    createSurfaceId,
    ...(compileTimeoutMs === undefined ? {} : { compileTimeoutMs }),
    ...(compile === undefined ? {} : { compile }),
  });
}

function deeplyNestedData(depth: number): unknown {
  let value: unknown = "leaf";
  for (let index = 0; index < depth; index += 1) {
    value = { child: value };
  }
  return value;
}

describe("Generative UI presentation path", () => {
  it("creates an immutable Catalog summary in Unicode code-point order", () => {
    const payloadSchema = {
      ...emptyObjectSchema,
      properties: { safe: { type: "string" } },
    };
    const summary = createCatalogCapabilitySummary({
      ...catalog,
      actions: [
        {
          actionType: "z",
          description: "z",
          payloadSchema,
          destructive: false,
          requiresApproval: false,
        },
        {
          actionType: "A",
          description: "A",
          payloadSchema: emptyObjectSchema,
          destructive: false,
          requiresApproval: false,
        },
        {
          actionType: "a",
          description: "a",
          payloadSchema: emptyObjectSchema,
          destructive: false,
          requiresApproval: false,
        },
        {
          actionType: "😀",
          description: "emoji",
          payloadSchema: emptyObjectSchema,
          destructive: false,
          requiresApproval: false,
        },
      ],
    });

    expect(summary.actions.map((action) => action.actionType)).toEqual([
      "A",
      "a",
      "z",
      "😀",
    ]);
    expect(summary.actions[2]?.payloadSchema).not.toBe(payloadSchema);
    expect(Object.isFrozen(summary.actions[2]?.payloadSchema)).toBe(true);
  });

  it.each([
    {
      name: "Markdown",
      content: { contentType: "markdown", markdown: "Revenue is 125 CNY." },
    },
    {
      name: "structured data",
      content: {
        contentType: "structured-data",
        data: { summary: { revenue: 125, currency: "CNY" } },
      },
    },
  ])("compiles $name through one model call into A2UI", async ({ content }) => {
    const generate = vi.fn<
      ModelAdapter["generatePresentationDecisionCandidate"]
    >(async (request) => candidateFor(request));
    const result = await createService({
      generatePresentationDecisionCandidate: generate,
    }).present(
      {
        requestId: `request-${content.contentType}`,
        content,
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(generate).toHaveBeenCalledTimes(1);
    const modelRequest = generate.mock.calls[0]?.[0];
    expect(modelRequest?.catalog.catalog.catalogContentHash).toBe(
      computeCatalogContentHash(catalog),
    );
    expect(modelRequest?.catalog.catalog.catalogId).toBe(catalog.catalogId);
    expect(modelRequest?.catalog.catalog.catalogVersion).toBe(
      catalog.catalogVersion,
    );
    expect(result).toMatchObject({
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-presentation-test",
    });
    if (result.status === "completed" && result.mode === "generative-ui") {
      expect(result.operations).not.toHaveLength(0);
    }
  });

  it("rejects an invalid candidate before Core and degrades to safe Markdown", async () => {
    const compile = vi.fn();
    const result = await createService(
      {
        generatePresentationDecisionCandidate: async () => ({
          mode: "markdown",
          reason: "Invalid because Markdown cannot contain a plan.",
          plan: {},
        }),
      },
      compile,
    ).present(
      {
        requestId: "invalid-candidate",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(compile).not.toHaveBeenCalled();
    expect(result).toEqual({
      requestId: "invalid-candidate",
      status: "degraded",
      mode: "markdown",
      markdown: "Safe source content.\n",
      errors: [
        {
          code: "PRESENTATION_DECISION_INVALID",
          message: "Model output could not be used to generate UI.",
          stage: "ui-plan-validation",
          retryable: false,
        },
      ],
    });
  });

  it.each([
    {
      name: "zero timeout",
      policy: { modelTimeoutMs: 0, modelRetryCount: 0 },
    },
    {
      name: "non-finite timeout",
      policy: { modelTimeoutMs: Number.POSITIVE_INFINITY, modelRetryCount: 0 },
    },
    {
      name: "negative retries",
      policy: { modelTimeoutMs: 1_000, modelRetryCount: -1 },
    },
    {
      name: "fractional retries",
      policy: { modelTimeoutMs: 1_000, modelRetryCount: 0.5 },
    },
  ])("rejects $name when creating the model Router", ({ policy }) => {
    expect(() =>
      createModelPresentationRouter(
        {
          generatePresentationDecisionCandidate: async () => ({
            mode: "markdown",
            reason: "unused",
          }),
        },
        policy,
      ),
    ).toThrowError(PresentationRouterConfigurationError);
  });

  it("preserves stable Model Adapter errors during Markdown degradation", async () => {
    const result = await createService({
      generatePresentationDecisionCandidate: async () => {
        throw new ModelAdapterError("MODEL_TIMEOUT", true);
      },
    }).present(
      {
        requestId: "model-timeout",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "model-timeout",
      status: "degraded",
      mode: "markdown",
      errors: [
        {
          code: "MODEL_TIMEOUT",
          stage: "model-analysis",
          retryable: true,
        },
      ],
    });
  });

  it("retries only declared transient failures and counts physical calls", async () => {
    const generate = vi
      .fn<ModelAdapter["generatePresentationDecisionCandidate"]>()
      .mockRejectedValueOnce(new ModelAdapterError("MODEL_RATE_LIMITED", true))
      .mockRejectedValueOnce(new ModelAdapterError("MODEL_UNAVAILABLE", true))
      .mockImplementation(async (request) => candidateFor(request));

    const result = await createService(
      { generatePresentationDecisionCandidate: generate },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 2 },
    ).present(
      {
        requestId: "retries-succeed",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(generate).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      status: "completed",
      mode: "generative-ui",
    });
  });

  it("returns MODEL_RETRY_EXHAUSTED after the configured retry limit", async () => {
    const generate = vi.fn<
      ModelAdapter["generatePresentationDecisionCandidate"]
    >(async () => {
      throw new ModelAdapterError("MODEL_RATE_LIMITED", true);
    });
    const result = await createService(
      { generatePresentationDecisionCandidate: generate },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 1 },
    ).present(
      {
        requestId: "retries-exhausted",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      status: "degraded",
      errors: [
        {
          code: "MODEL_RETRY_EXHAUSTED",
          details: { attempts: 2, lastRetryableCode: "MODEL_RATE_LIMITED" },
        },
      ],
    });
  });

  it("cancels the active call and does not retry after cancellation", async () => {
    const controller = new AbortController();
    let observedSignal: AbortSignal | undefined;
    const generate = vi.fn<
      ModelAdapter["generatePresentationDecisionCandidate"]
    >(async (_request, options) => {
      observedSignal = options.signal;
      return new Promise<never>(() => {});
    });
    const pending = createService(
      { generatePresentationDecisionCandidate: generate },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 2 },
    ).present(
      {
        requestId: "cancelled-model",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: controller.signal },
    );
    controller.abort();
    const result = await pending;

    expect(observedSignal?.aborted).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "degraded",
      errors: [{ code: "MODEL_CANCELLED", retryable: false }],
    });
  });

  it("does not invoke the model when the caller signal is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const generate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const result = await createService(
      { generatePresentationDecisionCandidate: generate },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 1 },
    ).present(
      {
        requestId: "already-cancelled",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: controller.signal },
    );

    expect(generate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "degraded",
      errors: [{ code: "MODEL_CANCELLED", retryable: false }],
    });
  });

  it("uses the total model deadline across a pending attempt", async () => {
    let observedSignal: AbortSignal | undefined;
    const result = await createService(
      {
        generatePresentationDecisionCandidate: async (_request, options) => {
          observedSignal = options.signal;
          return new Promise<never>(() => {});
        },
      },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 20, modelRetryCount: 0 },
    ).present(
      {
        requestId: "model-deadline",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(observedSignal?.aborted).toBe(true);
    expect(result).toMatchObject({
      status: "degraded",
      errors: [{ code: "MODEL_TIMEOUT", retryable: true }],
    });
  });

  it("uses an injected clock to terminate a pending model invocation", async () => {
    const callbacks: (() => void)[] = [];
    const runtime: ModelInvocationRuntime = {
      random: () => 0,
      schedule: (callback) => {
        callbacks.push(callback);
        return callbacks.length as unknown as ReturnType<typeof setTimeout>;
      },
      cancel: () => {},
    };
    const pending = createService(
      {
        generatePresentationDecisionCandidate: async () =>
          new Promise<never>(() => {}),
      },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 0 },
      runtime,
    ).present(
      {
        requestId: "injected-clock-timeout",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );
    callbacks[0]?.();
    await expect(pending).resolves.toMatchObject({
      status: "degraded",
      errors: [{ code: "MODEL_TIMEOUT" }],
    });
  });

  it("normalizes unknown provider failures to a stable Model Adapter error", async () => {
    const result = await createService({
      generatePresentationDecisionCandidate: async () => {
        throw new Error("Unknown provider failure.");
      },
    }).present(
      {
        requestId: "unknown-router-failure",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "unknown-router-failure",
      status: "degraded",
      mode: "markdown",
      errors: [
        {
          code: "MODEL_PROVIDER_ERROR",
          stage: "model-analysis",
          retryable: false,
        },
      ],
    });
  });

  it("limits structured data before recursive request-contract validation", async () => {
    const generate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const result = await createService({
      generatePresentationDecisionCandidate: generate,
    }).present(
      {
        requestId: "deep-structured-data",
        content: {
          contentType: "structured-data",
          data: deeplyNestedData(
            DEFAULT_STRUCTURED_DATA_LIMITS.maxDataDepth + 1,
          ),
        },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(generate).not.toHaveBeenCalled();
    expect(result).toEqual({
      requestId: "deep-structured-data",
      status: "failed",
      errors: [
        {
          code: "DATA_DEPTH_EXCEEDED",
          message: "Structured data could not be safely processed.",
          stage: "input-validation",
          retryable: false,
        },
      ],
    });
  });

  it("degrades safely when the compiler throws", async () => {
    const result = await createService(
      {
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      },
      () => {
        throw new Error("Compiler failed.");
      },
    ).present(
      {
        requestId: "compiler-throws",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "compiler-throws",
      status: "degraded",
      mode: "markdown",
      errors: [
        {
          code: "UI_COMPILATION_FAILED",
          stage: "ui-compilation",
          retryable: false,
        },
      ],
    });
  });

  it("degrades safely when surface ID creation throws", async () => {
    const compile = vi.fn();
    const result = await createService(
      {
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      },
      compile,
      { load: () => catalog },
      () => {
        throw new Error("Surface ID provider failed.");
      },
    ).present(
      {
        requestId: "surface-id-throws",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(compile).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      requestId: "surface-id-throws",
      status: "degraded",
      mode: "markdown",
      errors: [
        {
          code: "UI_COMPILATION_FAILED",
          stage: "ui-compilation",
          retryable: false,
        },
      ],
    });
  });

  it("serializes valid structured data when a supplied fallback is unsafe", async () => {
    const generate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const result = await createService({
      generatePresentationDecisionCandidate: generate,
    }).present(
      {
        requestId: "unsafe-structured-fallback",
        content: {
          contentType: "structured-data",
          data: { summary: { revenue: 125 } },
          fallbackMarkdown: "   ",
        },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(generate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "MARKDOWN_SANITIZATION_FAILED" }],
    });
    if (result.status === "degraded") {
      expect(result.markdown).toContain('"revenue": 125');
    }
  });

  it("degrades safely when Catalog loading fails before model analysis", async () => {
    const generate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const service = createGenerativeUIPresentationService({
      catalogRepository: {
        load: () => {
          throw new Error("Catalog provider failed.");
        },
      },
      sanitizer: createMarkdownSanitizer(),
      structuredDataValidator: createStructuredDataValidator(),
      structuredDataSerializer: createStructuredDataSerializer(),
      router: createModelPresentationRouter(
        { generatePresentationDecisionCandidate: generate },
        { modelTimeoutMs: 1_000, modelRetryCount: 0 },
      ),
      markdownLimits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      structuredDataLimits: DEFAULT_STRUCTURED_DATA_LIMITS,
      catalogSchemaLimits: defaultCatalogSchemaLimits,
      coreLimits: {
        maxDataDepth: 16,
        maxDataItems: 256,
        catalogSchema: defaultCatalogSchemaLimits,
      },
      createSurfaceId: () => "unused",
    });

    const result = await service.present(
      {
        requestId: "catalog-load-failure",
        content: { contentType: "markdown", markdown: "Safe source content." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(generate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "COMPONENT_CATALOG_INVALID" }],
    });
  });

  it("keeps the Core Catalog snapshot stable while the model call is pending", async () => {
    const mutableCatalog = structuredClone(catalog) as ComponentCatalog;
    const result = await createService(
      {
        generatePresentationDecisionCandidate: async (request) => {
          const firstComponent = mutableCatalog.components[0];
          if (firstComponent === undefined) {
            throw new Error("Test Catalog must contain a component.");
          }
          firstComponent.description = "Changed after routing.";
          return candidateFor(request);
        },
      },
      undefined,
      { load: () => mutableCatalog },
    ).present(
      {
        requestId: "catalog-snapshot",
        content: { contentType: "markdown", markdown: "Revenue is 125 CNY." },
        catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      status: "completed",
      mode: "generative-ui",
    });
  });
});

async function listenForHttpE2E(
  server: ReturnType<typeof createHttpServer>,
): Promise<string> {
  await server.listen({ host: "127.0.0.1", port: 0 });
  const address = server.server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The HTTP E2E server did not expose a TCP address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

function presentationRequest(requestId: string) {
  return {
    requestId,
    content: {
      contentType: "markdown" as const,
      markdown: "# A safe response that can be degraded",
    },
    catalog: { catalogId: "summary", catalogVersion: "1.0.0" },
  };
}

function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

const httpE2EConfiguration = {
  compileTimeoutMs: 25,
  httpConnectionsCheckingIntervalMs: 1_000,
  httpHeadersTimeoutMs: 1_000,
  httpRequestBodyTimeoutMs: 1_000,
  requestDeadlineMs: 2_000,
} as const;

async function disconnectHttpClient(
  url: string,
  body: unknown,
  started: Promise<void>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = httpRequest(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    request.once("error", (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ECONNRESET" ||
        error.code === "ERR_STREAM_DESTROYED"
      ) {
        resolve();
        return;
      }
      reject(error);
    });
    request.end(JSON.stringify(body));
    void started.then(() => {
      request.destroy();
      resolve();
    }, reject);
  });
}

describe("HTTP reliability E2E", () => {
  it("rejects an oversized HTTP request body before the presentation lifecycle starts", async () => {
    let called = false;
    const server = createHttpServer({
      configuration: { ...httpE2EConfiguration, maxRequestBytes: 1_024 },
      presentUseCase: {
        present: async () => {
          called = true;
          return {
            requestId: "oversized-request",
            status: "completed",
            mode: "markdown",
            markdown: "unexpected",
          };
        },
      },
    });
    const baseUrl = await listenForHttpE2E(server);

    try {
      const response = await fetch(`${baseUrl}/api/ui-compiler/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...presentationRequest("oversized-request"),
          content: {
            contentType: "markdown",
            markdown: "x".repeat(2_000),
          },
        }),
      });
      expect(response.status).toBe(413);
      await expect(response.json()).resolves.toMatchObject({
        status: "failed",
        errors: [{ code: "REQUEST_BODY_TOO_LARGE" }],
      });
      expect(called).toBe(false);
    } finally {
      await server.closeGracefully();
    }
  });

  it("maps the request deadline to REQUEST_TIMEOUT and does not send a late response", async () => {
    let observedSignal: AbortSignal | undefined;
    let resolveLateOperation: (() => void) | undefined;
    const server = createHttpServer({
      configuration: { ...httpE2EConfiguration, requestDeadlineMs: 1_000 },
      presentUseCase: {
        present: async (_input, options) => {
          observedSignal = options.signal;
          await new Promise<void>((resolve) => {
            resolveLateOperation = resolve;
          });
          return {
            requestId: "request-timeout",
            status: "completed",
            mode: "markdown",
            markdown: "late response",
          };
        },
      },
    });
    let responseCount = 0;
    server.addHook("onResponse", async () => {
      responseCount += 1;
    });
    const baseUrl = await listenForHttpE2E(server);

    try {
      const response = await fetch(`${baseUrl}/api/ui-compiler/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(presentationRequest("request-timeout")),
      });
      expect(response.status).toBe(504);
      await expect(response.json()).resolves.toMatchObject({
        requestId: "request-timeout",
        status: "failed",
        errors: [{ code: "REQUEST_TIMEOUT" }],
      });
      expect(observedSignal?.aborted).toBe(true);
      expect(responseCount).toBe(1);

      resolveLateOperation?.();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(responseCount).toBe(1);
    } finally {
      await server.closeGracefully();
    }
  });

  it("returns stable model timeout and retry exhaustion errors with exact provider calls", async () => {
    const timedOutSignals: AbortSignal[] = [];
    const timedOutService = createService(
      {
        generatePresentationDecisionCandidate: async (_request, options) => {
          timedOutSignals.push(options.signal);
          await waitForAbort(options.signal);
          throw new ModelAdapterError("MODEL_CANCELLED", false);
        },
      },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 25, modelRetryCount: 0 },
    );
    const timeoutServer = createHttpServer({
      configuration: httpE2EConfiguration,
      presentUseCase: timedOutService,
    });
    const timeoutUrl = await listenForHttpE2E(timeoutServer);

    try {
      const response = await fetch(`${timeoutUrl}/api/ui-compiler/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(presentationRequest("model-timeout")),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        requestId: "model-timeout",
        status: "degraded",
        mode: "markdown",
        errors: [{ code: "MODEL_TIMEOUT", retryable: true }],
      });
      expect(timedOutSignals).toHaveLength(1);
      expect(timedOutSignals[0]?.aborted).toBe(true);
    } finally {
      await timeoutServer.closeGracefully();
    }

    let attempts = 0;
    const retryService = createService(
      {
        generatePresentationDecisionCandidate: async () => {
          attempts += 1;
          throw new ModelAdapterError("MODEL_UNAVAILABLE", true);
        },
      },
      undefined,
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 2 },
    );
    const retryServer = createHttpServer({
      configuration: httpE2EConfiguration,
      presentUseCase: retryService,
    });
    const retryUrl = await listenForHttpE2E(retryServer);

    try {
      const response = await fetch(`${retryUrl}/api/ui-compiler/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(presentationRequest("model-retry-exhausted")),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        requestId: "model-retry-exhausted",
        status: "degraded",
        mode: "markdown",
        errors: [{ code: "MODEL_RETRY_EXHAUSTED", retryable: true }],
      });
      expect(attempts).toBe(3);
    } finally {
      await retryServer.closeGracefully();
    }
  }, 10_000);

  it("degrades compile timeouts but returns a complete failure when no safe content exists", async () => {
    let compileSignal: AbortSignal | undefined;
    const compileTimeoutService = createService(
      {
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      },
      async (_input, _options, runtime) => {
        compileSignal = runtime.signal;
        await waitForAbort(runtime.signal);
        throw new Error("compile operation was aborted");
      },
      undefined,
      undefined,
      { modelTimeoutMs: 1_000, modelRetryCount: 0 },
      undefined,
      25,
    );
    const server = createHttpServer({
      configuration: httpE2EConfiguration,
      presentUseCase: compileTimeoutService,
    });
    const baseUrl = await listenForHttpE2E(server);

    try {
      const response = await fetch(`${baseUrl}/api/ui-compiler/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(presentationRequest("compile-timeout")),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        requestId: "compile-timeout",
        status: "degraded",
        mode: "markdown",
        errors: [{ code: "COMPILE_TIMEOUT" }],
      });
      expect(compileSignal?.aborted).toBe(true);
    } finally {
      await server.closeGracefully();
    }

    const failureServer = createHttpServer({
      presentUseCase: createService({
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      }),
    });
    const failureUrl = await listenForHttpE2E(failureServer);
    try {
      const response = await fetch(`${failureUrl}/api/ui-compiler/present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...presentationRequest("no-content"),
          content: { contentType: "markdown", markdown: "" },
        }),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        requestId: "unknown",
        status: "failed",
        errors: [{ code: "PRESENTATION_REQUEST_INVALID" }],
      });
    } finally {
      await failureServer.closeGracefully();
    }
  });

  it("propagates a real client disconnect to the Router, Model Adapter, and compiler without a late response", async () => {
    let startModel: (() => void) | undefined;
    let modelSignal: AbortSignal | undefined;
    const modelStarted = new Promise<void>((resolve) => {
      startModel = resolve;
    });
    const modelService = createService({
      generatePresentationDecisionCandidate: async (_request, options) => {
        modelSignal = options.signal;
        startModel?.();
        await waitForAbort(options.signal);
        throw new ModelAdapterError("MODEL_CANCELLED", false);
      },
    });
    const modelServer = createHttpServer({ presentUseCase: modelService });
    const modelUrl = await listenForHttpE2E(modelServer);

    try {
      await disconnectHttpClient(
        `${modelUrl}/api/ui-compiler/present`,
        presentationRequest("model-disconnect"),
        modelStarted,
      );
      await waitForAbort(modelSignal ?? new AbortController().signal);
      expect(modelSignal?.aborted).toBe(true);
    } finally {
      await modelServer.closeGracefully();
    }

    let startCompile: (() => void) | undefined;
    let compileSignal: AbortSignal | undefined;
    const compileStarted = new Promise<void>((resolve) => {
      startCompile = resolve;
    });
    const compileService = createService(
      {
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      },
      async (_input, _options, runtime) => {
        compileSignal = runtime.signal;
        startCompile?.();
        await waitForAbort(runtime.signal);
        throw new Error("compile operation was aborted");
      },
    );
    const compileServer = createHttpServer({ presentUseCase: compileService });
    const compileUrl = await listenForHttpE2E(compileServer);

    try {
      await disconnectHttpClient(
        `${compileUrl}/api/ui-compiler/present`,
        presentationRequest("compile-disconnect"),
        compileStarted,
      );
      await waitForAbort(compileSignal ?? new AbortController().signal);
      expect(compileSignal?.aborted).toBe(true);
    } finally {
      await compileServer.closeGracefully();
    }
  });
});
