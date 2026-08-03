import type {
  RuntimeRunRequest,
  RuntimeRunResult,
  RuntimeActionRequest,
  RuntimeActionResult,
} from "@generative-ui/runtime-contract";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "unavailable";

export type WorkbenchRuntimeErrorCode =
  | "WORKBENCH_REQUEST_CANCELLED"
  | "WORKBENCH_REQUEST_INVALID"
  | "WORKBENCH_REQUEST_TIMEOUT"
  | "WORKBENCH_RESPONSE_INVALID"
  | "WORKBENCH_RUNTIME_ERROR"
  | "WORKBENCH_RUNTIME_UNAVAILABLE";

export class WorkbenchRuntimeError extends Error {
  readonly code: WorkbenchRuntimeErrorCode;
  readonly path?: string;
  readonly retryable: boolean;

  constructor(
    code: WorkbenchRuntimeErrorCode,
    message: string,
    options: { path?: string; retryable: boolean },
  ) {
    super(message);
    this.name = "WorkbenchRuntimeError";
    this.code = code;
    this.retryable = options.retryable;
    if (options.path !== undefined) {
      this.path = options.path;
    }
  }
}

export interface RuntimeTransportClient {
  close(): void;
  connect(): void;
  run(
    request: RuntimeRunRequest,
    signal?: AbortSignal,
  ): Promise<RuntimeRunResult>;
  action(request: RuntimeActionRequest, signal?: AbortSignal): Promise<RuntimeActionResult>;
}
