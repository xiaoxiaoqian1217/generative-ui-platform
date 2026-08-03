export interface BusinessAgentConfiguration {
  host: string;
  port: number;
}

export function createBusinessAgentConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): BusinessAgentConfiguration {
  const host = env.BUSINESS_AGENT_HOST?.trim() || "127.0.0.1";
  const portText = env.BUSINESS_AGENT_PORT?.trim() || "8300";
  if (!/^\d+$/u.test(portText)) {
    throw new Error("BUSINESS_AGENT_PORT must be an integer from 0 to 65535.");
  }
  const port = Number(portText);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new Error("BUSINESS_AGENT_PORT must be an integer from 0 to 65535.");
  }
  return { host, port };
}
