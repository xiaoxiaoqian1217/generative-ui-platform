import { createHmac } from "node:crypto";

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
  readonly sacsJwtSecret?: string;
  readonly sacsPrincipalId?: string;
  readonly sacsPrincipalRole?: "admin" | "user";
  readonly sacsServiceKey?: string;
}

export interface RuntimeHandlerOptions {
  readonly now?: () => number;
}

interface SacsCredentials {
  readonly jwtSecret: string;
  readonly principalId: string;
  readonly principalRole: "admin" | "user";
  readonly serviceKey: string;
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

function issueSacsUserJwt(
  credentials: SacsCredentials,
  now: () => number,
): string {
  const issuedAt = Math.floor(now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    exp: issuedAt + 300,
    iat: issuedAt,
    iss: "open-webui",
    role: credentials.principalRole,
    sub: credentials.principalId,
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", credentials.jwtSecret)
    .update(unsignedToken, "ascii")
    .digest("base64url");
  return `${unsignedToken}.${signature}`;
}

function sacsCredentials(config: RuntimeConfig): SacsCredentials | undefined {
  const jwtSecret = config.sacsJwtSecret;
  const principalId = config.sacsPrincipalId;
  const serviceKey = config.sacsServiceKey;
  if (
    jwtSecret === undefined &&
    principalId === undefined &&
    serviceKey === undefined
  ) {
    return undefined;
  }
  if (
    jwtSecret === undefined ||
    principalId === undefined ||
    serviceKey === undefined
  ) {
    throw new Error("SACS_CREDENTIALS_INCOMPLETE");
  }
  if (jwtSecret.length < 32 || jwtSecret.length > 512) {
    throw new Error("SACS_OPENWEBUI_USER_JWT_SECRET_INVALID");
  }
  if (serviceKey.length < 32 || serviceKey.length > 512) {
    throw new Error("SACS_AG_UI_SERVICE_KEY_INVALID");
  }
  if (principalId.length === 0 || principalId.length > 256) {
    throw new Error("SACS_PRINCIPAL_ID_INVALID");
  }
  return {
    jwtSecret,
    principalId,
    principalRole: config.sacsPrincipalRole ?? "user",
    serviceKey,
  };
}

function sacsAgent(
  url: string,
  credentials: SacsCredentials | undefined,
  now: () => number,
): HttpAgent {
  const authenticatedFetch = (requestUrl: string, init: RequestInit) => {
    if (credentials === undefined) return fetch(requestUrl, init);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${credentials.serviceKey}`);
    headers.set("X-OpenWebUI-User-Jwt", issueSacsUserJwt(credentials, now));
    return fetch(requestUrl, { ...init, headers });
  };
  const agent = new HttpAgent({ fetch: authenticatedFetch, url });
  agent.getCapabilities = async () => {
    try {
      const response = await authenticatedFetch(
        `${url.replace(/\/$/, "")}/capabilities`,
        {
          signal: AbortSignal.timeout(750),
        },
      );
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

export function createRuntimeHandler(
  config: RuntimeConfig,
  options: RuntimeHandlerOptions = {},
) {
  const now = options.now ?? Date.now;
  const runtime = new CopilotSseRuntime({
    agents: {
      [AG_UI_MOCK_AGENT_ID]: httpAgent(config.agUiMockUrl, mockCapabilities),
      [SACS_AGENT_ID]: sacsAgent(
        config.sacsAgUiUrl,
        sacsCredentials(config),
        now,
      ),
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
  if (environment.SACS_OPENWEBUI_USER_JWT?.trim()) {
    throw new Error("SACS_STATIC_USER_JWT_UNSUPPORTED");
  }
  const sacsServiceKey = environment.SACS_AG_UI_SERVICE_KEY?.trim();
  const sacsJwtSecret = environment.SACS_OPENWEBUI_USER_JWT_SECRET?.trim();
  const sacsPrincipalId = environment.SACS_PRINCIPAL_ID?.trim();
  const sacsPrincipalRole = environment.SACS_PRINCIPAL_ROLE?.trim() ?? "user";
  if (sacsPrincipalRole !== "user" && sacsPrincipalRole !== "admin") {
    throw new Error("SACS_PRINCIPAL_ROLE_INVALID");
  }
  const config: RuntimeConfig = {
    agUiMockUrl: validUrl(
      "AG_UI_MOCK_URL",
      environment.AG_UI_MOCK_URL ?? "http://127.0.0.1:4800",
    ),
    sacsAgUiUrl: validUrl(
      "SACS_AG_UI_URL",
      environment.SACS_AG_UI_URL ?? "http://127.0.0.1:3000/ag-ui",
    ),
    ...(sacsJwtSecret ? { sacsJwtSecret } : {}),
    ...(sacsPrincipalId ? { sacsPrincipalId } : {}),
    ...(sacsPrincipalId || sacsJwtSecret || sacsServiceKey
      ? { sacsPrincipalRole }
      : {}),
    ...(sacsServiceKey ? { sacsServiceKey } : {}),
  };
  sacsCredentials(config);
  return config;
}
