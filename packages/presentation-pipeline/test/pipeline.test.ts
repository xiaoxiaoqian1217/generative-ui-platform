import { describe, expect, it } from "vitest";
import {
  createFixtureModelAdapter,
  createPresentationPipeline,
  DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  FIXTURE_COMPONENT_CATALOG,
  type PresentationPipelineObservabilityPort,
} from "../src/index.js";

const catalogReference = {
  catalogId: FIXTURE_COMPONENT_CATALOG.catalogId,
  catalogVersion: FIXTURE_COMPONENT_CATALOG.catalogVersion,
} as const;

function fixturePipeline(mode: "markdown" | "generative-ui") {
  return createPresentationPipeline({
    catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
    modelAdapter: createFixtureModelAdapter({ mode }),
    createSurfaceId: (request) => `surface-${request.requestId}`,
  });
}

describe("embedded Presentation Pipeline", () => {
  it("can be assembled in a plain TypeScript process and return Markdown", async () => {
    const result = await fixturePipeline("markdown").present({
      requestId: "fixture-markdown",
      content: { contentType: "markdown", markdown: "# Safe fixture" },
      catalog: catalogReference,
    });

    expect(result).toEqual({
      requestId: "fixture-markdown",
      status: "completed",
      mode: "markdown",
      markdown: "# Safe fixture\n",
    });
  });

  it("deterministically compiles structured fixture data to generative UI", async () => {
    const request = {
      requestId: "fixture-ui",
      content: {
        contentType: "structured-data" as const,
        data: { summary: { status: "ready" } },
        fallbackMarkdown: "Status: ready",
      },
      catalog: catalogReference,
    };
    const pipeline = fixturePipeline("generative-ui");

    const first = await pipeline.present(request);
    const second = await pipeline.present(request);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      requestId: "fixture-ui",
      status: "completed",
      mode: "generative-ui",
      surfaceId: "surface-fixture-ui",
    });
  });

  it("keeps observability vendor-neutral and failure-isolated", async () => {
    const stages: string[] = [];
    const observability: PresentationPipelineObservabilityPort = {
      setCurrentStage: (stage) => stages.push(stage),
      recordStageCompletion() {
        throw new Error("sink unavailable");
      },
    };

    const result = await fixturePipeline("markdown").present(
      {
        requestId: "fixture-observation",
        content: { contentType: "markdown", markdown: "Safe" },
        catalog: catalogReference,
      },
      { observability },
    );

    expect(result.status).toBe("completed");
    expect(stages).toContain("input-validation");
    expect(stages).not.toContain("http-receive");
  });

  it("takes an immutable snapshot of caller-owned nested configuration", async () => {
    const configuration = {
      markdownLimits: {
        ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.markdownLimits,
      },
      structuredDataLimits: {
        ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.structuredDataLimits,
      },
      catalogSchemaLimits: {
        ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.catalogSchemaLimits,
      },
      coreLimits: {
        ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.coreLimits,
        catalogSchema: {
          ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.coreLimits
            .catalogSchema,
        },
      },
      modelInvocation: {
        ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.modelInvocation,
      },
      compileTimeoutMs:
        DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION.compileTimeoutMs,
    };
    const pipeline = createPresentationPipeline({
      catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
      modelAdapter: createFixtureModelAdapter({ mode: "markdown" }),
      createSurfaceId: (request) => `surface-${request.requestId}`,
      configuration,
    });

    configuration.markdownLimits.maxInputBytes = 1;
    configuration.catalogSchemaLimits.maxCatalogBytes = 1;
    configuration.coreLimits.catalogSchema.maxCatalogBytes = 1;

    const result = await pipeline.present({
      requestId: "immutable-configuration",
      content: { contentType: "markdown", markdown: "Still safe" },
      catalog: catalogReference,
    });

    expect(result).toMatchObject({
      requestId: "immutable-configuration",
      status: "completed",
      mode: "markdown",
    });
  });
});
