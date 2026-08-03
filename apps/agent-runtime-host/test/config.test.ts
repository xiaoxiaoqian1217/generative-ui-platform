import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("returns stable defaults", () => {
    expect(loadConfig({})).toEqual({
      host: "0.0.0.0",
      port: 8200,
      endpoint: "/api/copilotkit",
      agentId: "business-agent",
      businessAgentUrl: "http://localhost:8000/ag-ui",
      businessAgentContractUrl: "http://localhost:8300",
      presentationModel: { mode: "fixture" },
    });
  });

  it("reads explicit environment values", () => {
    expect(
      loadConfig({
        HOST: "127.0.0.1",
        PORT: "9000",
        COPILOTKIT_ENDPOINT: "/copilotkit",
        BUSINESS_AGENT_ID: "planner-agent",
        BUSINESS_AGENT_URL: "http://localhost:9001/ag-ui",
        BUSINESS_AGENT_CONTRACT_URL: "http://localhost:9300",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 9000,
      endpoint: "/copilotkit",
      agentId: "planner-agent",
      businessAgentUrl: "http://localhost:9001/ag-ui",
      businessAgentContractUrl: "http://localhost:9300",
      presentationModel: { mode: "fixture" },
    });
  });

  it("rejects invalid ports", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow(
      "Invalid PORT value: 70000",
    );
  });

  it("loads a real Presentation Model registration without coupling provider and model", () => {
    expect(
      loadConfig({
        PRESENTATION_MODEL_PROVIDER: "qwen",
        PRESENTATION_MODEL_REGISTRATION_ID: "qwen-primary",
        PRESENTATION_MODEL_NAME: "qwen3.5-plus",
        PRESENTATION_MODEL_BASE_URL:
          "https://workspace.example.test/compatible-mode/v1",
        PRESENTATION_MODEL_ENDPOINT_ID: "deployment-42",
        PRESENTATION_MODEL_API_KEY: "server-only-secret",
        PRESENTATION_MODEL_TIMEOUT_MS: "45000",
        PRESENTATION_MODEL_RETRY_COUNT: "2",
      }),
    ).toMatchObject({
      presentationModel: {
        mode: "provider",
        registration: {
          registrationId: "qwen-primary",
          provider: "qwen",
          modelName: "qwen3.5-plus",
          baseUrl: "https://workspace.example.test/compatible-mode/v1",
          endpointId: "deployment-42",
          apiKey: "server-only-secret",
        },
        modelInvocation: { modelTimeoutMs: 45000, modelRetryCount: 2 },
      },
    });
  });

  it("fails closed when real-provider credentials are incomplete", () => {
    expect(() =>
      loadConfig({
        PRESENTATION_MODEL_PROVIDER: "kimi",
        PRESENTATION_MODEL_NAME: "kimi-k2",
      }),
    ).toThrow("Runtime Host configuration is invalid.");
  });
});
