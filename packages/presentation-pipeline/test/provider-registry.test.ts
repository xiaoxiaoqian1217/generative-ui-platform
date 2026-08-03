import { describe, expect, it, vi } from "vitest";
import {
  BUILT_IN_OPENAI_COMPATIBLE_PROVIDER_BASE_URLS,
  createMarkdownSanitizer,
  createPresentationModelProviderRegistry,
  DEFAULT_MARKDOWN_SANITIZER_LIMITS,
  type OpenAICompatibleFetch,
  PresentationModelProviderConfigurationError,
  PresentationModelProviderNotRegisteredError,
  type PresentationModelProviderRegistration,
} from "../src/index.js";

const successfulResponse = () =>
  new Response(
    JSON.stringify({
      id: "safe-response-id",
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              mode: "markdown",
              reason: "A concise Markdown response is sufficient.",
            }),
          },
        },
      ],
      usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("Presentation Model Provider Registry", () => {
  it("registers Kimi, Doubao, GLM, and Qwen without coupling model identity to provider identity", async () => {
    const request = vi.fn<OpenAICompatibleFetch>(async () =>
      successfulResponse(),
    );
    const registry = createPresentationModelProviderRegistry(
      [
        {
          registrationId: "kimi-primary",
          provider: "kimi",
          modelName: "kimi-model-from-config",
          apiKey: "kimi-secret",
        },
        {
          registrationId: "doubao-primary",
          provider: "doubao",
          modelName: "doubao-model-from-config",
          endpointId: "doubao-endpoint-from-config",
          apiKey: "doubao-secret",
        },
        {
          registrationId: "glm-primary",
          provider: "glm",
          modelName: "glm-model-from-config",
          apiKey: "glm-secret",
        },
        {
          registrationId: "qwen-primary",
          provider: "qwen",
          modelName: "qwen-model-from-config",
          apiKey: "qwen-secret",
        },
      ],
      { fetch: request },
    );

    expect(registry.list()).toEqual([
      {
        registrationId: "doubao-primary",
        provider: "doubao",
        modelName: "doubao-model-from-config",
      },
      {
        registrationId: "glm-primary",
        provider: "glm",
        modelName: "glm-model-from-config",
      },
      {
        registrationId: "kimi-primary",
        provider: "kimi",
        modelName: "kimi-model-from-config",
      },
      {
        registrationId: "qwen-primary",
        provider: "qwen",
        modelName: "qwen-model-from-config",
      },
    ]);
    expect(JSON.stringify(registry.list())).not.toContain("secret");
    expect(JSON.stringify(registry.list())).not.toContain("endpoint");

    const adapter = registry.resolve("doubao-primary");
    await adapter.generatePresentationDecisionCandidate(
      {
        requestId: "registry-contract",
        content: {
          contentType: "structured-data",
          data: { summary: { state: "ready" } },
        },
        catalog: {
          summaryVersion: "1.0",
          catalog: {
            catalogId: "fixture",
            catalogVersion: "1.0.0",
            catalogContentHash: `sha256:${"a".repeat(64)}`,
          },
          components: [],
          actions: [],
        },
        outputSchema: {
          schemaId:
            "https://generative-ui.dev/schemas/presentation/decision/1.0",
          schemaVersion: "1.0",
        },
      },
      { signal: new AbortController().signal },
    );

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe(
      `${BUILT_IN_OPENAI_COMPATIBLE_PROVIDER_BASE_URLS.doubao}/chat/completions`,
    );
    const init = request.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "doubao-endpoint-from-config",
    });
  });

  it("supports an explicit HTTPS Base URL independently of the provider profile", async () => {
    const request = vi.fn<OpenAICompatibleFetch>(async () =>
      successfulResponse(),
    );
    const registry = createPresentationModelProviderRegistry(
      [
        {
          registrationId: "qwen-private",
          provider: "qwen",
          modelName: "qwen-private-model",
          baseUrl: "https://workspace.example.test/compatible-mode/v1/",
          apiKey: "private-secret",
        },
      ],
      { fetch: request },
    );

    const sanitized = createMarkdownSanitizer().sanitize(
      "Safe",
      DEFAULT_MARKDOWN_SANITIZER_LIMITS,
    );
    if (!sanitized.success) {
      throw new Error("Test Markdown must be safe.");
    }
    await registry
      .resolve("qwen-private")
      .generatePresentationDecisionCandidate(
        {
          requestId: "private-base-url",
          content: { contentType: "markdown", markdown: sanitized.markdown },
          catalog: {
            summaryVersion: "1.0",
            catalog: {
              catalogId: "fixture",
              catalogVersion: "1.0.0",
              catalogContentHash: `sha256:${"b".repeat(64)}`,
            },
            components: [],
            actions: [],
          },
          outputSchema: {
            schemaId:
              "https://generative-ui.dev/schemas/presentation/decision/1.0",
            schemaVersion: "1.0",
          },
        },
        { signal: new AbortController().signal },
      );

    expect(request.mock.calls[0]?.[0]).toBe(
      "https://workspace.example.test/compatible-mode/v1/chat/completions",
    );
  });

  it.each([
    {
      name: "duplicate registration",
      registrations: [
        {
          registrationId: "same",
          provider: "kimi",
          modelName: "one",
          apiKey: "key-one",
        },
        {
          registrationId: "same",
          provider: "glm",
          modelName: "two",
          apiKey: "key-two",
        },
      ],
    },
    {
      name: "empty API key",
      registrations: [
        {
          registrationId: "invalid",
          provider: "kimi",
          modelName: "one",
          apiKey: "",
        },
      ],
    },
    {
      name: "credential-bearing Base URL",
      registrations: [
        {
          registrationId: "invalid",
          provider: "glm",
          modelName: "one",
          baseUrl: "https://user:pass@example.test/v1",
          apiKey: "key",
        },
      ],
    },
    {
      name: "non-HTTPS Base URL",
      registrations: [
        {
          registrationId: "invalid",
          provider: "qwen",
          modelName: "one",
          baseUrl: "http://example.test/v1",
          apiKey: "key",
        },
      ],
    },
  ] as const)(
    "rejects $name without exposing configuration values",
    ({ registrations }) => {
      let caught: unknown;
      try {
        createPresentationModelProviderRegistry(registrations);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(
        PresentationModelProviderConfigurationError,
      );
      expect(JSON.stringify(caught)).not.toContain("key-one");
      expect(JSON.stringify(caught)).not.toContain("user:pass");
    },
  );

  it("fails closed for an unknown registration", () => {
    const registry = createPresentationModelProviderRegistry([]);
    expect(() => registry.resolve("missing")).toThrowError(
      PresentationModelProviderNotRegisteredError,
    );
  });

  it("normalizes hostile configuration access without leaking thrown values", () => {
    const secret = "HOSTILE_CONFIGURATION_SECRET";
    const hostile: PresentationModelProviderRegistration = {
      get registrationId(): string {
        throw new Error(secret);
      },
      provider: "kimi",
      modelName: "model",
      apiKey: "key",
    };

    let caught: unknown;
    try {
      createPresentationModelProviderRegistry([hostile]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PresentationModelProviderConfigurationError);
    expect(JSON.stringify(caught)).not.toContain(secret);
  });

  it("snapshots each configuration field once before validation and listing", () => {
    let registrationIdReads = 0;
    let modelNameReads = 0;
    const secret = "SECOND_READ_SECRET_MUST_NOT_ESCAPE";
    const changing: PresentationModelProviderRegistration = {
      get registrationId(): string {
        registrationIdReads += 1;
        return registrationIdReads === 1 ? "stable-registration" : secret;
      },
      provider: "kimi",
      get modelName(): string {
        modelNameReads += 1;
        return modelNameReads === 1 ? "stable-model" : secret;
      },
      apiKey: "key",
    };

    const registry = createPresentationModelProviderRegistry([changing]);

    expect(registry.list()).toEqual([
      {
        registrationId: "stable-registration",
        provider: "kimi",
        modelName: "stable-model",
      },
    ]);
    expect(registry.resolve("stable-registration")).toBeDefined();
    expect(registrationIdReads).toBe(1);
    expect(modelNameReads).toBe(1);
    expect(JSON.stringify(registry.list())).not.toContain(secret);
  });
});
