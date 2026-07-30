const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 8200;
const DEFAULT_BASE_PATH = "/api/copilotkit";
const DEFAULT_MODEL = "openai:gpt-5-mini";

export interface RuntimeHostConfig {
  host: string;
  port: number;
  basePath: string;
  model: string;
  cors: boolean;
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT 必须是 1 到 65535 之间的整数，当前值为：${value}`);
  }

  return port;
}

function normalizeBasePath(value: string | undefined): string {
  const rawPath = value?.trim() || DEFAULT_BASE_PATH;
  const pathWithLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  if (pathWithLeadingSlash === "/") {
    return pathWithLeadingSlash;
  }

  return pathWithLeadingSlash.replace(/\/+$/, "");
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  return value.toLowerCase() !== "false";
}

export function loadRuntimeHostConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeHostConfig {
  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
    basePath: normalizeBasePath(env.COPILOTKIT_BASE_PATH),
    model: env.COPILOTKIT_MODEL?.trim() || DEFAULT_MODEL,
    cors: parseBoolean(env.CORS_ENABLED, true),
  };
}
