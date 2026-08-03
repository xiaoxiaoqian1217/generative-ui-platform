import { describe, expect, it } from "vitest";
import {
  createCatalogCapabilitySummary,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  createPresentationModelProviderRegistry,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
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
    it("returns a locally validated PresentationDecision through the configured provider", async () => {
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
      const sanitized = createMarkdownSanitizer().sanitize(
        "Provider connectivity smoke test.",
        DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      );
      if (!sanitized.success) {
        throw new Error("Smoke-test Markdown must be safe.");
      }

      const decision = await createModelPresentationRouter(
        registry.resolve("real-provider-smoke"),
        { modelTimeoutMs: 60_000, modelRetryCount: 1 },
      ).route(
        {
          requestId: "real-provider-smoke",
          content: { contentType: "markdown", markdown: sanitized.markdown },
          context: {
            locale: "en-US",
            userMessage:
              "For this connectivity smoke test, choose a Markdown presentation.",
          },
          catalog: createCatalogCapabilitySummary(FIXTURE_COMPONENT_CATALOG),
        },
        { signal: new AbortController().signal },
      );

      expect(decision.mode).toBe("markdown");
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
