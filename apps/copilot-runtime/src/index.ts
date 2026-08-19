import { createHmac } from "node:crypto";

import { HttpAgent } from "@ag-ui/client";
import { type AgentCapabilities, AgentCapabilitiesSchema } from "@ag-ui/core";
import {
  CopilotSseRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { DynamicA2uiPresentationPolicy } from "./presentation-policy.js";
import {
  createSecondaryLlmInvokeSubagent,
  DEFAULT_SECONDARY_LLM_BASE_URL,
  DEFAULT_SECONDARY_LLM_MODEL,
  type InvokeSubagent,
} from "./secondary-llm.js";

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
  readonly secondaryLlmApiKey?: string;
  readonly secondaryLlmBaseUrl?: string;
  readonly secondaryLlmModel?: string;
}

export interface RuntimeHandlerOptions {
  /**
   * Test injection point for the deterministic Secondary LLM double
   * (Issue #210 CI strategy); when omitted, the OpenAI-compatible client
   * is wired from `A2UI_SECONDARY_LLM_*` configuration.
   */
  readonly invokeSubagent?: InvokeSubagent;
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
  const invokeSubagent =
    options.invokeSubagent ??
    (config.secondaryLlmApiKey === undefined
      ? undefined
      : createSecondaryLlmInvokeSubagent({
          apiKey: config.secondaryLlmApiKey,
          baseUrl: config.secondaryLlmBaseUrl ?? DEFAULT_SECONDARY_LLM_BASE_URL,
          model: config.secondaryLlmModel ?? DEFAULT_SECONDARY_LLM_MODEL,
        }));
  const runtime = new CopilotSseRuntime({
    agents: () => {
      const mockAgent = httpAgent(config.agUiMockUrl, mockCapabilities);
      mockAgent.use(
        new DynamicA2uiPresentationPolicy(
          invokeSubagent === undefined ? {} : { invokeSubagent },
        ),
      );
      return {
        [AG_UI_MOCK_AGENT_ID]: mockAgent,
        [SACS_AGENT_ID]: sacsAgent(
          config.sacsAgUiUrl,
          sacsCredentials(config),
          now,
        ),
      };
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
    secondaryLlmBaseUrl:
      environment.A2UI_SECONDARY_LLM_BASE_URL?.trim() ||
      DEFAULT_SECONDARY_LLM_BASE_URL,
    secondaryLlmModel:
      environment.A2UI_SECONDARY_LLM_MODEL?.trim() ||
      DEFAULT_SECONDARY_LLM_MODEL,
    ...(sacsJwtSecret ? { sacsJwtSecret } : {}),
    ...(sacsPrincipalId ? { sacsPrincipalId } : {}),
    ...(sacsPrincipalId || sacsJwtSecret || sacsServiceKey
      ? { sacsPrincipalRole }
      : {}),
    ...(sacsServiceKey ? { sacsServiceKey } : {}),
    ...(environment.A2UI_SECONDARY_LLM_API_KEY?.trim()
      ? {
          secondaryLlmApiKey: environment.A2UI_SECONDARY_LLM_API_KEY.trim(),
        }
      : {}),
  };
  sacsCredentials(config);
  return config;
}

export {
  DYNAMIC_A2UI_COMPONENT_NAMES,
  dynamicA2uiCatalogSchema,
  dynamicA2uiValidationCatalog,
} from "./dynamic-a2ui.js";
export {
  A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
  type A2uiGenerationErrorCode,
  type A2uiGenerationErrorContent,
  type A2uiSurfaceGeneration,
  generateA2uiSurfaceFromContent,
} from "./a2ui-generation.js";
export {
  type JsonValue,
  parsePresentationInput,
  type PresentationContent,
  type PresentationInput,
  type PresentationLifecycle,
  type PresentationProvenance,
  serializePresentationInputContent,
} from "./presentation-input.js";
export {
  DynamicA2uiPresentationPolicy,
  type PresentationForwardedProps,
} from "./presentation-policy.js";
export {
  DEFAULT_SECONDARY_LLM_BASE_URL,
  DEFAULT_SECONDARY_LLM_MODEL,
  type InvokeSubagent,
} from "./secondary-llm.js";
