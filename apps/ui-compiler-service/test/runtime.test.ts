import { describe, expect, it } from "vitest";
import { createRuntimeServer } from "../src/runtime.js";
import {
  createRuntimeConfiguration,
  RuntimeConfigurationError,
} from "../src/runtime-configuration.js";

describe("independent runtime", () => {
  it("uses documented resource defaults", () => {
    expect(createRuntimeConfiguration({})).toMatchObject({
      host: "0.0.0.0",
      port: 3000,
      maxRequestBytes: 1_048_576,
      maxDataDepth: 32,
      maxDataItems: 10_000,
      compileTimeoutMs: 10_000,
      modelTimeoutMs: 10_000,
      modelRetryCount: 0,
      shutdownGraceMs: 30_000,
    });
  });

  it("rejects invalid environment configuration before listening", () => {
    expect(() => createRuntimeConfiguration({ UI_COMPILER_PORT: "0" })).toThrow(
      RuntimeConfigurationError,
    );
    expect(() =>
      createRuntimeConfiguration({ UI_COMPILER_MODEL_RETRY_COUNT: "4" }),
    ).toThrow(RuntimeConfigurationError);
    expect(() =>
      createRuntimeConfiguration({
        UI_COMPILER_HTTP_HEADERS_TIMEOUT_MS: "999",
      }),
    ).toThrow(RuntimeConfigurationError);
    expect(() =>
      createRuntimeConfiguration({ UI_COMPILER_MAX_REQUEST_BYTES: "1" }),
    ).toThrow(RuntimeConfigurationError);
  });

  it("exposes health and version without configuration", async () => {
    const server = createRuntimeServer(
      createRuntimeConfiguration({}),
      "test-version",
    );
    expect((await server.inject("/health")).json()).toEqual({ status: "ok" });
    expect((await server.inject("/version")).json()).toEqual({
      service: "ui-compiler-service",
      version: "test-version",
    });
    await server.close();
  });

  it("assembles the test catalog and adapter for a generative UI response", async () => {
    const server = createRuntimeServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/ui-compiler/present",
      payload: {
        requestId: "runtime-1",
        content: {
          contentType: "structured-data",
          data: { summary: { title: "Hello" } },
        },
        catalog: { catalogId: "test", catalogVersion: "1.0.0" },
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      requestId: "runtime-1",
      status: "completed",
      mode: "generative-ui",
    });
    await server.close();
  });
});
