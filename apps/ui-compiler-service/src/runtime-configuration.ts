import { Type } from "@sinclair/typebox";
import { Ajv } from "ajv";
import type { HttpServiceConfiguration } from "./http-service-configuration.js";
import { createHttpServiceConfiguration } from "./http-service-configuration.js";
import type { ModelInvocationPolicy } from "./presentation-router.js";
import type { StructuredDataLimits } from "./structured-data-validator.js";

export interface RuntimeConfiguration
  extends HttpServiceConfiguration,
    ModelInvocationPolicy {
  host: string;
  port: number;
  maxDataDepth: number;
  maxDataItems: number;
}

export const DEFAULT_RUNTIME_CONFIGURATION: Readonly<RuntimeConfiguration> =
  Object.freeze({
    host: "0.0.0.0",
    port: 3000,
    maxRequestBytes: 1_048_576,
    requestDeadlineMs: 30_000,
    compileTimeoutMs: 10_000,
    httpHeadersTimeoutMs: 5_000,
    httpRequestBodyTimeoutMs: 10_000,
    httpConnectionsCheckingIntervalMs: 1_000,
    shutdownGraceMs: 30_000,
    maxDataDepth: 32,
    maxDataItems: 10_000,
    modelTimeoutMs: 10_000,
    modelRetryCount: 0,
  });

export class RuntimeConfigurationError extends Error {
  readonly code = "RUNTIME_CONFIGURATION_INVALID";
  constructor() {
    super("Runtime configuration is invalid.");
    this.name = "RuntimeConfigurationError";
  }
}

const environmentKeys = {
  host: "UI_COMPILER_HOST",
  port: "UI_COMPILER_PORT",
  maxRequestBytes: "UI_COMPILER_MAX_REQUEST_BYTES",
  requestDeadlineMs: "UI_COMPILER_REQUEST_DEADLINE_MS",
  compileTimeoutMs: "UI_COMPILER_COMPILE_TIMEOUT_MS",
  httpHeadersTimeoutMs: "UI_COMPILER_HTTP_HEADERS_TIMEOUT_MS",
  httpRequestBodyTimeoutMs: "UI_COMPILER_HTTP_REQUEST_BODY_TIMEOUT_MS",
  httpConnectionsCheckingIntervalMs:
    "UI_COMPILER_HTTP_CONNECTIONS_CHECKING_INTERVAL_MS",
  shutdownGraceMs: "UI_COMPILER_SHUTDOWN_GRACE_MS",
  maxDataDepth: "UI_COMPILER_MAX_DATA_DEPTH",
  maxDataItems: "UI_COMPILER_MAX_DATA_ITEMS",
  modelTimeoutMs: "UI_COMPILER_MODEL_TIMEOUT_MS",
  modelRetryCount: "UI_COMPILER_MODEL_RETRY_COUNT",
} as const;

const runtimeEnvironmentSchema = Type.Object(
  Object.fromEntries(
    Object.values(environmentKeys).map((key) => [
      key,
      Type.Optional(Type.String()),
    ]),
  ),
  { additionalProperties: true },
);
const validateRuntimeEnvironment = new Ajv({
  allErrors: true,
  strict: true,
}).compile(runtimeEnvironmentSchema);

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new RuntimeConfigurationError();
  return parsed;
}

export function createRuntimeConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Readonly<RuntimeConfiguration> {
  if (!validateRuntimeEnvironment(environment))
    throw new RuntimeConfigurationError();
  const host =
    environment[environmentKeys.host] ?? DEFAULT_RUNTIME_CONFIGURATION.host;
  const configuration: RuntimeConfiguration = {
    host,
    port: positiveInteger(
      environment[environmentKeys.port],
      DEFAULT_RUNTIME_CONFIGURATION.port,
    ),
    maxRequestBytes: positiveInteger(
      environment[environmentKeys.maxRequestBytes],
      DEFAULT_RUNTIME_CONFIGURATION.maxRequestBytes,
    ),
    requestDeadlineMs: positiveInteger(
      environment[environmentKeys.requestDeadlineMs],
      DEFAULT_RUNTIME_CONFIGURATION.requestDeadlineMs,
    ),
    compileTimeoutMs: positiveInteger(
      environment[environmentKeys.compileTimeoutMs],
      DEFAULT_RUNTIME_CONFIGURATION.compileTimeoutMs,
    ),
    httpHeadersTimeoutMs: positiveInteger(
      environment[environmentKeys.httpHeadersTimeoutMs],
      DEFAULT_RUNTIME_CONFIGURATION.httpHeadersTimeoutMs,
    ),
    httpRequestBodyTimeoutMs: positiveInteger(
      environment[environmentKeys.httpRequestBodyTimeoutMs],
      DEFAULT_RUNTIME_CONFIGURATION.httpRequestBodyTimeoutMs,
    ),
    httpConnectionsCheckingIntervalMs: positiveInteger(
      environment[environmentKeys.httpConnectionsCheckingIntervalMs],
      DEFAULT_RUNTIME_CONFIGURATION.httpConnectionsCheckingIntervalMs,
    ),
    shutdownGraceMs: positiveInteger(
      environment[environmentKeys.shutdownGraceMs],
      DEFAULT_RUNTIME_CONFIGURATION.shutdownGraceMs,
    ),
    maxDataDepth: positiveInteger(
      environment[environmentKeys.maxDataDepth],
      DEFAULT_RUNTIME_CONFIGURATION.maxDataDepth,
    ),
    maxDataItems: positiveInteger(
      environment[environmentKeys.maxDataItems],
      DEFAULT_RUNTIME_CONFIGURATION.maxDataItems,
    ),
    modelTimeoutMs: positiveInteger(
      environment[environmentKeys.modelTimeoutMs],
      DEFAULT_RUNTIME_CONFIGURATION.modelTimeoutMs,
    ),
    modelRetryCount:
      environment[environmentKeys.modelRetryCount] === undefined
        ? 0
        : Number(environment[environmentKeys.modelRetryCount]),
  };
  if (
    host.length === 0 ||
    host.length > 255 ||
    !Number.isSafeInteger(configuration.modelRetryCount) ||
    configuration.modelRetryCount < 0 ||
    configuration.modelRetryCount > 3 ||
    configuration.port > 65_535 ||
    configuration.maxDataDepth > 128 ||
    configuration.maxDataItems > 1_000_000 ||
    configuration.compileTimeoutMs >= configuration.requestDeadlineMs ||
    configuration.modelTimeoutMs > configuration.requestDeadlineMs
  )
    throw new RuntimeConfigurationError();
  const {
    host: _host,
    port: _port,
    maxDataDepth: _maxDataDepth,
    maxDataItems: _maxDataItems,
    modelTimeoutMs: _modelTimeoutMs,
    modelRetryCount: _modelRetryCount,
    ...httpConfiguration
  } = configuration;
  try {
    createHttpServiceConfiguration(httpConfiguration);
  } catch {
    throw new RuntimeConfigurationError();
  }
  return Object.freeze(configuration);
}

export function structuredDataLimitsFrom(
  configuration: RuntimeConfiguration,
): StructuredDataLimits {
  return Object.freeze({
    maxDataDepth: configuration.maxDataDepth,
    maxDataItems: configuration.maxDataItems,
    maxSerializedBytes: 65_536,
  });
}
