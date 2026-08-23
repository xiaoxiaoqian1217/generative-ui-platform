import { describe, expect, it, vi } from "vitest";
import {
  agentSourceProfilesFromRuntimeInfo,
  discoverAgentSourceProfiles,
  FAIL_CLOSED_AGENT_SOURCES,
  normalizeAgentSource,
} from "../../src/settings/agent-source.js";

const mockCapabilities = {
  identity: { name: "AGUIMock", type: "fixture" },
  tools: { clientProvided: true, supported: true },
  transport: { streaming: true },
};

const sacsCapabilities = {
  identity: { name: "SACS", type: "sacs" },
  tools: { clientProvided: false, supported: false },
  transport: { streaming: true },
};

const validationCapabilities = {
  identity: {
    description: "Dev-only interaction validation Agent",
    name: "map-validation-agent",
    type: "validation",
  },
  tools: { clientProvided: true, supported: true },
  transport: { streaming: true },
};

describe("Agent Source discovery", () => {
  it("derives source visibility and Frontend Tool capability from Runtime info", () => {
    const profiles = agentSourceProfilesFromRuntimeInfo({
      agents: {
        "ag-ui-mock": { capabilities: mockCapabilities },
        "map-validation-agent": { capabilities: validationCapabilities },
        "single-agent-chat-server": { capabilities: sacsCapabilities },
      },
    });

    expect(profiles.map((profile) => profile.agentId)).toEqual([
      "ag-ui-mock",
      "single-agent-chat-server",
      "map-validation-agent",
    ]);
    expect(profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: "ag-ui-mock",
          frontendTools: true,
        }),
        expect.objectContaining({
          agentId: "single-agent-chat-server",
          frontendTools: false,
        }),
        expect.objectContaining({
          agentId: "map-validation-agent",
          description: "Dev-only interaction validation",
          frontendTools: true,
        }),
      ]),
    );
  });

  it("does not show validation source when Runtime did not register it", () => {
    const profiles = agentSourceProfilesFromRuntimeInfo({
      agents: {
        "ag-ui-mock": { capabilities: mockCapabilities },
        "single-agent-chat-server": { capabilities: sacsCapabilities },
      },
    });

    expect(profiles.map((profile) => profile.agentId)).toEqual([
      "ag-ui-mock",
      "single-agent-chat-server",
    ]);
  });

  it("fails closed to AGUIMock when discovery fails or is invalid", async () => {
    const failedFetch = vi.fn(async () => Promise.reject(new Error("offline")));
    const profiles = await discoverAgentSourceProfiles(
      "http://runtime.example.test/api/copilotkit",
      failedFetch,
    );

    expect(profiles).toEqual(FAIL_CLOSED_AGENT_SOURCES);
    expect(profiles.map((profile) => profile.agentId)).toEqual(["ag-ui-mock"]);
    expect(agentSourceProfilesFromRuntimeInfo({ agents: {} })).toEqual(
      FAIL_CLOSED_AGENT_SOURCES,
    );
  });

  it("requests the built-in Runtime info endpoint", async () => {
    const fetchProbe = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            agents: { "ag-ui-mock": { capabilities: mockCapabilities } },
          }),
          { status: 200 },
        ),
    );

    await discoverAgentSourceProfiles(
      "http://runtime.example.test/api/copilotkit/",
      fetchProbe,
    );

    expect(fetchProbe).toHaveBeenCalledWith(
      "http://runtime.example.test/api/copilotkit/info",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("normalizes only known stable source identities", () => {
    expect(normalizeAgentSource("map-validation-agent")).toBe(
      "map-validation-agent",
    );
    expect(normalizeAgentSource("unknown")).toBe("ag-ui-mock");
    expect(normalizeAgentSource(null)).toBe("ag-ui-mock");
  });
});
