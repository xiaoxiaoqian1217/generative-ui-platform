import {
  type PresentationResult,
  validatePresentationResult,
} from "@generative-ui/presentation-contract";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const endpointPath = "/api/ui-compiler/present";
const runtimeEntryUrl = new URL("../dist/main.js", import.meta.url);

type ManagedHttpServer = {
  listen(options: { host: string; port: number }): Promise<unknown>;
  closeGracefully(): Promise<void>;
  server: { address(): { port: number } | string | null };
};

type RuntimeModule = {
  createRuntimeServer(): ManagedHttpServer;
};

describe("UI Compiler Service HTTP functional E2E", () => {
  let baseUrl = "";
  let server: ManagedHttpServer | undefined;

  beforeAll(async () => {
    const runtimeModule = (await import(runtimeEntryUrl.href)) as RuntimeModule;
    const runtimeServer = runtimeModule.createRuntimeServer();
    server = runtimeServer;
    await runtimeServer.listen({ host: "127.0.0.1", port: 0 });
    const address = runtimeServer.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("The HTTP E2E server did not provide a TCP address.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${baseUrl}/health`);
    expect(health).toMatchObject({
      ok: true,
    });
  }, 20_000);

  afterAll(async () => {
    if (server !== undefined) await server.closeGracefully();
  });

  async function present(body: unknown): Promise<{
    status: number;
    result: PresentationResult;
  }> {
    const response = await fetch(`${baseUrl}${endpointPath}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json();
    const validation = validatePresentationResult(payload);
    expect(validation.success).toBe(true);
    if (!validation.success) {
      throw new Error(
        "The HTTP endpoint returned an invalid PresentationResult.",
      );
    }
    return { status: response.status, result: validation.value };
  }

  it("returns consumable public results for all seven display scenarios", async () => {
    const scenarios = [
      "summary",
      "status",
      "comparison",
      "timeline",
      "detail",
      "form",
      "confirmation",
    ];

    for (const scenario of scenarios) {
      const response = await present({
        requestId: `http-e2e-${scenario}`,
        content: {
          contentType: "structured-data",
          data: { summary: { scenario, title: `${scenario} result` } },
        },
        catalog: { catalogId: "test", catalogVersion: "1.0.0" },
      });

      expect(response.status).toBe(200);
      expect(response.result).toMatchObject({
        requestId: `http-e2e-${scenario}`,
        status: "completed",
        mode: "generative-ui",
      });
      if (
        response.result.status === "completed" &&
        response.result.mode === "generative-ui"
      ) {
        expect(response.result.surfaceId).toBe(`surface-http-e2e-${scenario}`);
        expect(response.result.operations.length).toBeGreaterThan(0);
      }
    }
  }, 20_000);

  it("returns public completed Markdown for Markdown direct presentation", async () => {
    const response = await present({
      requestId: "http-e2e-markdown",
      content: { contentType: "markdown", markdown: "# Safe result" },
      catalog: { catalogId: "test", catalogVersion: "1.0.0" },
    });

    expect(response).toMatchObject({
      status: 200,
      result: {
        requestId: "http-e2e-markdown",
        status: "completed",
        mode: "markdown",
        markdown: "# Safe result\n",
      },
    });
  });

  it("returns a degraded Markdown result when generative UI cannot use the requested Catalog", async () => {
    const response = await present({
      requestId: "http-e2e-degraded",
      content: {
        contentType: "structured-data",
        data: { summary: { title: "Catalog mismatch" } },
      },
      catalog: { catalogId: "unknown", catalogVersion: "1.0.0" },
    });

    expect(response.status).toBe(200);
    expect(response.result).toMatchObject({
      requestId: "http-e2e-degraded",
      status: "degraded",
      mode: "markdown",
      errors: [expect.objectContaining({ code: "CATALOG_REFERENCE_MISMATCH" })],
    });
  });

  it("returns a failed public result for an invalid PresentationRequest", async () => {
    const response = await present({
      requestId: "http-e2e-failed",
      content: { contentType: "markdown", markdown: "" },
      catalog: { catalogId: "test", catalogVersion: "1.0.0" },
    });

    expect(response.status).toBe(200);
    expect(response.result).toMatchObject({
      requestId: "unknown",
      status: "failed",
      errors: [
        expect.objectContaining({ code: "PRESENTATION_REQUEST_INVALID" }),
      ],
    });
  });
});
