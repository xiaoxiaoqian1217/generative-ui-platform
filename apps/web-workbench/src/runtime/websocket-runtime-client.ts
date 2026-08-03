import {
  type RuntimeRunRequest,
  type RuntimeRunResult,
  type RuntimeActionRequest,
  type RuntimeActionResult,
  validateRuntimeActionRequest,
  validateRuntimeRunRequest,
  validateRuntimeWebSocketInboundMessage,
  validateRuntimeWebSocketOutboundMessage,
} from "@generative-ui/runtime-contract";
import {
  type ConnectionState,
  type RuntimeTransportClient,
  WorkbenchRuntimeError,
} from "./types.js";

interface PendingRequest {
  reject: (error: WorkbenchRuntimeError) => void;
  resolve: (result: RuntimeRunResult | RuntimeActionResult) => void;
}

export interface WebSocketRuntimeClientOptions {
  endpoint: string;
  onConnectionStateChange?: (state: ConnectionState) => void;
  reconnectDelayMs?: number;
  socketFactory?: (url: string) => WebSocket;
  timeoutMs?: number;
}

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;

function responseInvalid(path?: string): WorkbenchRuntimeError {
  return new WorkbenchRuntimeError(
    "WORKBENCH_RESPONSE_INVALID",
    "Runtime Host 返回了无效 WebSocket 消息。",
    { ...(path === undefined ? {} : { path }), retryable: false },
  );
}

