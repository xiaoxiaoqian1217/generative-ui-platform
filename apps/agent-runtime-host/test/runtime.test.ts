import { describe, expect, it } from "vitest";
import type { RuntimeHostConfig } from "../src/config.js";
import {
  createAgentRuntimeHost,
  isRuntimeRequestPath,
} from "../src/runtime.js";

const config: RuntimeHostConfig = {
  host: "127.0.0.1",
  port: 8200,
  basePath: "/api/copilotkit",
  model: "openai:gpt-5-mini",
  cors: true,
};

describe("agent runtime host", () => {
  it("registers the verification agent as default", async () => {
    const { fetchHandler } = createAgentRuntimeHost(config);
    const response = await fetchHandler(
      new Request("http://localhost/api/copilotkit/info"),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as { agents?: unknown };
    expect(JSON.stringify(body.agents)).toContain("default");
  });

  it("matches only the configured runtime path boundary", () => {
    expect(isRuntimeRequestPath("/api/copilotkit", config.basePath)).toBe(true);
    expect(isRuntimeRequestPath("/api/copilotkit/info", config.basePath)).toBe(
      true,
    );
    expect(isRuntimeRequestPath("/api/copilotkit-test", config.basePath)).toBe(
      false,
    );
    expect(isRuntimeRequestPath("/api/copilotkit123", config.basePath)).toBe(
      false,
    );
  });
});
