import {
  type ComponentCatalog,
  computeCatalogContentHash,
  defaultCatalogSchemaLimits,
} from "@generative-ui/component-catalog-schema";
import { describe, expect, it, vi } from "vitest";
import {
  createGenerativeUIPresentationService,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  createStructuredDataSerializer,
  createStructuredDataValidator,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  DEFAULT_STRUCTURED_DATA_LIMITS,
  type ModelAdapter,
  type ModelPresentationRequest,
} from "../src/main.js";

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
) {
  return createGenerativeUIPresentationService({
    catalogRepository: { load: () => catalog },
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
    createSurfaceId: () => "surface-presentation-test",
    ...(compile === undefined ? {} : { compile }),
  });
}

describe("Generative UI presentation path", () => {
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
});
