import { validatePresentationResult } from "@generative-ui/presentation-contract";
import { describe, expect, it, vi } from "vitest";
import {
  createMarkdownPresentationService,
  createMarkdownSanitizer,
  createPresentationRouter,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  MARKDOWN_DIRECT_REASON_WITH_USER_CONTEXT,
  MARKDOWN_DIRECT_REASON_WITHOUT_USER_CONTEXT,
  type MarkdownSanitizer,
  MarkdownSanitizerConfigurationError,
  type ModelAdapter,
  type PresentationRouteRequest,
  type PresentationRouter,
} from "../src/main.js";
import {
  dangerousMarkdownFixture,
  dangerousMarkdownTokens,
} from "./fixtures/markdown.js";

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

describe("Markdown direct presentation path", () => {
  it("returns completed sanitized Markdown with zero model and Core calls", async () => {
    const generateCandidate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const outOfScopeBoundarySpies = {
      compileGenerativeUI: vi.fn(),
      lowerToUIIR: vi.fn(),
      serializeA2UI: vi.fn(),
      writeCache: vi.fn(),
      logContent: vi.fn(),
    };
    const modelAdapter: ModelAdapter = {
      generatePresentationDecisionCandidate: generateCandidate,
    };
    const directRouter = createPresentationRouter(modelAdapter);
    let observedRouteRequest: PresentationRouteRequest | undefined;
    const router: PresentationRouter = {
      async route(request, options) {
        observedRouteRequest = request;
        return directRouter.route(request, options);
      },
    };
    const serviceDependencies = {
      sanitizer: createMarkdownSanitizer(),
      router,
      limits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      ...outOfScopeBoundarySpies,
    };
    const service = createMarkdownPresentationService(serviceDependencies);

    const result = await service.present(
      {
        requestId: "request-dangerous-markdown",
        markdown: dangerousMarkdownFixture,
        context: { userMessage: "请直接展示结果" },
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "request-dangerous-markdown",
      status: "completed",
      mode: "markdown",
    });
    expect(generateCandidate).not.toHaveBeenCalled();
    for (const boundarySpy of Object.values(outOfScopeBoundarySpies)) {
      expect(boundarySpy).not.toHaveBeenCalled();
    }
    expect(observedRouteRequest?.content.contentType).toBe("markdown");
    if (observedRouteRequest?.content.contentType === "markdown") {
      expect(observedRouteRequest.content.markdown).not.toBe(
        dangerousMarkdownFixture,
      );
      for (const token of dangerousMarkdownTokens) {
        expect(observedRouteRequest.content.markdown).not.toContain(token);
      }
    }
    if (result.status === "completed" && result.mode === "markdown") {
      for (const token of dangerousMarkdownTokens) {
        expect(result.markdown).not.toContain(token);
      }
    }
    expect(validatePresentationResult(result).success).toBe(true);
  });

  it("uses a lower-confidence stable reason without userMessage", async () => {
    const modelAdapter: ModelAdapter = {
      generatePresentationDecisionCandidate: vi.fn(),
    };
    const router = createPresentationRouter(modelAdapter);
    const signal = new AbortController().signal;
    const sanitizer = createMarkdownSanitizer();
    const sanitized = sanitizer.sanitize(
      "普通 Markdown。",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );
    expect(sanitized.success).toBe(true);
    if (!sanitized.success) {
      return;
    }

    const withoutContext = await router.route(
      {
        requestId: "request-without-context",
        content: {
          contentType: "markdown",
          markdown: sanitized.markdown,
        },
        catalog,
      },
      { signal },
    );
    const withContext = await router.route(
      {
        requestId: "request-with-context",
        content: {
          contentType: "markdown",
          markdown: sanitized.markdown,
        },
        context: { userMessage: "请展示" },
        catalog,
      },
      { signal },
    );

    expect(withoutContext).toEqual({
      mode: "markdown",
      reason: MARKDOWN_DIRECT_REASON_WITHOUT_USER_CONTEXT,
    });
    expect(withContext).toEqual({
      mode: "markdown",
      reason: MARKDOWN_DIRECT_REASON_WITH_USER_CONTEXT,
    });
    expect(MARKDOWN_DIRECT_REASON_WITHOUT_USER_CONTEXT).toContain(
      "REDUCED_CONFIDENCE",
    );
  });

  it("does not route, call a model, or call Core after sanitization failure", async () => {
    const generateCandidate =
      vi.fn<ModelAdapter["generatePresentationDecisionCandidate"]>();
    const compileGenerativeUI = vi.fn();
    const route = vi.fn<PresentationRouter["route"]>();
    const serviceDependencies = {
      sanitizer: createMarkdownSanitizer(),
      router: { route },
      compileGenerativeUI,
      limits: {
        ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
        maxInputBytes: 1,
      },
    };
    const service = createMarkdownPresentationService(serviceDependencies);

    const result = await service.present(
      {
        requestId: "request-over-limit",
        markdown: "超过限制",
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toEqual({
      requestId: "request-over-limit",
      status: "failed",
      errors: [
        {
          code: "MARKDOWN_SANITIZATION_FAILED",
          message: "Markdown content could not be safely processed.",
          stage: "content-serialization",
          retryable: false,
          details: { reason: "input-limit-exceeded" },
        },
      ],
    });
    expect(route).not.toHaveBeenCalled();
    expect(generateCandidate).not.toHaveBeenCalled();
    expect(compileGenerativeUI).not.toHaveBeenCalled();
  });

  it("returns stable degraded Markdown when routing fails", async () => {
    const compileGenerativeUI = vi.fn();
    const route = vi
      .fn<PresentationRouter["route"]>()
      .mockRejectedValue(new Error("unsafe internal detail"));
    const serviceDependencies = {
      sanitizer: createMarkdownSanitizer(),
      router: { route },
      compileGenerativeUI,
      limits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    };
    const service = createMarkdownPresentationService(serviceDependencies);

    const result = await service.present(
      {
        requestId: "request-routing-failure",
        markdown: dangerousMarkdownFixture,
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "request-routing-failure",
      status: "degraded",
      mode: "markdown",
      errors: [
        {
          code: "PRESENTATION_ROUTING_FAILED",
          message: "Presentation routing could not be completed.",
          stage: "presentation-routing",
          retryable: false,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("unsafe internal detail");
    for (const token of dangerousMarkdownTokens) {
      expect(JSON.stringify(result)).not.toContain(token);
    }
    expect(compileGenerativeUI).not.toHaveBeenCalled();
    expect(validatePresentationResult(result).success).toBe(true);
  });

  it("fails closed to sanitized Markdown for an unexpected generative decision", async () => {
    const compileGenerativeUI = vi.fn();
    const route = vi.fn<PresentationRouter["route"]>().mockResolvedValue({
      mode: "generative-ui",
      reason: "Unexpected decision for explicit Markdown.",
      plan: {
        version: "1.0",
        scenario: "summary",
        regions: [
          {
            regionId: "summary",
            purpose: "Show a summary.",
            bindings: [],
            componentPreferences: [{ componentType: "Text" }],
            layout: {
              flow: "vertical",
              density: "comfortable",
            },
          },
        ],
      },
    });
    const serviceDependencies = {
      sanitizer: createMarkdownSanitizer(),
      router: { route },
      limits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
      compileGenerativeUI,
    };
    const service = createMarkdownPresentationService(serviceDependencies);

    const result = await service.present(
      {
        requestId: "request-unexpected-generative-decision",
        markdown: dangerousMarkdownFixture,
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      requestId: "request-unexpected-generative-decision",
      status: "degraded",
      mode: "markdown",
      errors: [{ code: "PRESENTATION_ROUTING_FAILED" }],
    });
    for (const token of dangerousMarkdownTokens) {
      expect(JSON.stringify(result)).not.toContain(token);
    }
    expect(compileGenerativeUI).not.toHaveBeenCalled();
    expect(validatePresentationResult(result).success).toBe(true);
  });

  it("does not return the first sanitized value when defensive sanitization fails", async () => {
    const baseSanitizer = createMarkdownSanitizer();
    let sanitizationCalls = 0;
    const sanitizer: MarkdownSanitizer = {
      sanitize(input, limits) {
        sanitizationCalls += 1;
        if (sanitizationCalls === 2) {
          return {
            success: false,
            error: {
              code: "MARKDOWN_SANITIZATION_FAILED",
              reason: "output-limit-exceeded",
              retryable: false,
            },
          };
        }
        return baseSanitizer.sanitize(input, limits);
      },
    };
    const modelAdapter: ModelAdapter = {
      generatePresentationDecisionCandidate: vi.fn(),
    };
    const compileGenerativeUI = vi.fn();
    const serviceDependencies = {
      sanitizer,
      router: createPresentationRouter(modelAdapter),
      compileGenerativeUI,
      limits: DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    };
    const service = createMarkdownPresentationService(serviceDependencies);

    const result = await service.present(
      {
        requestId: "request-defensive-sanitization-failure",
        markdown: dangerousMarkdownFixture,
        catalog,
      },
      { signal: new AbortController().signal },
    );

    expect(result).toEqual({
      requestId: "request-defensive-sanitization-failure",
      status: "failed",
      errors: [
        {
          code: "MARKDOWN_SANITIZATION_FAILED",
          message: "Markdown content could not be safely processed.",
          stage: "content-serialization",
          retryable: false,
          details: { reason: "output-limit-exceeded" },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("安全说明仍然保留");
    expect(compileGenerativeUI).not.toHaveBeenCalled();
    expect(validatePresentationResult(result).success).toBe(true);
  });

  it.each([
    { maxInputBytes: 0 },
    { maxOutputBytes: -1 },
    { maxAstDepth: 1.5 },
    { maxAstNodes: Number.POSITIVE_INFINITY },
  ])("rejects invalid sanitizer limits at service startup", (invalidLimit) => {
    expect(() =>
      createMarkdownPresentationService({
        sanitizer: createMarkdownSanitizer(),
        router: { route: vi.fn() },
        limits: {
          ...DEFAULT_MARKDOWN_SANITIZER_LIMITS,
          ...invalidLimit,
        },
      }),
    ).toThrowError(MarkdownSanitizerConfigurationError);
  });
});
