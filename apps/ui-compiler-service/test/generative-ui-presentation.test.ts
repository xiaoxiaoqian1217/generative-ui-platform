import {
  type ComponentCatalog,
  computeCatalogContentHash,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it, vi } from "vitest";
import {
  createCatalogCapabilitySummary,
  createGenerativeUIPresentationService,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  createStructuredDataSerializer,
  createStructuredDataValidator,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  DEFAULT_STRUCTURED_DATA_LIMITS,
  ModelAdapterError,
  type ModelAdapter,
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
) {
  return createGenerativeUIPresentationService({
    catalogRepository,
    sanitizer: createMarkdownSanitizer(),
    structuredDataValidator: createStructuredDataValidator(),
    structuredDataSerializer: createStructuredDataSerializer(),
    router: createModelPresentationRouter(adapter, {
      modelTimeoutMs: 1_000,
      modelRetryCount: 0,
    }),
    markdownLimits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    structuredDataLimits: DEFAULT_STRUCTURED_DATA_LIMITS,
    catalogSchemaLimits: defaultCatalogSchemaLimits,
    coreLimits: {
      maxDataDepth: 16,
      maxDataItems: 256,
      catalogSchema: defaultCatalogSchemaLimits,
    },
    createSurfaceId,
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

  it("maps unknown Router failures to the generic stable routing error", async () => {
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
          code: "PRESENTATION_ROUTING_FAILED",
          stage: "presentation-routing",
          retryable: false,
        },
      ],
    });
  });

  it("limits structured data before recursive request-contract validation", async () => {
    const generate = vi.fn<
      ModelAdapter["generatePresentationDecisionCandidate"]
    >();
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
