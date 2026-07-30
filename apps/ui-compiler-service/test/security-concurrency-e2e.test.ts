import {
  type ComponentCatalog,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import { compileUI } from "@generative-ui/ui-compiler-core";
import { describe, expect, it, vi } from "vitest";
import {
  createGenerativeUIPresentationService,
  createHttpServer,
  createJsonLineHttpObservability,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  createStructuredDataSerializer,
  createStructuredDataValidator,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  DEFAULT_STRUCTURED_DATA_LIMITS,
  type HttpObservability,
  type ModelAdapter,
  type ModelPresentationRequest,
} from "../src/main.js";

const catalog = {
  schemaVersion: "1.0",
  catalogId: "e2e",
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
        properties: { title: { type: "string" }, content: { type: "object" } },
        required: ["title", "content"],
        additionalProperties: false,
      },
      allowedActions: [],
      nesting: { canHaveChildren: false },
    },
  ],
  actions: [],
} as const satisfies ComponentCatalog;

function candidate(request: ModelPresentationRequest) {
  return {
    mode: "generative-ui" as const,
    reason: "Summary is easier to scan as a card.",
    plan: {
      version: "1.0" as const,
      scenario: "summary" as const,
      regions: [
        {
          regionId: "summary",
          purpose: "Summary",
          bindings: [
            {
              sourcePointer:
                request.content.contentType === "markdown"
                  ? "/markdown"
                  : "/summary",
              role: "content" as const,
            },
          ],
          componentPreferences: [{ componentType: "Card" }],
          layout: {
            flow: "vertical" as const,
            density: "comfortable" as const,
          },
        },
      ],
    },
  };
}

function createE2EServer(
  adapter: ModelAdapter,
  observability?: HttpObservability,
  structuredDataLimits = DEFAULT_STRUCTURED_DATA_LIMITS,
  catalogRepository: { load(reference: unknown): unknown } = {
    load: () => catalog,
  },
) {
  const compile = vi.fn(
    (input: unknown, options: Parameters<typeof compileUI>[1]) =>
      compileUI(input, options),
  );
  const service = createGenerativeUIPresentationService({
    catalogRepository,
    sanitizer: createMarkdownSanitizer(),
    structuredDataValidator: createStructuredDataValidator(),
    structuredDataSerializer: createStructuredDataSerializer(),
    router: createModelPresentationRouter(adapter, {
      modelTimeoutMs: 1_000,
      modelRetryCount: 0,
    }),
    markdownLimits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    structuredDataLimits,
    catalogSchemaLimits: defaultCatalogSchemaLimits,
    coreLimits: {
      maxDataDepth: 16,
      maxDataItems: 256,
      catalogSchema: defaultCatalogSchemaLimits,
    },
    createSurfaceId: (request) => `surface-${request.requestId}`,
    compile,
  });
  return {
    app: createHttpServer({
      presentUseCase: service,
      ...(observability === undefined ? {} : { observability }),
    }),
    compile,
  };
}

function structuredRequest(requestId: string, data: unknown) {
  return {
    requestId,
    content: { contentType: "structured-data" as const, data },
    catalog: { catalogId: "e2e", catalogVersion: "1.0.0" },
  };
}

