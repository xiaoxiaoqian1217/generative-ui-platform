export interface RuntimeHostConfig {
  host: string;
  port: number;
  endpoint: string;
  agentId: string;
  businessAgentUrl: string;
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? "8200");

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${value ?? ""}`);
  }

  return port;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeHostConfig {
  return {
    host: env.HOST ?? "0.0.0.0",
    port: readPort(env.PORT),
    endpoint: env.COPILOTKIT_ENDPOINT ?? "/api/copilotkit",
    agentId: env.BUSINESS_AGENT_ID ?? "business-agent",
    businessAgentUrl:
      env.BUSINESS_AGENT_URL ?? "http://localhost:8000/ag-ui",
  };
}
