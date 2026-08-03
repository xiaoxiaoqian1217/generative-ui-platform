import { describe, expect, it } from "vitest";
import {
  createCatalogCapabilitySummary,
  createFixtureModelAdapter,
  createMarkdownSanitizer,
  createModelPresentationRouter,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  FIXTURE_COMPONENT_CATALOG,
  isModelAdapterError,
  PresentationDecisionValidationError,
} from "../src/index.js";

function routeWithFault(
  fault: "timeout" | "rate-limited" | "invalid-candidate" | "provider-failure",
) {
  const sanitized = createMarkdownSanitizer().sanitize(
    "Safe fixture content.",
    DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  );
  if (!sanitized.success) {
    throw new Error("Fixture Markdown must be safe.");
  }

  return createModelPresentationRouter(createFixtureModelAdapter({ fault }), {
    modelTimeoutMs: 20,
    modelRetryCount: 0,
  }).route(
    {
      requestId: `fixture-${fault}`,
      content: { contentType: "markdown", markdown: sanitized.markdown },
      catalog: createCatalogCapabilitySummary(FIXTURE_COMPONENT_CATALOG),
    },
    { signal: new AbortController().signal },
  );
}

describe("Fixture Model Adapter fault simulation", () => {
  it.each([
    ["timeout", "MODEL_TIMEOUT"],
    ["rate-limited", "MODEL_RETRY_EXHAUSTED"],
    ["provider-failure", "MODEL_PROVIDER_ERROR"],
  ] as const)("simulates %s with a stable error", async (fault, code) => {
    await expect(routeWithFault(fault)).rejects.toSatisfy(
      (error: unknown) => isModelAdapterError(error) && error.code === code,
    );
  });

  it("simulates an invalid candidate at the existing validation boundary", async () => {
    await expect(routeWithFault("invalid-candidate")).rejects.toBeInstanceOf(
      PresentationDecisionValidationError,
    );
  });
});
