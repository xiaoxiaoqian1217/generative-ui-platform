export interface HttpServiceConfiguration {
  maxRequestBytes: number;
  requestDeadlineMs: number;
  compileTimeoutMs: number;
  httpHeadersTimeoutMs: number;
  httpRequestBodyTimeoutMs: number;
  httpConnectionsCheckingIntervalMs: number;
  shutdownGraceMs: number;
}

export const DEFAULT_HTTP_SERVICE_CONFIGURATION: Readonly<HttpServiceConfiguration> =
  Object.freeze({
    maxRequestBytes: 1_048_576,
    requestDeadlineMs: 30_000,
    compileTimeoutMs: 10_000,
    httpHeadersTimeoutMs: 5_000,
    httpRequestBodyTimeoutMs: 10_000,
    httpConnectionsCheckingIntervalMs: 1_000,
    shutdownGraceMs: 30_000,
  });

export class HttpServiceConfigurationError extends Error {
  readonly code = "HTTP_SERVICE_CONFIGURATION_INVALID";
  constructor() {
    super("HTTP service configuration is invalid.");
    this.name = "HttpServiceConfigurationError";
  }
}

export function createHttpServiceConfiguration(
  input: Partial<HttpServiceConfiguration> = {},
): Readonly<HttpServiceConfiguration> {
  const value = { ...DEFAULT_HTTP_SERVICE_CONFIGURATION, ...input };
  const positive = Object.values(value).every(
    (item) => Number.isSafeInteger(item) && item > 0,
  );
  if (
    !positive ||
    value.maxRequestBytes < 1_024 ||
    value.maxRequestBytes > 8 * 1024 * 1024 ||
    value.httpHeadersTimeoutMs < 1_000 ||
    value.httpHeadersTimeoutMs > 60_000 ||
    value.httpRequestBodyTimeoutMs < 1_000 ||
    value.httpRequestBodyTimeoutMs > 120_000 ||
    value.requestDeadlineMs < value.httpRequestBodyTimeoutMs ||
    value.httpRequestBodyTimeoutMs < value.httpHeadersTimeoutMs ||
    value.httpHeadersTimeoutMs < value.httpConnectionsCheckingIntervalMs ||
    value.shutdownGraceMs < 1_000 ||
    value.shutdownGraceMs > 120_000 ||
    value.compileTimeoutMs >= value.requestDeadlineMs
  )
    throw new HttpServiceConfigurationError();
  return Object.freeze(value);
}
