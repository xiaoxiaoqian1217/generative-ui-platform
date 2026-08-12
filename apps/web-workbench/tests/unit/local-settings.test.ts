import { describe, expect, it } from "vitest";
import {
  loadWorkbenchLocalSettings,
  saveWorkbenchLocalSettings,
  WORKBENCH_LOCAL_SETTINGS_KEY,
} from "../../src/settings/local-settings.js";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as unknown as Storage;
}

describe("Workbench local settings", () => {
  it("stores only agent endpoint, timeout, and debug preference", () => {
    const value = saveWorkbenchLocalSettings(storage(), {
      agentUrl: "https://agent.example.test/path",
      requestTimeoutMs: 45_000,
      showDebugDetails: true,
    });
    expect(value).toEqual({
      agentUrl: "https://agent.example.test",
      requestTimeoutMs: 45_000,
      showDebugDetails: true,
    });
  });

  it("fails safely for malformed and out-of-range saved values", () => {
    const value = storage();
    value.setItem(WORKBENCH_LOCAL_SETTINGS_KEY, "{not-json");
    expect(loadWorkbenchLocalSettings(value)).toEqual({
      requestTimeoutMs: 30_000,
      showDebugDetails: false,
    });
    value.setItem(
      WORKBENCH_LOCAL_SETTINGS_KEY,
      JSON.stringify({
        agentUrl: "javascript:alert(1)",
        requestTimeoutMs: 1,
      }),
    );
    expect(loadWorkbenchLocalSettings(value)).toEqual({
      requestTimeoutMs: 30_000,
      showDebugDetails: false,
    });
  });
});
