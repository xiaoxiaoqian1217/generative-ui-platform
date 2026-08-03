import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeHost } from "../src/runtime.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Runtime Host embedded Presentation Pipeline", () => {
  it("assembles the package directly without a Compiler HTTP client", async () => {
    const host = createRuntimeHost({
      host: "127.0.0.1",
      port: 8200,
      endpoint: "/api/copilotkit",
      agentId: "business-agent",
      businessAgentUrl: "http://127.0.0.1:8300/ag-ui",
      presentationModel: { mode: "fixture" },
    });

    const result = await host.presentationPipeline.present({
      requestId: "runtime-pipeline",
      content: { contentType: "markdown", markdown: "# Runtime result" },
      catalog: { catalogId: "fixture", catalogVersion: "1.0.0" },
    });

    expect(result).toEqual({
      requestId: "runtime-pipeline",
      status: "completed",
      mode: "markdown",
      markdown: "# Runtime result\n",
    });
  });

  it("selects a configured Provider without changing Runtime orchestration", async () => {
    const providerFetch = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    mode: "markdown",
                    reason: "Markdown is sufficient.",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", providerFetch);
    const host = createRuntimeHost({
      host: "127.0.0.1",
      port: 8200,
      endpoint: "/api/copilotkit",
      agentId: "business-agent",
      businessAgentUrl: "http://127.0.0.1:8300/ag-ui",
      presentationModel: {
        mode: "provider",
        registration: {
          registrationId: "qwen-primary",
          provider: "qwen",
          modelName: "qwen-model",
          apiKey: "server-only-secret",
        },
        modelInvocation: { modelTimeoutMs: 1_000, modelRetryCount: 1 },
      },
    });

    const result = await host.presentationPipeline.present({
      requestId: "runtime-provider-pipeline",
      content: { contentType: "markdown", markdown: "# Runtime result" },
      catalog: { catalogId: "fixture", catalogVersion: "1.0.0" },
    });

    expect(result).toMatchObject({ status: "completed", mode: "markdown" });
    expect(providerFetch).toHaveBeenCalledTimes(1);
    const [url, init] = providerFetch.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    );
    expect(init).toMatchObject({
      headers: {
        authorization: "Bearer server-only-secret",
        "content-type": "application/json",
      },
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen-model",
      enable_thinking: false,
    });
  });
});
