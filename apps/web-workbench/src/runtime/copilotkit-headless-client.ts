import { CopilotKitCore } from "@copilotkit/core";
import {
  type PresentationResult,
  validatePresentationResult,
} from "@generative-ui/presentation-contract";
import type {
  RuntimeActionRequest,
  RuntimeActionResult,
  RuntimeRunRequest,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";
import { validateRuntimeRunResult } from "@generative-ui/runtime-contract";
import { createHttpRuntimeClient } from "./http-runtime-client.js";
import {
  type ConnectionState,
  type RuntimeTransportClient,
  WorkbenchRuntimeError,
} from "./types.js";

interface CopilotKitCustomEvent {
  readonly type: "CUSTOM";
  readonly name: string;
  readonly value: unknown;
}

export interface CopilotKitHeadlessClientOptions {
  readonly actionEndpoint: string;
  readonly agentId?: string;
  readonly onConnectionStateChange?: (state: ConnectionState) => void;
  readonly runtimeUrl: string;
  readonly timeoutMs?: number;
}

function createId(prefix: string): string {
  return (
    globalThis.crypto.randomUUID?.() ??
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function isPresentationResultEvent(
  event: unknown,
): event is CopilotKitCustomEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as { type?: unknown }).type === "CUSTOM" &&
    (event as { name?: unknown }).name === "generative-ui.presentation-result"
  );
}

export function presentationResultFromCopilotKitEvent(
  event: unknown,
): PresentationResult | undefined {
  if (!isPresentationResultEvent(event)) return undefined;
  const value = event.value;
  if (typeof value !== "object" || value === null) return undefined;
  const result = (value as { result?: unknown }).result;
  const validated = validatePresentationResult(result);
  return validated.success && validated.value.status !== "failed"
    ? validated.value
    : undefined;
}

export function runtimeResultFromCopilotKitEvent(
  event: unknown,
): RuntimeRunResult | undefined {
  if (
    !isPresentationResultEvent(event) &&
    !(
      typeof event === "object" &&
      event !== null &&
      (event as { type?: unknown }).type === "CUSTOM" &&
      (event as { name?: unknown }).name === "generative-ui.runtime-run-result"
    )
  )
    return undefined;
  const value = (event as CopilotKitCustomEvent).value;
  if (typeof value !== "object" || value === null) return undefined;
  const validated = validateRuntimeRunResult(
    (value as { result?: unknown }).result,
  );
  return validated.success ? validated.value : undefined;
}

function runResultFromPresentation(
  request: RuntimeRunRequest,
  threadId: string,
  runId: string,
  presentation: PresentationResult,
): RuntimeRunResult {
  if (presentation.status === "failed") {
    throw new WorkbenchRuntimeError(
      "WORKBENCH_RESPONSE_INVALID",
      "CopilotKit Headless 返回了不可消费的展示结果。",
      { retryable: false },
    );
  }
  return {
    protocolVersion: request.protocolVersion,
    requestId: request.requestId,
    threadId,
    runId,
    presentationRequestId: presentation.requestId,
    status: presentation.status === "degraded" ? "degraded" : "completed",
    presentation,
  };
}

async function resolveAgent(
  core: CopilotKitCore,
  agentId: string,
  timeoutMs: number,
): Promise<NonNullable<ReturnType<CopilotKitCore["getAgent"]>>> {
  const initial = core.getAgent(agentId);
  if (initial !== undefined) return initial;

  return new Promise<NonNullable<ReturnType<CopilotKitCore["getAgent"]>>>(
    (resolve, reject) => {
      const timeout = globalThis.setTimeout(() => {
        subscription.unsubscribe();
        reject(
          new WorkbenchRuntimeError(
            "WORKBENCH_RUNTIME_UNAVAILABLE",
            "CopilotKit Headless 未发现 Runtime Host Agent。",
            { retryable: true },
          ),
        );
      }, timeoutMs);
      const subscription = core.subscribe({
        onAgentsChanged: ({ agents }) => {
          const agent = agents[agentId];
          if (agent === undefined) return;
          globalThis.clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(agent);
        },
      });
      core.connect();
    },
  );
}

