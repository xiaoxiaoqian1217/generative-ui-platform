export interface ExternalWorkbenchConfig {
  agentUrl?: string;
  environment?: string;
}

export interface WorkbenchBuildEnvironment {
  VITE_AGENT_URL?: string;
  VITE_WORKBENCH_ENVIRONMENT?: string;
}

export interface WorkbenchConfig {
  agentUrl: string;
  environment: string;
}

export interface AgentEndpoints {
  agUi: string;
  scenarioLab: string;
}

const INVALID_AGENT_URL = "WORKBENCH_AGENT_URL_INVALID";
const INVALID_WORKBENCH_CONFIG = "WORKBENCH_CONFIG_INVALID";

function validateExternalConfig(value: unknown): ExternalWorkbenchConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(INVALID_WORKBENCH_CONFIG);
  }

  const entries = Object.entries(value);
  const allowedKeys = new Set(["agentUrl", "environment"]);
  if (
    entries.some(
      ([key, entry]) =>
        !allowedKeys.has(key) ||
        (entry !== undefined && typeof entry !== "string"),
    )
  ) {
    throw new Error(INVALID_WORKBENCH_CONFIG);
  }

  return value as ExternalWorkbenchConfig;
}

function normalizeAgentUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(INVALID_AGENT_URL);
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error(INVALID_AGENT_URL);
  }

  return new URL(url.origin);
}

export function createAgentEndpoints(agentUrl: string): AgentEndpoints {
  const host = normalizeAgentUrl(agentUrl);
  return {
    agUi: new URL("/api/copilotkit", host).toString(),
    scenarioLab: new URL("/api/dev/scenario-lab", host).toString(),
  };
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value?.trim())?.trim();
}

export function resolveWorkbenchConfig(
  externalInput: unknown,
  build: WorkbenchBuildEnvironment,
  pageOrigin: string,
): WorkbenchConfig {
  const external = validateExternalConfig(externalInput);
  const agentUrl = firstNonEmpty(
    external.agentUrl,
    build.VITE_AGENT_URL,
    pageOrigin,
  );

  if (!agentUrl) {
    throw new Error(INVALID_AGENT_URL);
  }

  return {
    agentUrl: normalizeAgentUrl(agentUrl).origin,
    environment:
      firstNonEmpty(external.environment, build.VITE_WORKBENCH_ENVIRONMENT) ??
      "same-origin",
  };
}
