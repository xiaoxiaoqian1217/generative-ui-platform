import { HttpAgent } from "@ag-ui/client";
import { type AgentCapabilities, AgentCapabilitiesSchema } from "@ag-ui/core";
import {
  CopilotSseRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

export const AG_UI_MOCK_AGENT_ID = "ag-ui-mock";
export const SACS_AGENT_ID = "single-agent-chat-server";
export const COPILOT_RUNTIME_PATH = "/api/copilotkit";

export interface RuntimeConfig {
  readonly agUiMockUrl: string;
  readonly sacsAgUiUrl: string;
  readonly sacsServiceKey?: string;
  readonly sacsUserJwt?: string;
}

const mockCapabilities: AgentCapabilities = {
  identity: {
    description: "Deterministic AG-UI capability fixture",
    name: "AGUIMock",
    type: "fixture",
  },
  tools: { clientProvided: true, supported: true },
  transport: { streaming: true },
};

const sacsCapabilities: AgentCapabilities = {
  identity: {
    description: "Real SACS v0.2 Business Agent profile",
    name: "single-agent-chat-server",
    type: "sacs",
  },
  state: { deltas: true, snapshots: true },
  tools: { clientProvided: false, supported: false },
  transport: { streaming: true },
};

function httpAgent(
  url: string,
  capabilities: AgentCapabilities,
  headers: Record<string, string> = {},
): HttpAgent {
  const agent = new HttpAgent({ headers, url });
  agent.getCapabilities = async () => capabilities;
  return agent;
}

function sacsAgent(url: string, headers: Record<string, string>): HttpAgent {
  const agent = new HttpAgent({ headers, url });
  agent.getCapabilities = async () => {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/capabilities`, {
        headers,
        signal: AbortSignal.timeout(750),
      });
      if (!response.ok) return sacsCapabilities;
      const discovered = AgentCapabilitiesSchema.parse(await response.json());
      return {
        ...discovered,
        identity: {
          ...discovered.identity,
          metadata: {
            ...discovered.identity?.metadata,
            discovery: "live",
          },
        },
      };
    } catch {
      return sacsCapabilities;
    }
  };
  return agent;
}

export function createRuntimeHandler(config: RuntimeConfig) {
  const sacsHeaders: Record<string, string> = {};
  if (config.sacsServiceKey) {
    sacsHeaders.Authorization = `Bearer ${config.sacsServiceKey}`;
  }
  if (config.sacsUserJwt) {
    sacsHeaders["X-OpenWebUI-User-Jwt"] = config.sacsUserJwt;
  }

  const runtime = new CopilotSseRuntime({
    agents: {
      [AG_UI_MOCK_AGENT_ID]: httpAgent(config.agUiMockUrl, mockCapabilities),
      [SACS_AGENT_ID]: sacsAgent(config.sacsAgUiUrl, sacsHeaders),
    },
  });

  return createCopilotRuntimeHandler({
    basePath: COPILOT_RUNTIME_PATH,
    runtime,
  });
}

function validUrl(name: string, value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name}_INVALID`);
  }
  return url.toString();
}

export function loadRuntimeConfig(
  environment: NodeJS.ProcessEnv,
): RuntimeConfig {
  const sacsServiceKey = environment.SACS_AG_UI_SERVICE_KEY?.trim();
  const sacsUserJwt = environment.SACS_OPENWEBUI_USER_JWT?.trim();
  return {
    agUiMockUrl: validUrl(
      "AG_UI_MOCK_URL",
      environment.AG_UI_MOCK_URL ?? "http://127.0.0.1:4800",
    ),
    sacsAgUiUrl: validUrl(
      "SACS_AG_UI_URL",
      environment.SACS_AG_UI_URL ?? "http://127.0.0.1:8000/ag-ui",
    ),
    ...(sacsServiceKey ? { sacsServiceKey } : {}),
    ...(sacsUserJwt ? { sacsUserJwt } : {}),
  };
}
