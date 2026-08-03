import {
  type RuntimeRunRequest,
  type RuntimeRunResult,
  type RuntimeActionRequest,
  type RuntimeActionResult,
  validateRuntimeActionRequest,
  validateRuntimeActionResult,
  validateRuntimeRunRequest,
  validateRuntimeRunResult,
} from "@generative-ui/runtime-contract";
import {
  type ConnectionState,
  type RuntimeTransportClient,
  WorkbenchRuntimeError,
} from "./types.js";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface HttpRuntimeClientOptions {
  endpoint: string;
  actionEndpoint?: string;
  fetcher?: Fetcher;
  onConnectionStateChange?: (state: ConnectionState) => void;
  timeoutMs?: number;
}

function createRequestSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): { dispose: () => void; signal: AbortSignal; timedOut: () => boolean } {
  const controller = new AbortController();
  let didTimeOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = globalThis.setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    dispose: () => {
      globalThis.clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
    signal: controller.signal,
    timedOut: () => didTimeOut,
  };
}

export function createHttpRuntimeClient(
  options: HttpRuntimeClientOptions,
): RuntimeTransportClient {
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? 30_000;

  return {
    close() {},
    connect() {},
    async run(
      request: RuntimeRunRequest,
      callerSignal?: AbortSignal,
    ): Promise<RuntimeRunResult> {
      const outbound = validateRuntimeRunRequest(request);
      if (!outbound.success) {
        throw new WorkbenchRuntimeError(
          "WORKBENCH_REQUEST_INVALID",
          "请求未通过 Runtime Contract 校验。",
          { path: outbound.error.path, retryable: false },
        );
      }

      const requestSignal = createRequestSignal(callerSignal, timeoutMs);
      try {
        const response = await fetcher(options.endpoint, {
          body: JSON.stringify(outbound.value),
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          method: "POST",
          signal: requestSignal.signal,
        });
        const body: unknown = await response.json();
        const inbound = validateRuntimeRunResult(body);
        if (!inbound.success) {
          options.onConnectionStateChange?.(
            response.ok ? "connected" : "unavailable",
          );
          throw new WorkbenchRuntimeError(
            "WORKBENCH_RESPONSE_INVALID",
            "Runtime Host 返回了无效响应。",
            { path: inbound.error.path, retryable: response.status >= 500 },
          );
        }

        options.onConnectionStateChange?.("connected");
        return inbound.value;
      } catch (error) {
        if (error instanceof WorkbenchRuntimeError) {
          throw error;
        }
        if (requestSignal.signal.aborted) {
          throw new WorkbenchRuntimeError(
            requestSignal.timedOut()
              ? "WORKBENCH_REQUEST_TIMEOUT"
              : "WORKBENCH_REQUEST_CANCELLED",
            requestSignal.timedOut() ? "请求超时。" : "请求已取消。",
            { retryable: requestSignal.timedOut() },
          );
        }
        options.onConnectionStateChange?.("unavailable");
        throw new WorkbenchRuntimeError(
          "WORKBENCH_RUNTIME_UNAVAILABLE",
          "无法连接 Runtime Host。",
          { retryable: true },
        );
      } finally {
        requestSignal.dispose();
      }
    },
    async action(request: RuntimeActionRequest, callerSignal?: AbortSignal): Promise<RuntimeActionResult> {
      const outbound = validateRuntimeActionRequest(request);
      if (!outbound.success) throw new WorkbenchRuntimeError("WORKBENCH_REQUEST_INVALID", "Action request does not match Runtime Contract.", { path: outbound.error.path, retryable: false });
      const requestSignal = createRequestSignal(callerSignal, timeoutMs);
      try {
        const response = await fetcher(options.actionEndpoint ?? options.endpoint.replace(/\/runs$/, "/actions"), { body: JSON.stringify(outbound.value), headers: { accept: "application/json", "content-type": "application/json" }, method: "POST", signal: requestSignal.signal });
        const inbound = validateRuntimeActionResult(await response.json());
        if (!inbound.success) throw new WorkbenchRuntimeError("WORKBENCH_RESPONSE_INVALID", "Runtime Host returned an invalid Action response.", { path: inbound.error.path, retryable: response.status >= 500 });
        options.onConnectionStateChange?.("connected");
        return inbound.value;
      } finally { requestSignal.dispose(); }
    },
  };
}
