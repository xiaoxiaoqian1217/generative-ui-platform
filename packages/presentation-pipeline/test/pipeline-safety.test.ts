import { describe, expect, it } from "vitest";
import {
  createFixtureModelAdapter,
  createPresentationPipeline,
  FIXTURE_COMPONENT_CATALOG,
  type ModelAdapter,
  ModelAdapterError,
} from "../src/index.js";

const catalog = {
  catalogId: FIXTURE_COMPONENT_CATALOG.catalogId,
  catalogVersion: FIXTURE_COMPONENT_CATALOG.catalogVersion,
} as const;

function createPipeline(modelAdapter: ModelAdapter) {
  return createPresentationPipeline({
    catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
    modelAdapter,
    createSurfaceId: (request) => `surface-${request.requestId}`,
  });
}

describe("Presentation Pipeline safety and isolation", () => {
  it("returns sanitized Markdown when model analysis fails", async () => {
    const pipeline = createPipeline({
      async generatePresentationDecisionCandidate() {
        throw new ModelAdapterError("MODEL_UNAVAILABLE", true);
      },
    });

    const result = await pipeline.present({
      requestId: "model-fallback",
      content: {
        contentType: "markdown",
        markdown: "Safe [link](javascript:alert(1))",
      },
      catalog,
    });

    expect(result).toMatchObject({
      requestId: "model-fallback",
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "MODEL_RETRY_EXHAUSTED", stage: "model-analysis" }],
    });
    expect(result).not.toHaveProperty("operations");
    if (result.status === "degraded") {
      expect(result.markdown).not.toContain("javascript:");
    }
  });

  it("rejects an untrusted invalid candidate and keeps the safe fallback", async () => {
    const pipeline = createPipeline({
      async generatePresentationDecisionCandidate() {
        return {
          mode: "generative-ui",
          reason: "UNTRUSTED",
          operations: [{ component: "RemoteScript" }],
        };
      },
    });

    const result = await pipeline.present({
      requestId: "candidate-fallback",
      content: {
        contentType: "structured-data",
        data: { summary: { status: "ready" } },
        fallbackMarkdown: "Status: ready",
      },
      catalog,
    });

    expect(result).toMatchObject({
      requestId: "candidate-fallback",
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "PRESENTATION_DECISION_INVALID" }],
    });
    expect(result).not.toHaveProperty("operations");
  });

  it("does not reuse request data, fallback content, or surface IDs", async () => {
    const pipeline = createPipeline(
      createFixtureModelAdapter({ mode: "generative-ui" }),
    );
    const requests = ["alpha", "beta"].map((id) =>
      pipeline.present({
        requestId: id,
        content: {
          contentType: "structured-data",
          data: { summary: { id } },
          fallbackMarkdown: `Fallback ${id}`,
        },
        catalog,
      }),
    );

    const [alpha, beta] = await Promise.all(requests);

    expect(alpha).toMatchObject({ surfaceId: "surface-alpha" });
    expect(beta).toMatchObject({ surfaceId: "surface-beta" });
    expect(JSON.stringify(alpha)).not.toContain("beta");
    expect(JSON.stringify(beta)).not.toContain("alpha");
  });
});
