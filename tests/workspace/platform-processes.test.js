import { describe, expect, it } from "vitest";
import {
  createWorkbenchEnvironment,
  processTreeStopSucceeded,
} from "../../scripts/platform-processes.mjs";
import {
  platformServices,
  platformUrls,
} from "../../scripts/platform-topology.mjs";

describe("platform process environment", () => {
  it("passes only the platform-owned VITE variables to the Workbench", () => {
    const environment = createWorkbenchEnvironment({
      PATH: "test-path",
      VITE_RUNTIME_HOST_URL: "https://untrusted.example",
      VITE_SECRET_TOKEN: "must-not-reach-vite",
      VITE_WORKBENCH_ENVIRONMENT: "untrusted",
    });

    expect(environment).toEqual({
      PATH: "test-path",
      VITE_RUNTIME_HOST_URL: "http://127.0.0.1:8200",
      VITE_WORKBENCH_ENVIRONMENT: "platform-local",
    });
  });

  it("defines each platform service and port once", () => {
    expect(platformServices.map(({ name }) => name)).toEqual([
      "Reference Business Agent",
      "Agent Runtime Host",
      "Generative UI Workbench",
    ]);
    expect(new Set(platformServices.map(({ port }) => port)).size).toBe(3);
    expect(platformUrls).toEqual({
      businessAgent: "http://127.0.0.1:8300",
      runtimeHost: "http://127.0.0.1:8200",
      workbench: "http://127.0.0.1:5173",
    });
  });

  it("does not accept a failed stop while the process remains alive", () => {
    expect(processTreeStopSucceeded(true)).toBe(false);
    expect(processTreeStopSucceeded(false)).toBe(true);
  });
});
