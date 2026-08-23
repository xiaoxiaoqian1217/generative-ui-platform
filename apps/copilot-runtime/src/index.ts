import { createHmac } from "node:crypto";

import { type AbstractAgent, HttpAgent } from "@ag-ui/client";
import { type AgentCapabilities, AgentCapabilitiesSchema } from "@ag-ui/core";
import { LangGraphAgent } from "@ag-ui/langgraph";
import {
  CopilotSseRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { DynamicA2uiPresentationPolicy } from "./presentation-policy.js";
import {
  createScenarioFixtureDrafter,
  DEFAULT_SCENARIO_DRAFT_BASE_URL,
  DEFAULT_SCENARIO_DRAFT_MODEL,
  type DraftScenarioFixture,
} from "./scenario-fixture-drafter.js";
import { createScenarioLabHandler } from "./scenario-lab.js";
import {
  createSecondaryLlmInvokeSubagent,
  DEFAULT_SECONDARY_LLM_BASE_URL,
  DEFAULT_SECONDARY_LLM_MODEL,
  type InvokeSubagent,
} from "./secondary-llm.js";

export const AG_UI_MOCK_AGENT_ID = "ag-ui-mock";
export const SACS_AGENT_ID = "single-agent-chat-server";
export const MAP_VALIDATION_AGENT_ID = "map-validation-agent";
export const COPILOT_RUNTIME_PATH = "/api/copilotkit";

export interface RuntimeConfig {
  readonly agUiMockUrl: string;
  readonly mapValidationAgentEnabled?: boolean;
  readonly mapValidationAgentGraphId?: string;
  readonly mapValidationAgentUrl?: string;
  readonly sacsAgUiUrl: string;
  readonly sacsJwtSecret?: string;
  readonly sacsPrincipalId?: string;
  readonly sacsPrincipalRole?: "admin" | "user";
  readonly sacsServiceKey?: string;
  readonly scenarioDraftLlmApiKey?: string;
  readonly scenarioDraftLlmBaseUrl?: string;
  readonly scenarioDraftLlmModel?: string;
  readonly scenarioDraftLlmTimeoutMs?: number;
  readonly scenarioLabEnabled?: boolean;
  readonly secondaryLlmApiKey?: string;
  readonly secondaryLlmBaseUrl?: string;
  readonly secondaryLlmModel?: string;
  readonly secondaryLlmTimeoutMs?: number;
}

export interface RuntimeHandlerOptions {
  /**
   * Test injection point for the dev-only Scenario fixture authoring adapter.
   * Production wiring uses the independent `SCENARIO_DRAFT_LLM_*` config.
   */
  readonly draftScenarioFixture?: DraftScenarioFixture;
  /**
   * Test injection point for the deterministic Secondary LLM double
   * (Issue #210 CI strategy); when omitted, the OpenAI-compatible client
   * is wired from `A2UI_SECONDARY_LLM_*` configuration.
   */
  readonly invokeSubagent?: InvokeSubagent;
  /**
   * Test-only injection point for a deterministic validation Agent double.
   * Normal wiring always creates the official LangGraphAgent bridge.
   */
  readonly mapValidationAgent?: AbstractAgent;
  readonly now?: () => number;
  /**
   * Scenario Lab file location (Issue #213 dev-only endpoints). Defaults to
   * the repository `scenarios/` directory of this app.
   */
  readonly scenariosDir?: URL;
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

const mapValidationCapabilities: AgentCapabilities = {
  identity: {
    description: "Dev-only interaction validation Agent",
    metadata: { role: "dev-only-interaction-validation" },
    name: MAP_VALIDATION_AGENT_ID,
    type: "validation",
  },
  tools: { clientProvided: true, supported: true },
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

function validationAgent(
  config: RuntimeConfig,
  injected: AbstractAgent | undefined,
): AbstractAgent | undefined {
  if (
    config.mapValidationAgentEnabled !== true ||
    config.mapValidationAgentUrl === undefined ||
    config.mapValidationAgentGraphId === undefined
  )
    return undefined;
  const agent =
    injected ??
    new LangGraphAgent({
      deploymentUrl: config.mapValidationAgentUrl,
      graphId: config.mapValidationAgentGraphId,
    });
  agent.getCapabilities = async () => mapValidationCapabilities;
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
  const secondaryLlmConfig =
    config.secondaryLlmApiKey === undefined
      ? undefined
      : {
          apiKey: config.secondaryLlmApiKey,
          baseUrl: config.secondaryLlmBaseUrl ?? DEFAULT_SECONDARY_LLM_BASE_URL,
          model: config.secondaryLlmModel ?? DEFAULT_SECONDARY_LLM_MODEL,
          ...(config.secondaryLlmTimeoutMs === undefined
            ? {}
            : { timeoutMs: config.secondaryLlmTimeoutMs }),
        };
  const invokeSubagent =
    options.invokeSubagent ??
    (secondaryLlmConfig === undefined
      ? undefined
      : createSecondaryLlmInvokeSubagent(secondaryLlmConfig));
  const scenarioDraftLlmConfig =
    config.scenarioDraftLlmApiKey === undefined
      ? undefined
      : {
          apiKey: config.scenarioDraftLlmApiKey,
          baseUrl:
            config.scenarioDraftLlmBaseUrl ?? DEFAULT_SCENARIO_DRAFT_BASE_URL,
          model: config.scenarioDraftLlmModel ?? DEFAULT_SCENARIO_DRAFT_MODEL,
          ...(config.scenarioDraftLlmTimeoutMs === undefined
            ? {}
            : { timeoutMs: config.scenarioDraftLlmTimeoutMs }),
        };
  const draftScenarioFixture =
    options.draftScenarioFixture ??
    (scenarioDraftLlmConfig === undefined
      ? undefined
      : createScenarioFixtureDrafter(scenarioDraftLlmConfig));
  const runtime = new CopilotSseRuntime({
    agents: () => {
      const mockAgent = httpAgent(config.agUiMockUrl, mockCapabilities);
      mockAgent.use(
        new DynamicA2uiPresentationPolicy(
          invokeSubagent === undefined ? {} : { invokeSubagent },
        ),
      );
      const agents: Record<string, AbstractAgent> = {
        [AG_UI_MOCK_AGENT_ID]: mockAgent,
        [SACS_AGENT_ID]: sacsAgent(
          config.sacsAgUiUrl,
          sacsCredentials(config),
          now,
        ),
      };
      const mapValidationAgent = validationAgent(
        config,
        options.mapValidationAgent,
      );
      if (mapValidationAgent !== undefined)
        agents[MAP_VALIDATION_AGENT_ID] = mapValidationAgent;
      return agents;
    },
  });

  const copilotHandler = createCopilotRuntimeHandler({
    basePath: COPILOT_RUNTIME_PATH,
    runtime,
  });
  const scenarioLabHandler =
    config.scenarioLabEnabled === true
      ? createScenarioLabHandler({
          scenariosDir:
            options.scenariosDir ?? new URL("../scenarios/", import.meta.url),
          ...(draftScenarioFixture === undefined
            ? {}
            : { draftScenarioFixture }),
          ...(invokeSubagent === undefined ? {} : { invokeSubagent }),
        })
      : undefined;

  return async (request: Request): Promise<Response> => {
    const labResponse = await scenarioLabHandler?.(request);
    return labResponse ?? copilotHandler(request);
  };
}

function validUrl(name: string, value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name}_INVALID`);
  }
  return url.toString();
}

function booleanEnvironment(name: string, value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized === undefined || normalized === "" || normalized === "false")
    return false;
  if (normalized === "true") return true;
  throw new Error(`${name}_INVALID`);
}

function optionalGraphId(
  name: string,
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) throw new Error(`${name}_INVALID`);
  return normalized;
}

function optionalUrl(
  name: string,
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? validUrl(name, normalized) : undefined;
}

function timeoutEnvironment(
  name: string,
  value: string | undefined,
): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 600_000)
    throw new Error(`${name}_INVALID`);
  return parsed;
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
  const scenarioDraftLlmTimeoutMs = timeoutEnvironment(
    "SCENARIO_DRAFT_LLM_TIMEOUT_MS",
    environment.SCENARIO_DRAFT_LLM_TIMEOUT_MS,
  );
  const secondaryLlmTimeoutMs = timeoutEnvironment(
    "A2UI_SECONDARY_LLM_TIMEOUT_MS",
    environment.A2UI_SECONDARY_LLM_TIMEOUT_MS,
  );
  const mapValidationAgentEnabled = booleanEnvironment(
    "MAP_VALIDATION_AGENT_ENABLED",
    environment.MAP_VALIDATION_AGENT_ENABLED,
  );
  const mapValidationAgentGraphId = optionalGraphId(
    "MAP_VALIDATION_AGENT_GRAPH_ID",
    environment.MAP_VALIDATION_AGENT_GRAPH_ID,
  );
  const mapValidationAgentUrl = optionalUrl(
    "MAP_VALIDATION_AGENT_URL",
    environment.MAP_VALIDATION_AGENT_URL,
  );
  const config: RuntimeConfig = {
    agUiMockUrl: validUrl(
      "AG_UI_MOCK_URL",
      environment.AG_UI_MOCK_URL ?? "http://127.0.0.1:4800",
    ),
    mapValidationAgentEnabled,
    sacsAgUiUrl: validUrl(
      "SACS_AG_UI_URL",
      environment.SACS_AG_UI_URL ?? "http://127.0.0.1:3000/ag-ui",
    ),
    scenarioDraftLlmBaseUrl: validUrl(
      "SCENARIO_DRAFT_LLM_BASE_URL",
      environment.SCENARIO_DRAFT_LLM_BASE_URL?.trim() ||
        DEFAULT_SCENARIO_DRAFT_BASE_URL,
    ),
    scenarioDraftLlmModel:
      environment.SCENARIO_DRAFT_LLM_MODEL?.trim() ||
      DEFAULT_SCENARIO_DRAFT_MODEL,
    scenarioLabEnabled: booleanEnvironment(
      "SCENARIO_LAB_ENABLED",
      environment.SCENARIO_LAB_ENABLED,
    ),
    secondaryLlmBaseUrl:
      environment.A2UI_SECONDARY_LLM_BASE_URL?.trim() ||
      DEFAULT_SECONDARY_LLM_BASE_URL,
    secondaryLlmModel:
      environment.A2UI_SECONDARY_LLM_MODEL?.trim() ||
      DEFAULT_SECONDARY_LLM_MODEL,
    ...(secondaryLlmTimeoutMs === undefined ? {} : { secondaryLlmTimeoutMs }),
    ...(mapValidationAgentGraphId === undefined
      ? {}
      : { mapValidationAgentGraphId }),
    ...(mapValidationAgentUrl === undefined ? {} : { mapValidationAgentUrl }),
    ...(scenarioDraftLlmTimeoutMs === undefined
      ? {}
      : { scenarioDraftLlmTimeoutMs }),
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
    ...(environment.SCENARIO_DRAFT_LLM_API_KEY?.trim()
      ? {
          scenarioDraftLlmApiKey: environment.SCENARIO_DRAFT_LLM_API_KEY.trim(),
        }
      : {}),
  };
  sacsCredentials(config);
  return config;
}

export {
  A2UI_GENERATION_ERROR_ACTIVITY_TYPE,
  type A2uiGenerationErrorCode,
  type A2uiGenerationErrorContent,
  type A2uiSurfaceGeneration,
  generateA2uiSurfaceFromContent,
} from "./a2ui-generation.js";
export {
  DYNAMIC_A2UI_COMPONENT_NAMES,
  dynamicA2uiCatalogSchema,
  dynamicA2uiValidationCatalog,
} from "./dynamic-a2ui.js";
export {
  type JsonValue,
  type PresentationContent,
  type PresentationInput,
  type PresentationLifecycle,
  type PresentationProvenance,
  parsePresentationInput,
  serializePresentationInputContent,
} from "./presentation-input.js";
export {
  DynamicA2uiPresentationPolicy,
  type PresentationForwardedProps,
} from "./presentation-policy.js";
export {
  createScenarioFixtureDrafter,
  DEFAULT_SCENARIO_DRAFT_BASE_URL,
  DEFAULT_SCENARIO_DRAFT_MODEL,
  type DraftScenarioFixture,
  MAX_SCENARIO_DRAFT_DESCRIPTION_LENGTH,
  parseScenarioFixtureContent,
  type ScenarioFixtureContent,
} from "./scenario-fixture-drafter.js";
export {
  createScenarioLabHandler,
  SCENARIO_LAB_BASE_PATH,
} from "./scenario-lab.js";
export {
  DEFAULT_SECONDARY_LLM_BASE_URL,
  DEFAULT_SECONDARY_LLM_MODEL,
  type InvokeSubagent,
} from "./secondary-llm.js";