export function createWebSocketRuntimeClient(
  options: WebSocketRuntimeClientOptions,
): RuntimeTransportClient {
  const socketFactory = options.socketFactory ?? ((url) => new WebSocket(url));
  const pending = new Map<string, PendingRequest>();
  let disposed = false;
  let reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let socket: WebSocket | undefined;

  const rejectPending = (error: WorkbenchRuntimeError) => {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
  };

  const connect = () => {
    if (
      socket?.readyState === SOCKET_CONNECTING ||
      socket?.readyState === SOCKET_OPEN
    ) {
      return;
    }

    disposed = false;
    options.onConnectionStateChange?.(
      reconnectTimer === undefined ? "connecting" : "reconnecting",
    );
    if (reconnectTimer !== undefined) {
      globalThis.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }

    const connectedSocket = socketFactory(options.endpoint);
    socket = connectedSocket;
    connectedSocket.addEventListener("open", () => {
      if (socket !== connectedSocket) {
        return;
      }
      options.onConnectionStateChange?.("connected");
    });
    connectedSocket.addEventListener("message", (event) => {
      if (socket !== connectedSocket) {
        return;
      }
      if (typeof event.data !== "string") {
        rejectPending(responseInvalid());
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data) as unknown;
      } catch {
        rejectPending(responseInvalid());
        return;
      }

      const inbound = validateRuntimeWebSocketOutboundMessage(parsed);
      if (!inbound.success) {
        rejectPending(responseInvalid(inbound.error.path));
        return;
      }

      if (inbound.value.type === "runtime.run.result") {
        const entry = pending.get(inbound.value.payload.requestId);
        if (entry !== undefined) {
          pending.delete(inbound.value.payload.requestId);
          entry.resolve(inbound.value.payload);
        }
        return;
      }
      if (inbound.value.type === "runtime.action.result") {
        const entry = pending.get(inbound.value.payload.requestId);
        if (entry !== undefined) { pending.delete(inbound.value.payload.requestId); entry.resolve(inbound.value.payload); }
        return;
      }

      if (inbound.value.type === "runtime.error") {
        const error = new WorkbenchRuntimeError(
          "WORKBENCH_RUNTIME_ERROR",
          inbound.value.payload.message,
          {
            ...(inbound.value.payload.path === undefined
              ? {}
              : { path: inbound.value.payload.path }),
            retryable: inbound.value.payload.retryable,
          },
        );
        const requestId = inbound.value.payload.requestId;
        if (requestId !== undefined) {
          const entry = pending.get(requestId);
          pending.delete(requestId);
          entry?.reject(error);
        } else {
          rejectPending(error);
        }
      }
    });
    connectedSocket.addEventListener("close", () => {
      if (socket !== connectedSocket) {
        return;
      }
      socket = undefined;
      if (disposed) {
        options.onConnectionStateChange?.("disconnected");
        return;
      }

      options.onConnectionStateChange?.("reconnecting");
      rejectPending(
        new WorkbenchRuntimeError(
          "WORKBENCH_RUNTIME_UNAVAILABLE",
          "WebSocket 连接已中断。",
          { retryable: true },
        ),
      );
      reconnectTimer = globalThis.setTimeout(
        connect,
        options.reconnectDelayMs ?? 750,
      );
    });
    connectedSocket.addEventListener("error", () => {
      if (socket !== connectedSocket) {
        return;
      }
      options.onConnectionStateChange?.("unavailable");
    });
  };

  return {
    close() {
      disposed = true;
      if (reconnectTimer !== undefined) {
        globalThis.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      rejectPending(
        new WorkbenchRuntimeError(
          "WORKBENCH_REQUEST_CANCELLED",
          "WebSocket 请求已取消。",
          { retryable: false },
        ),
      );
      socket?.close(1000, "Workbench transport changed");
      socket = undefined;
    },
    connect,
    run(request: RuntimeRunRequest, signal?: AbortSignal) {
      const validatedRequest = validateRuntimeRunRequest(request);
      if (!validatedRequest.success) {
        return Promise.reject(
          new WorkbenchRuntimeError(
            "WORKBENCH_REQUEST_INVALID",
            "请求未通过 Runtime Contract 校验。",
            { path: validatedRequest.error.path, retryable: false },
          ),
        );
      }
      if (socket?.readyState !== SOCKET_OPEN) {
        return Promise.reject(
          new WorkbenchRuntimeError(
            "WORKBENCH_RUNTIME_UNAVAILABLE",
            "WebSocket 尚未连接。",
            { retryable: true },
          ),
        );
      }

      const envelope = {
        type: "runtime.run.request",
        payload: validatedRequest.value,
      } as const;
      const validatedEnvelope =
        validateRuntimeWebSocketInboundMessage(envelope);
      if (!validatedEnvelope.success) {
        return Promise.reject(
          new WorkbenchRuntimeError(
            "WORKBENCH_REQUEST_INVALID",
            "WebSocket 请求未通过 Runtime Contract 校验。",
            { path: validatedEnvelope.error.path, retryable: false },
          ),
        );
      }

      if (signal?.aborted) {
        return Promise.reject(
          new WorkbenchRuntimeError(
            "WORKBENCH_REQUEST_CANCELLED",
            "请求已取消。",
            { retryable: false },
          ),
        );
      }

      if (pending.has(request.requestId)) {
        return Promise.reject(
          new WorkbenchRuntimeError(
            "WORKBENCH_REQUEST_INVALID",
            "requestId 已存在待处理请求。",
            { retryable: false },
          ),
        );
      }

      return new Promise<RuntimeRunResult>((resolve, reject) => {
        const timeout = globalThis.setTimeout(() => {
          pending
            .get(request.requestId)
            ?.reject(
              new WorkbenchRuntimeError(
                "WORKBENCH_REQUEST_TIMEOUT",
                "WebSocket 请求超时。",
                { retryable: true },
              ),
            );
        }, options.timeoutMs ?? 30_000);
        const cleanup = () => {
          globalThis.clearTimeout(timeout);
          signal?.removeEventListener("abort", cancel);
          pending.delete(request.requestId);
        };
        const cancel = () => {
          pending
            .get(request.requestId)
            ?.reject(
              new WorkbenchRuntimeError(
                "WORKBENCH_REQUEST_CANCELLED",
                "请求已取消。",
                { retryable: false },
              ),
            );
        };
        signal?.addEventListener("abort", cancel, { once: true });
        pending.set(request.requestId, {
          reject: (error) => {
            cleanup();
            reject(error);
          },
          resolve: (result) => {
            cleanup();
            resolve(result);
          },
        });
        socket?.send(JSON.stringify(validatedEnvelope.value));
      });
    },
    action(request: RuntimeActionRequest, signal?: AbortSignal) {
      const validatedRequest = validateRuntimeActionRequest(request);
      if (!validatedRequest.success || socket?.readyState !== SOCKET_OPEN) return Promise.reject(new WorkbenchRuntimeError("WORKBENCH_REQUEST_INVALID", "Action request cannot be sent.", { ...(validatedRequest.success ? {} : { path: validatedRequest.error.path }), retryable: false }));
      const envelope = { type: "runtime.action.request", payload: validatedRequest.value } as const;
      const validatedEnvelope = validateRuntimeWebSocketInboundMessage(envelope);
      if (!validatedEnvelope.success) return Promise.reject(responseInvalid(validatedEnvelope.error.path));
      return new Promise<RuntimeActionResult>((resolve, reject) => {
        const timeout = globalThis.setTimeout(() => pending.get(request.requestId)?.reject(new WorkbenchRuntimeError("WORKBENCH_REQUEST_TIMEOUT", "WebSocket Action request timed out.", { retryable: true })), options.timeoutMs ?? 30_000);
        const cleanup = () => { globalThis.clearTimeout(timeout); signal?.removeEventListener("abort", cancel); pending.delete(request.requestId); };
        const cancel = () => pending.get(request.requestId)?.reject(new WorkbenchRuntimeError("WORKBENCH_REQUEST_CANCELLED", "Action request was cancelled.", { retryable: false }));
        if (signal?.aborted || pending.has(request.requestId)) { reject(new WorkbenchRuntimeError("WORKBENCH_REQUEST_INVALID", "Action request cannot be queued.", { retryable: false })); return; }
        signal?.addEventListener("abort", cancel, { once: true });
        pending.set(request.requestId, { reject: (value) => { cleanup(); reject(value); }, resolve: (value) => { cleanup(); resolve(value as RuntimeActionResult); } });
        socket?.send(JSON.stringify(validatedEnvelope.value));
      });
    },
  };
}
