import { describe, expect, it } from "vitest";
import { loadRuntimeHostConfig } from "../src/config.js";

describe("loadRuntimeHostConfig", () => {
  it("returns stable defaults", () => {
    expect(loadRuntimeHostConfig({})).toEqual({
      host: "0.0.0.0",
      port: 8200,
      basePath: "/api/copilotkit",
      model: "openai:gpt-5-mini",
      cors: true,
    });
  });

  it("normalizes custom environment values", () => {
    expect(
      loadRuntimeHostConfig({
        HOST: "127.0.0.1",
        PORT: "9000",
        COPILOTKIT_BASE_PATH: "copilot/",
        COPILOTKIT_MODEL: "openai:gpt-5-mini",
        CORS_ENABLED: "false",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 9000,
      basePath: "/copilot",
      model: "openai:gpt-5-mini",
      cors: false,
    });
  });

  it("rejects invalid ports", () => {
    expect(() => loadRuntimeHostConfig({ PORT: "70000" })).toThrow(
      "PORT 必须是 1 到 65535 之间的整数",
    );
  });
});
