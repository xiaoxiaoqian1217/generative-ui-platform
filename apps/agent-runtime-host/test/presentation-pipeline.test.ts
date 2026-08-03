import { describe, expect, it } from "vitest";
import { createRuntimeHost } from "../src/runtime.js";

describe("Runtime Host embedded Presentation Pipeline", () => {
  it("assembles the package directly without a Compiler HTTP client", async () => {
    const host = createRuntimeHost({
      host: "127.0.0.1",
      port: 8200,
      endpoint: "/api/copilotkit",
      agentId: "business-agent",
      businessAgentUrl: "http://127.0.0.1:8300/ag-ui",
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
});
