import { describe, expect, it } from "vitest";
import {
  AGENT_SOURCES,
  agentSourceProfile,
  normalizeAgentSource,
} from "../../src/settings/agent-source.js";

describe("Agent Source", () => {
  it("offers AGUIMock and SACS through stable Runtime identities", () => {
    expect(AGENT_SOURCES).toEqual(["ag-ui-mock", "single-agent-chat-server"]);
    expect(agentSourceProfile("ag-ui-mock")).toMatchObject({
      agentId: "ag-ui-mock",
      frontendTools: true,
      label: "AGUIMock",
    });
    expect(agentSourceProfile("single-agent-chat-server")).toMatchObject({
      agentId: "single-agent-chat-server",
      frontendTools: false,
      label: "single-agent-chat-server",
    });
  });

  it("falls back safely when a stored Agent identity is unknown", () => {
    expect(normalizeAgentSource("unknown")).toBe("ag-ui-mock");
    expect(normalizeAgentSource(null)).toBe("ag-ui-mock");
  });
});