describe("security and concurrency HTTP E2E", () => {
  it("records every executed Compiler stage and a complete safe terminal event", async () => {
    const lines: string[] = [];
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => candidate(request),
    );
    const { app } = createE2EServer(
      { generatePresentationDecisionCandidate: model },
      createJsonLineHttpObservability({
        now: () => 123,
        write: (line) => lines.push(line),
      }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: structuredRequest("observed-request", {
        summary: { value: "safe" },
      }),
    });

    expect(response.statusCode).toBe(200);
    const events = lines.map((line) => JSON.parse(line));
    expect(events.map((event) => event.eventName)).toEqual([
      "ui_compiler.http.request_started",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.stage_completed",
      "ui_compiler.http.request_completed",
    ]);
    expect(
      events
        .filter(
          (event) => event.eventName === "ui_compiler.http.stage_completed",
        )
        .map((event) => event.stage),
    ).toEqual([
      "http-receive",
      "input-validation",
      "content-serialization",
      "catalog-resolution",
      "model-analysis",
      "ui-plan-validation",
      "presentation-routing",
      "ui-compilation",
    ]);
    expect(events.at(-1)).toMatchObject({
      requestId: "observed-request",
      catalogId: "e2e",
      catalogVersion: "1.0.0",
      hasPresentationContext: false,
      hasUserMessage: false,
      finalMode: "generative-ui",
      degraded: false,
      modelCalled: true,
      modelAttemptCount: 1,
      modelRetried: false,
    });
    expect(events.at(-1).routeDurationMs).toBeGreaterThanOrEqual(0);
    expect(events.at(-1).modelDurationMs).toBeGreaterThanOrEqual(0);
    expect(events.at(-1).compileDurationMs).toBeGreaterThanOrEqual(0);
    await app.close();
  });

  it("keeps every ADR sensitive-data category out of serialized logs", async () => {
    const sentinels = {
      rawMarkdown: "RAW_MARKDOWN_SECRET",
      sanitizedMarkdown: "SANITIZED_MARKDOWN_SECRET",
      structuredData: "STRUCTURED_DATA_SECRET",
      userMessage: "USER_MESSAGE_SECRET",
      fallback: "FALLBACK_MARKDOWN_SECRET",
      uiPlan: "UI_PLAN_SECRET",
      catalog: "CATALOG_DESCRIPTION_SECRET",
      modelResponse: "MODEL_RESPONSE_SECRET",
      authorization: "AUTHORIZATION_HEADER_SECRET",
    } as const;
    const sensitiveCatalog = {
      ...catalog,
      components: catalog.components.map((component) => ({
        ...component,
        description: sentinels.catalog,
      })),
    } as ComponentCatalog;
    const lines: string[] = [];
    const { app } = createE2EServer(
      {
        generatePresentationDecisionCandidate: async (request) => {
          const valid = candidate(request);
          const region = valid.plan.regions[0];
          if (region === undefined) {
            throw new Error("Candidate fixture has no region.");
          }
          return {
            ...valid,
            reason: sentinels.modelResponse,
            plan: {
              ...valid.plan,
              regions: [{ ...region, purpose: sentinels.uiPlan }],
            },
          };
        },
      },
      createJsonLineHttpObservability({
        write: (line) => lines.push(line),
      }),
      DEFAULT_STRUCTURED_DATA_LIMITS,
      { load: () => sensitiveCatalog },
    );

    const markdownResponse = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      headers: { authorization: `Bearer ${sentinels.authorization}` },
      payload: {
        requestId: "sensitive-markdown-categories",
        content: {
          contentType: "markdown",
          markdown: `${sentinels.sanitizedMarkdown}<script>${sentinels.rawMarkdown}</script>`,
        },
        context: { userMessage: sentinels.userMessage },
        catalog: { catalogId: "e2e", catalogVersion: "1.0.0" },
      },
    });
    const structuredResponse = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      headers: { authorization: `Bearer ${sentinels.authorization}` },
      payload: {
        requestId: "sensitive-structured-categories",
        content: {
          contentType: "structured-data",
          data: { summary: sentinels.structuredData },
          fallbackMarkdown: sentinels.fallback,
        },
        context: { userMessage: sentinels.userMessage },
        catalog: { catalogId: "e2e", catalogVersion: "1.0.0" },
      },
    });

    expect(markdownResponse.statusCode).toBe(200);
    expect(structuredResponse.statusCode).toBe(200);
    const serializedLogs = lines.join("\n");
    for (const sentinel of Object.values(sentinels)) {
      expect(serializedLogs).not.toContain(sentinel);
    }
    await app.close();
  });

  it("sanitizes hostile Markdown before model, Core, output, and logs", async () => {
    const secret = "E2E_SECRET_MUST_NOT_ESCAPE";
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => candidate(request),
    );
    const lines: string[] = [];
    const { app, compile } = createE2EServer(
      { generatePresentationDecisionCandidate: model },
      createJsonLineHttpObservability({
        now: () => 123,
        write: (line) => lines.push(line),
      }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: {
        requestId: "hostile-markdown",
        content: {
          contentType: "markdown",
          markdown: `# Safe\n<script>${secret}</script>\n[bad](javascript:alert('${secret}'))`,
        },
        catalog: { catalogId: "e2e", catalogVersion: "1.0.0" },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain(secret);
    expect(model).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(model.mock.calls)).not.toContain(secret);
    expect(compile).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(compile.mock.calls)).not.toContain(secret);
    expect(lines.join("\n")).not.toContain(secret);
    await app.close();
  });

  it.each([
    [
      "too deep",
      { summary: { nested: { again: { final: "x" } } } },
      { maxDataDepth: 3, maxDataItems: 256, maxSerializedBytes: 65_536 },
      "DATA_DEPTH_EXCEEDED",
    ],
    [
      "too many",
      { summary: [1, 2, 3, 4] },
      { maxDataDepth: 16, maxDataItems: 3, maxSerializedBytes: 65_536 },
      "DATA_ITEMS_EXCEEDED",
    ],
    [
      "too large",
      { summary: "x".repeat(100) },
      { maxDataDepth: 16, maxDataItems: 256, maxSerializedBytes: 16 },
      "DATA_SERIALIZED_BYTES_EXCEEDED",
    ],
  ])(
    "rejects structured data that is %s before the model",
    async (_name, data, limits, code) => {
      const model =
        vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
      const { app } = createE2EServer(
        { generatePresentationDecisionCandidate: model },
        undefined,
        limits,
      );
      const response = await app.inject({
        method: "POST",
        url: "/api/ui-compiler/present",
        payload: structuredRequest(`limited-${_name}`, data),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: "failed",
        errors: [{ code, stage: "input-validation" }],
      });
      expect(response.json()).not.toHaveProperty("mode");
      expect(model).not.toHaveBeenCalled();
      await app.close();
    },
  );

  it("keeps concurrent requests isolated through HTTP, Core, and A2UI", async () => {
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => candidate(request),
    );
    const { app } = createE2EServer({
      generatePresentationDecisionCandidate: model,
    });
    const [first, second] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/ui-compiler/present",
        payload: structuredRequest("first", { summary: { owner: "first" } }),
      }),
      app.inject({
        method: "POST",
        url: "/api/ui-compiler/present",
        payload: structuredRequest("second", { summary: { owner: "second" } }),
      }),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      requestId: "first",
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-first",
    });
    expect(second.json()).toMatchObject({
      requestId: "second",
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-second",
    });
    expect(first.body).toContain("first");
    expect(first.body).not.toContain("second");
    expect(second.body).toContain("second");
    expect(second.body).not.toContain("first");
    await app.close();
  });

  it("does not let a concurrent fallback borrow another request's source data or operations", async () => {
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => {
        if (request.requestId === "fallback") {
          throw new Error("fallback only");
        }
        await Promise.resolve();
        return candidate(request);
      },
    );
    const { app } = createE2EServer({
      generatePresentationDecisionCandidate: model,
    });
    const [compiled, fallback] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/ui-compiler/present",
        payload: structuredRequest("compiled", {
          summary: { owner: "compiled-only" },
        }),
      }),
      app.inject({
        method: "POST",
        url: "/api/ui-compiler/present",
        payload: structuredRequest("fallback", {
          summary: { owner: "fallback-only" },
        }),
      }),
    ]);

    expect(compiled.json()).toMatchObject({
      requestId: "compiled",
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-compiled",
    });
    expect(compiled.body).toContain("compiled-only");
    expect(compiled.body).not.toContain("fallback-only");
    expect(fallback.json()).toMatchObject({
      requestId: "fallback",
      status: "degraded",
      mode: "markdown",
    });
    expect(fallback.body).toContain("fallback-only");
    expect(fallback.body).not.toContain("compiled-only");
    expect(fallback.json()).not.toHaveProperty("operations");
    await app.close();
  });

  it("has Core reject a schema-valid Candidate that exceeds its item limit", async () => {
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => {
        const valid = candidate(request);
        const region = valid.plan.regions[0];
        if (region === undefined)
          throw new Error("Candidate fixture has no region.");
        return {
          ...valid,
          plan: {
            ...valid.plan,
            regions: Array.from({ length: 257 }, (_, index) => ({
              ...region,
              regionId: `summary-${index}`,
            })),
          },
        };
      },
    );
    const { app, compile } = createE2EServer({
      generatePresentationDecisionCandidate: model,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: structuredRequest("candidate-limit", {
        summary: { value: "safe" },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "DATA_ITEMS_EXCEEDED", stage: "ui-compilation" }],
    });
    expect(response.json()).not.toHaveProperty("operations");
    expect(compile).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("rejects a Candidate component absent from the authorized Catalog", async () => {
    const repository = { load: vi.fn(() => catalog) };
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => {
        const valid = candidate(request);
        const region = valid.plan.regions[0];
        if (region === undefined)
          throw new Error("Candidate fixture has no region.");
        return {
          ...valid,
          plan: {
            ...valid.plan,
            regions: [
              {
                ...region,
                componentPreferences: [{ componentType: "RemoteWidget" }],
              },
            ],
          },
        };
      },
    );
    const { app } = createE2EServer(
      { generatePresentationDecisionCandidate: model },
      undefined,
      DEFAULT_STRUCTURED_DATA_LIMITS,
      repository,
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: structuredRequest("unauthorized-component", {
        summary: { value: "safe" },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      mode: "markdown",
    });
    expect(response.json()).not.toHaveProperty("operations");
    expect(repository.load).toHaveBeenCalledWith({
      catalogId: "e2e",
      catalogVersion: "1.0.0",
    });
    expect(JSON.stringify(repository.load.mock.calls)).not.toContain(
      "RemoteWidget",
    );
    await app.close();
  });

  it.each([
    {
      name: "unresolved source binding",
      change: async (request: ModelPresentationRequest) => {
        const valid = candidate(request);
        const region = valid.plan.regions[0];
        if (region === undefined)
          throw new Error("Candidate fixture has no region.");
        return {
          ...valid,
          plan: {
            ...valid.plan,
            regions: [
              {
                ...region,
                bindings: [{ sourcePointer: "/missing", role: "content" }],
              },
            ],
          },
        };
      },
    },
    {
      name: "unpermitted action",
      change: async (request: ModelPresentationRequest) => {
        const valid = candidate(request);
        const region = valid.plan.regions[0];
        if (region === undefined)
          throw new Error("Candidate fixture has no region.");
        return {
          ...valid,
          plan: {
            ...valid.plan,
            regions: [
              {
                ...region,
                actions: [
                  {
                    actionId: "unpermitted-action",
                    actionType: "remote-action",
                    label: "Unsafe action",
                    destructive: false,
                    requiresApproval: false,
                  },
                ],
              },
            ],
          },
        };
      },
    },
  ])(
    "rejects a Candidate with $name without returning operations",
    async ({ change }) => {
      const model =
        vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(change);
      const { app } = createE2EServer({
        generatePresentationDecisionCandidate: model,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/ui-compiler/present",
        payload: structuredRequest("invalid-candidate-safety", {
          summary: { value: "safe" },
        }),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: "degraded",
        mode: "markdown",
      });
      expect(response.json()).not.toHaveProperty("operations");
      await app.close();
    },
  );

  it("does not expose sensitive model failures through HTTP output or logs", async () => {
    const secret = "E2E_MODEL_FAILURE_SECRET";
    const lines: string[] = [];
    const { app } = createE2EServer(
      {
        generatePresentationDecisionCandidate: async () => {
          throw new Error(`${secret}\ninternal stack marker`);
        },
      },
      createJsonLineHttpObservability({
        now: () => 123,
        write: (line) => lines.push(line),
      }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: structuredRequest("sensitive-model-failure", {
        summary: { value: "safe fallback" },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "MODEL_PROVIDER_ERROR" }],
    });
    expect(response.body).not.toContain(secret);
    expect(response.body).not.toContain("internal stack marker");
    expect(lines.join("\n")).not.toContain(secret);
    expect(lines.join("\n")).not.toContain("internal stack marker");
    expect(JSON.parse(lines.at(-1) ?? "{}")).toMatchObject({
      requestId: "sensitive-model-failure",
      finalMode: "markdown",
      degraded: true,
      degradationReasonCode: "MODEL_PROVIDER_ERROR",
      modelCalled: true,
      modelAttemptCount: 1,
    });
    await app.close();
  });

  it("caches only the verified Catalog snapshot and never request content", async () => {
    const secret = "E2E_CACHE_SECRET";
    const repository = {
      load: vi.fn(() => catalog),
    };
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => candidate(request),
    );
    const { app } = createE2EServer(
      { generatePresentationDecisionCandidate: model },
      undefined,
      DEFAULT_STRUCTURED_DATA_LIMITS,
      repository,
    );
    const first = {
      requestId: "cache-first",
      content: {
        contentType: "markdown" as const,
        markdown: `<script>${secret}</script> [bad](javascript:alert('${secret}'))`,
      },
      catalog: { catalogId: "e2e", catalogVersion: "1.0.0" },
    };
    const second = {
      requestId: "cache-second",
      content: { contentType: "markdown" as const, markdown: "Safe content." },
      catalog: { catalogId: "e2e", catalogVersion: "1.0.0" },
    };

    await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: first,
    });
    await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: second,
    });

    expect(repository.load).toHaveBeenCalledTimes(1);
    expect(repository.load).toHaveBeenCalledWith({
      catalogId: "e2e",
      catalogVersion: "1.0.0",
    });
    expect(JSON.stringify(repository.load.mock.calls)).not.toContain(secret);
    await app.close();
  });

  it("rejects an invalid Catalog before model analysis and returns no operations", async () => {
    const model =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const { app } = createE2EServer(
      { generatePresentationDecisionCandidate: model },
      undefined,
      DEFAULT_STRUCTURED_DATA_LIMITS,
      { load: () => ({ catalogId: "e2e", catalogVersion: "1.0.0" }) },
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: structuredRequest("invalid-catalog", {
        summary: { value: "safe" },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      mode: "markdown",
    });
    expect(response.json()).not.toHaveProperty("operations");
    expect(model).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns no operations when Catalog Props validation rejects the lowered component", async () => {
    const invalidPropsCatalog = {
      ...catalog,
      components: catalog.components.map((component) => ({
        ...component,
        propsSchema: {
          ...component.propsSchema,
          properties: {
            ...component.propsSchema.properties,
            content: { type: "string" },
          },
        },
      })),
    } as ComponentCatalog;
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => candidate(request),
    );
    const { app } = createE2EServer(
      { generatePresentationDecisionCandidate: model },
      undefined,
      DEFAULT_STRUCTURED_DATA_LIMITS,
      { load: () => invalidPropsCatalog },
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: structuredRequest("invalid-props", {
        summary: { value: "safe" },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      mode: "markdown",
    });
    expect(response.json()).not.toHaveProperty("operations");
    await app.close();
  });
});
