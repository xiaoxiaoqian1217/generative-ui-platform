import { describe, expect, it } from "vitest";
import {
  createPresentationPipeline,
  createPresentationModelProviderRegistry,
  DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  FIXTURE_COMPONENT_CATALOG,
  type PresentationModelInvocationSummary,
  type PresentationModelProvider,
} from "../src/index.js";

const smokeRequired = process.env.PRESENTATION_PROVIDER_SMOKE_REQUIRED === "1";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Required smoke-test environment is missing: ${name}`);
  }
  return value;
}

function smokeProvider(): PresentationModelProvider {
  const value = requiredEnvironment("PRESENTATION_PROVIDER_SMOKE_PROVIDER");
  if (
    value === "kimi" ||
    value === "doubao" ||
    value === "glm" ||
    value === "qwen" ||
    value === "openai-compatible"
  ) {
    return value;
  }
  throw new Error("PRESENTATION_PROVIDER_SMOKE_PROVIDER is unsupported.");
}

describe.skipIf(!smokeRequired)(
  "real Presentation Model Provider smoke",
  () => {
    it("validates a provider decision through the complete Pipeline", async () => {
      const provider = smokeProvider();
      const baseUrl = process.env.PRESENTATION_PROVIDER_SMOKE_BASE_URL;
      const endpointId = process.env.PRESENTATION_PROVIDER_SMOKE_ENDPOINT_ID;
      const summaries: PresentationModelInvocationSummary[] = [];
      const registry = createPresentationModelProviderRegistry(
        [
          {
            registrationId: "real-provider-smoke",
            provider,
            modelName: requiredEnvironment(
              "PRESENTATION_PROVIDER_SMOKE_MODEL_NAME",
            ),
            apiKey: requiredEnvironment("PRESENTATION_PROVIDER_SMOKE_API_KEY"),
            ...(baseUrl === undefined ? {} : { baseUrl }),
            ...(endpointId === undefined ? {} : { endpointId }),
          },
        ],
        { onInvocationSummary: (summary) => summaries.push(summary) },
      );
      const result = await createPresentationPipeline({
        catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
        modelAdapter: registry.resolve("real-provider-smoke"),
        createSurfaceId: () => "provider-smoke-surface",
        configuration: {
          ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
          modelInvocation: { modelTimeoutMs: 60_000, modelRetryCount: 1 },
        },
      }).present(
        {
          requestId: "real-provider-smoke",
          content: {
            contentType: "markdown",
            markdown: "Provider connectivity smoke test.",
          },
          context: {
            locale: "en-US",
            userMessage:
              "For this connectivity smoke test, choose a Markdown presentation.",
          },
          catalog: {
            catalogId: FIXTURE_COMPONENT_CATALOG.catalogId,
            catalogVersion: FIXTURE_COMPONENT_CATALOG.catalogVersion,
          },
        },
        { signal: new AbortController().signal },
      );

      expect(["completed", "degraded"]).toContain(result.status);
      if (result.status !== "failed" && result.mode === "generative-ui") {
        expect(result.operations.length).toBeGreaterThan(0);
        expect(result.surfaceId).toBe("provider-smoke-surface");
      }
      expect(summaries).toContainEqual(
        expect.objectContaining({
          registrationId: "real-provider-smoke",
          provider,
          result: "completed",
        }),
      );
    }, 70_000);
  },
);
