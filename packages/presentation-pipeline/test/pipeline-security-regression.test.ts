import type { ComponentCatalog } from "@generative-ui/component-catalog-schema";
import { describe, expect, it, vi } from "vitest";
import {
  createPresentationPipeline,
  DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  FIXTURE_COMPONENT_CATALOG,
  type ModelAdapter,
  type ModelPresentationRequest,
  type PresentationPipelineConfiguration,
  type SafeStageObservation,
} from "../src/index.js";

const catalogReference = {
  catalogId: FIXTURE_COMPONENT_CATALOG.catalogId,
  catalogVersion: FIXTURE_COMPONENT_CATALOG.catalogVersion,
} as const;

function candidateFor(
  request: ModelPresentationRequest,
  componentType = "Card",
) {
  return {
    mode: "generative-ui" as const,
    reason: "SECURITY_REGRESSION_FIXTURE",
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

function configurationWithCoreItemLimit(
  maxDataItems: number,
): PresentationPipelineConfiguration {
  return {
    markdownLimits: DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.markdownLimits,
    structuredDataLimits:
      DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.structuredDataLimits,
    catalogSchemaLimits:
      DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.catalogSchemaLimits,
    coreLimits: {
      ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.coreLimits,
      maxDataItems,
    },
    modelInvocation:
      DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.modelInvocation,
    compileTimeoutMs:
      DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.compileTimeoutMs,
  };
}

function createPipeline(
  modelAdapter: ModelAdapter,
  options: {
    catalog?: unknown;
    configuration?: PresentationPipelineConfiguration;
  } = {},
) {
  return createPresentationPipeline({
    catalogRepository: {
      load: () => options.catalog ?? FIXTURE_COMPONENT_CATALOG,
    },
    modelAdapter,
    createSurfaceId: (request) => `surface-${request.requestId}`,
    ...(options.configuration === undefined
      ? {}
      : { configuration: options.configuration }),
  });
}

describe("Presentation Pipeline migrated security regressions", () => {
  it("lets Core reject a schema-valid candidate that exceeds its item limit", async () => {
    const pipeline = createPipeline(
      {
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      },
      { configuration: configurationWithCoreItemLimit(2) },
    );

    const result = await pipeline.present({
      requestId: "core-item-limit",
      content: {
        contentType: "structured-data",
        data: { summary: { first: "one", second: "two" } },
        fallbackMarkdown: "Safe fallback",
      },
      catalog: catalogReference,
    });

    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "DATA_ITEMS_EXCEEDED", stage: "ui-compilation" }],
    });
    expect(result).not.toHaveProperty("operations");
  });

  it("rejects a candidate component absent from the authorized Catalog", async () => {
    const pipeline = createPipeline({
      generatePresentationDecisionCandidate: async (request) =>
        candidateFor(request, "UntrustedRemoteComponent"),
    });

    const result = await pipeline.present({
      requestId: "component-not-allowed",
      content: {
        contentType: "structured-data",
        data: { summary: { value: "safe" } },
        fallbackMarkdown: "Safe fallback",
      },
      catalog: catalogReference,
    });

    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "NO_COMPATIBLE_COMPONENT" }],
    });
    expect(result).not.toHaveProperty("operations");
  });

  it("rejects an invalid Catalog before model analysis", async () => {
    const model = vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>(
      async (request) => candidateFor(request),
    );
    const pipeline = createPipeline(
      { generatePresentationDecisionCandidate: model },
      {
        catalog: {
          ...FIXTURE_COMPONENT_CATALOG,
          components: "not-a-component-list",
        },
      },
    );

    const result = await pipeline.present({
      requestId: "invalid-catalog",
      content: {
        contentType: "structured-data",
        data: { summary: { value: "safe" } },
        fallbackMarkdown: "Safe fallback",
      },
      catalog: catalogReference,
    });

    expect(model).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "COMPONENT_CATALOG_INVALID" }],
    });
    expect(result).not.toHaveProperty("operations");
  });

  it("returns no operations when Catalog Props validation rejects lowering", async () => {
    const invalidPropsCatalog = {
      ...FIXTURE_COMPONENT_CATALOG,
      components: FIXTURE_COMPONENT_CATALOG.components.map((component) => ({
        ...component,
        propsSchema: {
          ...component.propsSchema,
          properties: {
            ...component.propsSchema.properties,
            content: { type: "string" as const },
          },
        },
      })),
    } as ComponentCatalog;
    const pipeline = createPipeline(
      {
        generatePresentationDecisionCandidate: async (request) =>
          candidateFor(request),
      },
      { catalog: invalidPropsCatalog },
    );

    const result = await pipeline.present({
      requestId: "invalid-props",
      content: {
        contentType: "structured-data",
        data: { summary: { value: "safe" } },
        fallbackMarkdown: "Safe fallback",
      },
      catalog: catalogReference,
    });

    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "COMPONENT_PROPS_INVALID" }],
    });
    expect(result).not.toHaveProperty("operations");
  });

  it("does not expose sensitive provider failures in results or observations", async () => {
    const secret = "MODEL_PROVIDER_SECRET_MUST_NOT_ESCAPE";
    const observations: SafeStageObservation[] = [];
    const pipeline = createPipeline({
      async generatePresentationDecisionCandidate() {
        throw new Error(secret);
      },
    });

    const result = await pipeline.present(
      {
        requestId: "safe-model-error",
        content: { contentType: "markdown", markdown: "Safe content" },
        catalog: catalogReference,
      },
      {
        observability: {
          recordStageCompletion: (event) => observations.push(event),
        },
      },
    );

    expect(JSON.stringify({ result, observations })).not.toContain(secret);
    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "MODEL_PROVIDER_ERROR" }],
    });
  });

  it("does not publish an unauthorized caller Catalog identity", async () => {
    const secretCatalogId = "UNAUTHORIZED_CATALOG_ID_SECRET";
    const observations: SafeStageObservation[] = [];
    const pipeline = createPipeline({
      generatePresentationDecisionCandidate: async (request) =>
        candidateFor(request),
    });

    await pipeline.present(
      {
        requestId: "unauthorized-catalog",
        content: { contentType: "markdown", markdown: "Safe content" },
        catalog: {
          catalogId: secretCatalogId,
          catalogVersion: "1.0.0",
        },
      },
      {
        observability: {
          recordStageCompletion: (event) => observations.push(event),
        },
      },
    );

    expect(JSON.stringify(observations)).not.toContain(secretCatalogId);
  });
});