export function createCopilotKitHeadlessClient(
  options: CopilotKitHeadlessClientOptions,
): RuntimeTransportClient {
  const core = new CopilotKitCore({
    deferInitialConnection: true,
    runtimeUrl: options.runtimeUrl,
  });
  const actionClient = createHttpRuntimeClient({
    actionEndpoint: options.actionEndpoint,
    endpoint: options.actionEndpoint.replace(/\/actions$/u, "/runs"),
    ...(options.onConnectionStateChange === undefined
      ? {}
      : { onConnectionStateChange: options.onConnectionStateChange }),
    ...(options.timeoutMs === undefined
      ? {}
      : { timeoutMs: options.timeoutMs }),
  });
  const agentId = options.agentId ?? "default";
  const timeoutMs = options.timeoutMs ?? 30_000;
  let activeAbort: (() => void) | undefined;

  return {
    close() {
      activeAbort?.();
      activeAbort = undefined;
      actionClient.close();
    },
    connect() {
      core.connect();
    },
    action(
      request: RuntimeActionRequest,
      signal?: AbortSignal,
    ): Promise<RuntimeActionResult> {
      return actionClient.action(request, signal);
    },
    async run(
      request: RuntimeRunRequest,
      callerSignal?: AbortSignal,
    ): Promise<RuntimeRunResult> {
      const threadId = request.threadId ?? createId("thread");
      const runId = request.runId ?? createId("run");
      const agent = await resolveAgent(core, agentId, timeoutMs);
      return new Promise<RuntimeRunResult>((resolve, reject) => {
        let presentation: PresentationResult | undefined;
        let runtimeResult: RuntimeRunResult | undefined;
        let settled = false;
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          callerSignal?.removeEventListener("abort", cancel);
          activeAbort = undefined;
          callback();
        };
        const cancel = () => {
          subscription.unsubscribe();
          finish(() =>
            reject(
              new WorkbenchRuntimeError(
                "WORKBENCH_REQUEST_CANCELLED",
                "CopilotKit Headless 请求已取消。",
                { retryable: false },
              ),
            ),
          );
        };
        const timeout = globalThis.setTimeout(() => {
          subscription.unsubscribe();
          finish(() =>
            reject(
              new WorkbenchRuntimeError(
                "WORKBENCH_REQUEST_TIMEOUT",
                "CopilotKit Headless 请求超时。",
                { retryable: true },
              ),
            ),
          );
        }, timeoutMs);
        const subscription = agent
          .run({
            context: [],
            messages: [
              {
                id: createId("message"),
                role: "user",
                content: request.message.content,
              },
            ],
            runId,
            state: {},
            threadId,
            tools: [],
          })
          .subscribe({
            complete: () => {
              globalThis.clearTimeout(timeout);
              finish(() => {
                if (runtimeResult !== undefined) {
                  options.onConnectionStateChange?.("connected");
                  resolve(runtimeResult);
                  return;
                }
                if (presentation === undefined) {
                  reject(
                    new WorkbenchRuntimeError(
                      "WORKBENCH_RESPONSE_INVALID",
                      "CopilotKit Headless 未返回 PresentationResult。",
                      { retryable: false },
                    ),
                  );
                  return;
                }
                options.onConnectionStateChange?.("connected");
                resolve(
                  runResultFromPresentation(
                    request,
                    threadId,
                    runId,
                    presentation,
                  ),
                );
              });
            },
            error: () => {
              globalThis.clearTimeout(timeout);
              finish(() =>
                reject(
                  new WorkbenchRuntimeError(
                    "WORKBENCH_RUNTIME_UNAVAILABLE",
                    "CopilotKit Headless 无法连接 Runtime Host。",
                    { retryable: true },
                  ),
                ),
              );
            },
            next: (event) => {
              const nextPresentation =
                presentationResultFromCopilotKitEvent(event);
              if (nextPresentation !== undefined)
                presentation = nextPresentation;
              const nextRuntimeResult = runtimeResultFromCopilotKitEvent(event);
              if (nextRuntimeResult !== undefined)
                runtimeResult = nextRuntimeResult;
            },
          });
        callerSignal?.addEventListener("abort", cancel, { once: true });
        activeAbort = cancel;
      });
    },
  };
}
