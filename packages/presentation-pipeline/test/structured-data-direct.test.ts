import { validatePresentationResult } from "@generative-ui/presentation-contract";
import { describe, expect, it, vi } from "vitest";
import {
  createMarkdownSanitizer,
  createPresentationRouter,
  createStructuredDataPresentationService,
  createStructuredDataSerializer,
  createStructuredDataValidator,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  DEFAULT_STRUCTURED_DATA_LIMITS,
  type ModelAdapter,
  type PresentationRouteRequest,
  type PresentationRouter,
  StructuredDataConfigurationError,
} from "../src/index.js";
import {
  dangerousStructuredFallbackFixture,
  dangerousStructuredFallbackTokens,
  structuredDataFixture,
} from "./fixtures/structured-data.js";

const catalog = {
  summaryVersion: "1.0",
  catalog: {
    catalogId: "test-catalog",
    catalogVersion: "1.0.0",
    catalogContentHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  components: [],
  actions: [],
} as const;

function createService(router: PresentationRouter) {
  return createStructuredDataPresentationService({
    validator: createStructuredDataValidator(),
    serializer: createStructuredDataSerializer(),
    sanitizer: createMarkdownSanitizer(),
    router,
    limits: {
      structuredData: DEFAULT_STRUCTURED_DATA_LIMITS,
      markdown: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    },
  });
}

describe("Structured data direct presentation path", () => {
  it("returns completed sanitized fallback Markdown with zero model calls", async () => {
    const generateCandidate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const directRouter = createPresentationRouter({
      generatePresentationDecisionCandidate: generateCandidate,
    });
    let observedRequest: PresentationRouteRequest | undefined;
    const service = createService({
      async route(request, options) {
        observedRequest = request;
        return directRouter.route(request, options);
      },
    });

    const result = await service.present(
      {
        requestId: "structured-fallback",
        data: structuredDataFixture,
        fallbackMarkdown: dangerousStructuredFallbackFixture,
        context: { userMessage: "Show this directly." },
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "structured-fallback",
      status: "completed",
      mode: "markdown",
    });
    expect(generateCandidate).not.toHaveBeenCalled();
    expect(observedRequest?.content.contentType).toBe("structured-data");
    if (observedRequest?.content.contentType === "structured-data") {
      expect(observedRequest.content.data).toEqual(structuredDataFixture);
      expect(observedRequest.content.fallbackMarkdown).toContain(
        "Safe fallback text.",
      );
    }
    for (const token of dangerousStructuredFallbackTokens) {
      expect(JSON.stringify(result)).not.toContain(token);
      expect(JSON.stringify(observedRequest)).not.toContain(token);
    }
    expect(validatePresentationResult(result).success).toBe(true);
  });

  it("serializes every value deterministically when fallback Markdown is absent", async () => {
    const router = createPresentationRouter({
      generatePresentationDecisionCandidate: vi.fn(),
    });
    const service = createService(router);
    const differentlyOrderedData = {
      nested: {
        alpha: null,
        beta: true,
      },
      alpha: "first",
      zeta: {
        values: [1, 2, 3],
        status: "ready",
      },
    };

    const first = await service.present(
      {
        requestId: "structured-serialized-a",
        data: structuredDataFixture,
        catalog,
      },
      { signal: new AbortController().signal },
    );
    const second = await service.present(
      {
        requestId: "structured-serialized-b",
        data: differentlyOrderedData,
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    if (
      first.status !== "completed" ||
      first.mode !== "markdown" ||
      second.status !== "completed" ||
      second.mode !== "markdown"
    ) {
      return;
    }

    expect(first.markdown).toBe(second.markdown);
    expect(first.markdown).toContain('"alpha": "first"');
    expect(first.markdown).toContain('"status": "ready"');
    expect(first.markdown).toContain('"values":');
    expect(first.markdown).toContain("3");
    expect(first.markdown).not.toContain("truncated");
    expect(first.markdown).not.toContain("summary");
    expect(validatePresentationResult(first).success).toBe(true);
  });

  it.each([
    {
      name: "undefined",
      data: undefined,
    },
    {
      name: "non-finite number",
      data: Number.POSITIVE_INFINITY,
    },
    {
      name: "bigint",
      data: 1n,
    },
    {
      name: "date object",
      data: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      name: "sparse array",
      data: Array(1),
    },
  ])(
    "rejects non-JSON $name before routing or model analysis",
    async ({ data }) => {
      const generateCandidate =
        vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
      const directRouter = createPresentationRouter({
        generatePresentationDecisionCandidate: generateCandidate,
      });
      const route = vi.fn(directRouter.route.bind(directRouter));
      const service = createService({ route });

      const result = await service.present(
        {
          requestId: "invalid-json",
          data,
          catalog,
        },
        { signal: new AbortController().signal },
      );

      expect(result).toMatchObject({
        status: "failed",
        errors: [{ code: "STRUCTURED_DATA_INVALID" }],
      });
      expect(route).not.toHaveBeenCalled();
      expect(generateCandidate).not.toHaveBeenCalled();
    },
  );

  it("rejects cyclic data before routing or model analysis", async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const route = vi.fn<PresentationRouter["route"]>();
    const service = createService({ route });

    const result = await service.present(
      {
        requestId: "cyclic-json",
        data: cyclic,
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      status: "failed",
      errors: [{ code: "STRUCTURED_DATA_INVALID" }],
    });
    expect(route).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "depth",
      data: { level1: { level2: { level3: true } } },
      limit: { maxDataDepth: 2 },
      code: "DATA_DEPTH_EXCEEDED",
    },
    {
      name: "item count",
      data: [1, 2, 3],
      limit: { maxDataItems: 3 },
      code: "DATA_ITEMS_EXCEEDED",
    },
    {
      name: "serialized bytes",
      data: { value: "too large" },
      limit: { maxSerializedBytes: 8 },
      code: "DATA_SERIALIZED_BYTES_EXCEEDED",
    },
  ])(
    "rejects data over the $name limit before routing or model analysis",
    async ({ name, data, limit, code }) => {
      const generateCandidate =
        vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
      const directRouter = createPresentationRouter({
        generatePresentationDecisionCandidate: generateCandidate,
      });
      const route = vi.fn(directRouter.route.bind(directRouter));
      const service = createStructuredDataPresentationService({
        validator: createStructuredDataValidator(),
        serializer: createStructuredDataSerializer(),
        sanitizer: createMarkdownSanitizer(),
        router: { route },
        limits: {
          structuredData: {
            ...DEFAULT_STRUCTURED_DATA_LIMITS,
            ...limit,
          },
          markdown: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
        },
      });

      const result = await service.present(
        {
          requestId: `over-${name}`,
          data,
          catalog,
        },
        { signal: new AbortController().signal },
      );

      expect(result).toMatchObject({
        status: "failed",
        errors: [{ code }],
      });
      expect(route).not.toHaveBeenCalled();
      expect(generateCandidate).not.toHaveBeenCalled();
    },
  );

  it("uses deterministic serialization when fallback Markdown is empty", async () => {
    const generateCandidate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const directRouter = createPresentationRouter({
      generatePresentationDecisionCandidate: generateCandidate,
    });
    const route = vi.fn(directRouter.route.bind(directRouter));
    const service = createService({ route });

    const result = await service.present(
      {
        requestId: "empty-fallback",
        data: structuredDataFixture,
        fallbackMarkdown: "   ",
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "MARKDOWN_SANITIZATION_FAILED" }],
    });
    if (result.status === "degraded") {
      expect(result.markdown).toContain('"alpha": "first"');
    }
    expect(route).not.toHaveBeenCalled();
    expect(generateCandidate).not.toHaveBeenCalled();
    expect(validatePresentationResult(result).success).toBe(true);
  });

  it("completes serialization near the default structured data byte limit", async () => {
    const service = createService(
      createPresentationRouter({
        generatePresentationDecisionCandidate: vi.fn(),
      }),
    );

    const result = await service.present(
      {
        requestId: "large-valid-structured-data",
        data: { value: "x".repeat(60_000) },
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      status: "completed",
      mode: "markdown",
    });
    if (result.status === "completed" && result.mode === "markdown") {
      expect(result.markdown).toContain("x".repeat(60_000));
    }
  });

  it("preserves complete structured source data when routing selects generative UI", async () => {
    let observedRequest: PresentationRouteRequest | undefined;
    const route = vi.fn<PresentationRouter["route"]>(async (request) => {
      observedRequest = request;
      return {
        mode: "generative-ui",
        reason: "Test the future handoff boundary.",
        plan: {
          version: "1.0",
          scenario: "summary",
          regions: [
            {
              regionId: "summary",
              purpose: "Show all structured data.",
              bindings: [],
              componentPreferences: [{ componentType: "Text" }],
              layout: {
                flow: "vertical",
                density: "comfortable",
              },
            },
          ],
        },
      };
    });
    const service = createService({ route });

    const result = await service.present(
      {
        requestId: "future-generative-boundary",
        data: structuredDataFixture,
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(observedRequest?.content.contentType).toBe("structured-data");
    if (observedRequest?.content.contentType === "structured-data") {
      expect(observedRequest.content.data).toEqual(structuredDataFixture);
    }
    expect(result).toMatchObject({
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "PRESENTATION_ROUTING_FAILED" }],
    });
  });

  it("rejects incompatible structured data and Markdown output limits", () => {
    expect(() =>
      createStructuredDataPresentationService({
        validator: createStructuredDataValidator(),
        serializer: createStructuredDataSerializer(),
        sanitizer: createMarkdownSanitizer(),
        router: { route: vi.fn() },
        limits: {
          structuredData: {
            ...DEFAULT_STRUCTURED_DATA_LIMITS,
            maxSerializedBytes: DEFAULT_MARKDOWN_SANITIZER_LIMITS.maxInputBytes,
          },
          markdown: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
        },
      }),
    ).toThrowError(StructuredDataConfigurationError);
  });
});
