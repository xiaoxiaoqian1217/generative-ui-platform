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
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 9000,
      endpoint: "/copilotkit",
      agentId: "planner-agent",
      businessAgentUrl: "http://localhost:9001/ag-ui",
    });
  });

  it("rejects invalid ports", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow(
      "Invalid PORT value: 70000",
    );
  });
});
