export const AGENT_SOURCES = [
  "ag-ui-mock",
  "single-agent-chat-server",
] as const;

export type AgentSource = (typeof AGENT_SOURCES)[number];

export interface AgentSourceProfile {
  readonly agentId: AgentSource;
  readonly description: string;
  readonly frontendTools: boolean;
  readonly label: string;
}

const profiles: Record<AgentSource, AgentSourceProfile> = {
  "ag-ui-mock": {
    agentId: "ag-ui-mock",
    description: "Deterministic capability fixture with Frontend Tools",
    frontendTools: true,
    label: "AGUIMock",
  },
  "single-agent-chat-server": {
    agentId: "single-agent-chat-server",
    description: "Real Business Agent profile without Frontend Tools",
    frontendTools: false,
    label: "single-agent-chat-server",
  },
};

export function normalizeAgentSource(value: unknown): AgentSource {
  return typeof value === "string" &&
    AGENT_SOURCES.includes(value as AgentSource)
    ? (value as AgentSource)
    : "ag-ui-mock";
}

export function agentSourceProfile(source: AgentSource): AgentSourceProfile {
  return profiles[source];
}
