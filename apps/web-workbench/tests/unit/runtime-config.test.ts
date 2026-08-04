import { describe, expect, it } from "vitest";
import {
  createRuntimeEndpoints,
  resolveWorkbenchConfig,
} from "../../src/settings/runtime-config.js";

describe("Workbench Runtime Host configuration", () => {
  it("derives every backend endpoint from the single configured Runtime Host", () => {
    expect(createRuntimeEndpoints("https://runtime.test.example/base")).toEqual(
      {
        actions: "https://runtime.test.example/api/actions",
        catalog: "https://runtime.test.example/api/catalog",
        copilotKit: "https://runtime.test.example/api/copilotkit",
        health: "https://runtime.test.example/health/dependencies",
        runs: "https://runtime.test.example/api/runs",
        scenarios: "https://runtime.test.example/api/scenarios",
        socket: "wss://runtime.test.example/ws/runs",
      },
    );
  });

  it("prefers external runtime configuration and falls back to same-origin", () => {
    expect(
      resolveWorkbenchConfig(
        {
          runtimeHostUrl: "https://runtime.test.example/",
          environment: "test",
        },
        {
          VITE_RUNTIME_HOST_URL: "https://build.example/",
          VITE_WORKBENCH_ENVIRONMENT: "build",
        },
        "https://workbench.example",
      ),
    ).toEqual({
      environment: "test",
      runtimeHostUrl: "https://runtime.test.example",
    });

    expect(resolveWorkbenchConfig({}, {}, "https://workbench.example")).toEqual(
      {
        environment: "same-origin",
        runtimeHostUrl: "https://workbench.example",
      },
    );
  });

  it("rejects non-HTTP Runtime Host protocols", () => {
    expect(() => createRuntimeEndpoints("javascript:alert(1)")).toThrow(
      "WORKBENCH_RUNTIME_HOST_URL_INVALID",
    );
  });

  it("rejects malformed or out-of-scope external configuration", () => {
    expect(() =>
      resolveWorkbenchConfig(
        { runtimeHostUrl: 42 },
        {},
        "https://workbench.example",
      ),
    ).toThrow("WORKBENCH_RUNTIME_CONFIG_INVALID");
    expect(() =>
      resolveWorkbenchConfig(
        { compilerUrl: "https://compiler.example" },
        {},
        "https://workbench.example",
      ),
    ).toThrow("WORKBENCH_RUNTIME_CONFIG_INVALID");
  });
});
