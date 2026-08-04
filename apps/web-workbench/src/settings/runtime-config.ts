export interface ExternalWorkbenchConfig {
  environment?: string;
  runtimeHostUrl?: string;
}

export interface WorkbenchBuildEnvironment {
  VITE_RUNTIME_HOST_URL?: string;
  VITE_WORKBENCH_ENVIRONMENT?: string;
}

export interface WorkbenchConfig {
  environment: string;
  runtimeHostUrl: string;
}

export interface RuntimeEndpoints {
  actions: string;
  catalog: string;
  copilotKit: string;
  health: string;
  runs: string;
  scenarios: string;
  socket: string;
}

const INVALID_RUNTIME_HOST_URL = "WORKBENCH_RUNTIME_HOST_URL_INVALID";
const INVALID_RUNTIME_CONFIG = "WORKBENCH_RUNTIME_CONFIG_INVALID";

function validateExternalConfig(value: unknown): ExternalWorkbenchConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(INVALID_RUNTIME_CONFIG);
  }

  const entries = Object.entries(value);
  const allowedKeys = new Set(["environment", "runtimeHostUrl"]);
  if (
    entries.some(
      ([key, entry]) =>
        !allowedKeys.has(key) ||
        (entry !== undefined && typeof entry !== "string"),
    )
  ) {
    throw new Error(INVALID_RUNTIME_CONFIG);
  }

  return value as ExternalWorkbenchConfig;
}

function normalizeRuntimeHostUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(INVALID_RUNTIME_HOST_URL);
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error(INVALID_RUNTIME_HOST_URL);
  }

  return new URL(url.origin);
}

export function createRuntimeEndpoints(
  runtimeHostUrl: string,
): RuntimeEndpoints {
  const host = normalizeRuntimeHostUrl(runtimeHostUrl);
  const socket = new URL("/ws/runs", host);
  socket.protocol = host.protocol === "https:" ? "wss:" : "ws:";

  return {
    actions: new URL("/api/actions", host).toString(),
    catalog: new URL("/api/catalog", host).toString(),
    copilotKit: new URL("/api/copilotkit", host).toString(),
    health: new URL("/health/dependencies", host).toString(),
    runs: new URL("/api/runs", host).toString(),
    scenarios: new URL("/api/scenarios", host).toString(),
    socket: socket.toString(),
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
  const runtimeHostUrl = firstNonEmpty(
    external.runtimeHostUrl,
    build.VITE_RUNTIME_HOST_URL,
    pageOrigin,
  );

  if (!runtimeHostUrl) {
    throw new Error(INVALID_RUNTIME_HOST_URL);
  }

  return {
    environment:
      firstNonEmpty(external.environment, build.VITE_WORKBENCH_ENVIRONMENT) ??
      "same-origin",
    runtimeHostUrl: normalizeRuntimeHostUrl(runtimeHostUrl).origin,
  };
}
