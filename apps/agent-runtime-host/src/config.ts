import type {
  FixtureModelFault,
  ModelInvocationPolicy,
  PresentationModelProvider,
  PresentationModelProviderRegistration,
} from "@generative-ui/presentation-pipeline";

export type RuntimeHostPresentationModelConfig =
  | {
      readonly mode: "fixture";
      readonly fixtureFault?: FixtureModelFault;
    }
  | {
      readonly mode: "provider";
      readonly registration: PresentationModelProviderRegistration;
      readonly modelInvocation: ModelInvocationPolicy;
    };

export interface RuntimeHostConfig {
  host: string;
  port: number;
  endpoint: string;
  agentId: string;
  businessAgentContractUrl: string;
  presentationModel: RuntimeHostPresentationModelConfig;
  runtime?: { totalTimeoutMs: number; maxConcurrentRuns: number };
}

export class RuntimeHostConfigurationError extends Error {
  readonly code = "RUNTIME_HOST_CONFIGURATION_INVALID";

  constructor() {
    super("Runtime Host configuration is invalid.");
    this.name = "RuntimeHostConfigurationError";
  }
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? "8200");

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${value ?? ""}`);
  }

  return port;
}

function requiredValue(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new RuntimeHostConfigurationError();
  }
  return value;
}

function readBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? String(fallback));
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RuntimeHostConfigurationError();
  }
  return parsed;
}

function readProvider(value: string): PresentationModelProvider {
  if (
    value === "kimi" ||
    value === "doubao" ||
    value === "glm" ||
    value === "qwen" ||
    value === "openai-compatible"
  ) {
    return value;
  }
  throw new RuntimeHostConfigurationError();
}

function readPresentationModelConfig(
  env: NodeJS.ProcessEnv,
): RuntimeHostPresentationModelConfig {
  const providerValue = env.PRESENTATION_MODEL_PROVIDER ?? "fixture";
  if (providerValue === "fixture") {
    const fault = env.PRESENTATION_FIXTURE_MODEL_FAULT;
    if (
      fault !== undefined &&
      fault !== "timeout" &&
      fault !== "rate-limited" &&
      fault !== "invalid-candidate" &&
      fault !== "provider-failure"
    ) {
      throw new RuntimeHostConfigurationError();
    }
    return Object.freeze({
      mode: "fixture",
      ...(fault === undefined ? {} : { fixtureFault: fault }),
    });
  }

  const provider = readProvider(providerValue);
  const baseUrl = env.PRESENTATION_MODEL_BASE_URL;
  if (provider === "openai-compatible" && baseUrl === undefined) {
    throw new RuntimeHostConfigurationError();
  }
  const endpointId = env.PRESENTATION_MODEL_ENDPOINT_ID;
  const registration = Object.freeze({
    registrationId:
      env.PRESENTATION_MODEL_REGISTRATION_ID ?? `${provider}-primary`,
    provider,
    modelName: requiredValue(env.PRESENTATION_MODEL_NAME),
    apiKey: requiredValue(env.PRESENTATION_MODEL_API_KEY),
    ...(baseUrl === undefined ? {} : { baseUrl }),
    ...(endpointId === undefined ? {} : { endpointId }),
  });

  return Object.freeze({
    mode: "provider",
    registration,
    modelInvocation: Object.freeze({
      modelTimeoutMs: readBoundedInteger(
        env.PRESENTATION_MODEL_TIMEOUT_MS,
        10_000,
        1,
        300_000,
      ),
      modelRetryCount: readBoundedInteger(
        env.PRESENTATION_MODEL_RETRY_COUNT,
        0,
        0,
        3,
      ),
    }),
  });
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeHostConfig {
  return {
    host: env.HOST ?? "127.0.0.1",
    port: readPort(env.PORT),
    endpoint: env.COPILOTKIT_ENDPOINT ?? "/api/copilotkit",
    agentId: env.BUSINESS_AGENT_ID ?? "business-agent",
    businessAgentContractUrl:
      env.BUSINESS_AGENT_CONTRACT_URL ?? "http://localhost:8300",
    presentationModel: readPresentationModelConfig(env),
    runtime: Object.freeze({
      totalTimeoutMs: readBoundedInteger(
        env.RUNTIME_TOTAL_TIMEOUT_MS,
        15_000,
        1,
        300_000,
      ),
      maxConcurrentRuns: readBoundedInteger(
        env.RUNTIME_MAX_CONCURRENT_RUNS,
        16,
        1,
        1_000,
      ),
    }),
  };
}
