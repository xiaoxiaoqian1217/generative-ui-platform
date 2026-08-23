import { type AgentCapabilities, AgentCapabilitiesSchema } from "@ag-ui/core";

export const KNOWN_AGENT_SOURCES = [
  "ag-ui-mock",
  "single-agent-chat-server",
  "map-validation-agent",
] as const;

export type AgentSource = (typeof KNOWN_AGENT_SOURCES)[number];

export interface AgentSourceProfile {
  readonly a2uiCatalogEnabled: boolean;
  readonly agentId: AgentSource;
  readonly capabilities: AgentCapabilities;
  readonly description: string;
  readonly frontendTools: boolean;
  readonly label: string;
}

const presentationMetadata: Record<
  AgentSource,
  Pick<AgentSourceProfile, "a2uiCatalogEnabled" | "description" | "label">
> = {
  "ag-ui-mock": {
    a2uiCatalogEnabled: true,
    description: "Deterministic capability fixture",
    label: "AGUIMock",
  },
  "single-agent-chat-server": {
    a2uiCatalogEnabled: false,
    description: "Real Business Agent interoperability source",
    label: "single-agent-chat-server",
  },
  "map-validation-agent": {
    a2uiCatalogEnabled: false,
    description: "Dev-only interaction validation",
    label: "Map Validation Agent",
  },
};

function sourceProfile(
  agentId: AgentSource,
  capabilities: AgentCapabilities,
): AgentSourceProfile {
  const metadata = presentationMetadata[agentId];
  return {
    ...metadata,
    agentId,
    capabilities,
    frontendTools:
      capabilities.tools?.clientProvided === true &&
      capabilities.tools.supported === true,
  };
}

const FAIL_CLOSED_AGENT_SOURCE = sourceProfile("ag-ui-mock", {});
export const FAIL_CLOSED_AGENT_SOURCES: readonly AgentSourceProfile[] = [
  FAIL_CLOSED_AGENT_SOURCE,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function agentSourceProfilesFromRuntimeInfo(
  value: unknown,
): readonly AgentSourceProfile[] {
  if (!isRecord(value) || !isRecord(value.agents))
    return FAIL_CLOSED_AGENT_SOURCES;
  const agents = value.agents;
  const profiles = KNOWN_AGENT_SOURCES.flatMap((agentId) => {
    const entry = agents[agentId];
    if (!isRecord(entry)) return [];
    const capabilities = AgentCapabilitiesSchema.safeParse(entry.capabilities);
    return capabilities.success
      ? [sourceProfile(agentId, capabilities.data)]
      : [];
  });
  return profiles.some((profile) => profile.agentId === "ag-ui-mock")
    ? profiles
    : FAIL_CLOSED_AGENT_SOURCES;
}

export async function discoverAgentSourceProfiles(
  runtimeUrl: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<readonly AgentSourceProfile[]> {
  try {
    const response = await fetchImplementation(
      `${runtimeUrl.replace(/\/$/, "")}/info`,
      { signal: AbortSignal.timeout(1_500) },
    );
    if (!response.ok) return FAIL_CLOSED_AGENT_SOURCES;
    return agentSourceProfilesFromRuntimeInfo(await response.json());
  } catch {
    return FAIL_CLOSED_AGENT_SOURCES;
  }
}

export function normalizeAgentSource(value: unknown): AgentSource {
  return typeof value === "string" &&
    KNOWN_AGENT_SOURCES.includes(value as AgentSource)
    ? (value as AgentSource)
    : "ag-ui-mock";
}

export function agentSourceProfile(
  source: AgentSource,
  profiles: readonly AgentSourceProfile[] = FAIL_CLOSED_AGENT_SOURCES,
): AgentSourceProfile {
  return (
    profiles.find((profile) => profile.agentId === source) ??
    FAIL_CLOSED_AGENT_SOURCE
  );
}
