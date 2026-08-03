import { describe, expect, it } from "vitest";
import {
  createFixtureModelAdapter,
  createPresentationPipeline,
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
});
