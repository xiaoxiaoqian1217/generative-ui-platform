import {
  CopilotKitCoreRuntimeConnectionStatus,
  type CopilotKitCore,
} from "@copilotkit/core";
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

type CopilotKitAgent = NonNullable<ReturnType<CopilotKitCore["getAgent"]>>;

export interface CopilotKitHeadlessClientOptions {
  readonly actionEndpoint: string;
  readonly agentId?: string;
  readonly onConnectionStateChange?: (state: ConnectionState) => void;
  readonly runtimeUrl: string;
  readonly timeoutMs?: number;
}

let providerCore: CopilotKitCore | undefined;

export function bindCopilotKitProviderCore(core: CopilotKitCore): () => void {
  providerCore = core;
  return () => {
    if (providerCore === core) providerCore = undefined;
  };
}

function connectProviderCore(core: CopilotKitCore): void {
  if (
    core.runtimeConnectionStatus ===
    CopilotKitCoreRuntimeConnectionStatus.Error
  ) {
    const runtimeUrl = core.runtimeUrl;
    if (runtimeUrl === undefined) return;
    core.setRuntimeUrl(undefined);
    core.setRuntimeUrl(runtimeUrl);
    return;
  }
  core.connect();
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
      "CopilotKit 返回了不可消费的展示结果。",
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

function requireProviderCore(): CopilotKitCore {
  if (providerCore !== undefined) return providerCore;
  throw new WorkbenchRuntimeError(
    "WORKBENCH_RUNTIME_UNAVAILABLE",
    "CopilotKit Provider 尚未就绪。",
    { retryable: true },
  );
}

async function resolveAgent(
  core: CopilotKitCore,
  agentId: string,
  timeoutMs: number,
): Promise<CopilotKitAgent> {
  const initial = core.getAgent(agentId);
  if (initial !== undefined) return initial;

  return new Promise<CopilotKitAgent>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      subscription.unsubscribe();
      reject(
        new WorkbenchRuntimeError(
          "WORKBENCH_RUNTIME_UNAVAILABLE",
          "CopilotKit Provider 未发现 Runtime Host Agent。",
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
    connectProviderCore(core);
  });
}

export function createCopilotKitHeadlessClient(
  options: CopilotKitHeadlessClientOptions,
): RuntimeTransportClient {
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
  const threadAgents = new Map<string, CopilotKitAgent>();
  let boundCore: CopilotKitCore | undefined;
  let activeAbort: (() => void) | undefined;

  function agentForThread(
    core: CopilotKitCore,
    baseAgent: CopilotKitAgent,
    threadId: string,
  ) {
    if (boundCore !== core) {
      threadAgents.clear();
      boundCore = core;
    }
    const existing = threadAgents.get(threadId);
    if (existing !== undefined) return existing;
    const agent = baseAgent.clone() as CopilotKitAgent;
    agent.threadId = threadId;
    threadAgents.set(threadId, agent);
    return agent;
  }

  return {
    close() {
      activeAbort?.();
      activeAbort = undefined;
      threadAgents.clear();
      actionClient.close();
    },
    connect() {
      if (providerCore !== undefined) connectProviderCore(providerCore);
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
      if (callerSignal?.aborted === true) {
        throw new WorkbenchRuntimeError(
          "WORKBENCH_REQUEST_CANCELLED",
          "CopilotKit 请求已取消。",
          { retryable: false },
        );
      }

      const core = requireProviderCore();
      const threadId = request.threadId ?? createId("thread");
      const runId = request.runId ?? createId("run");
      const baseAgent = await resolveAgent(core, agentId, timeoutMs);
      const agent = agentForThread(core, baseAgent, threadId);

      return new Promise<RuntimeRunResult>((resolve, reject) => {
        let presentation: PresentationResult | undefined;
        let runtimeResult: RuntimeRunResult | undefined;
        let runFailed = false;
        let settled = false;

        const subscription = agent.subscribe({
          onCustomEvent: ({ event }) => {
            const nextPresentation =
              presentationResultFromCopilotKitEvent(event);
            if (nextPresentation !== undefined) presentation = nextPresentation;
            const nextRuntimeResult = runtimeResultFromCopilotKitEvent(event);
            if (nextRuntimeResult !== undefined) runtimeResult = nextRuntimeResult;
          },
          onRunFailed: () => {
            runFailed = true;
          },
        });

        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout(timeout);
          callerSignal?.removeEventListener("abort", cancel);
          subscription.unsubscribe();
          activeAbort = undefined;
          callback();
        };
        const cancel = () => {
          core.stopAgent({ agent });
          finish(() =>
            reject(
              new WorkbenchRuntimeError(
                "WORKBENCH_REQUEST_CANCELLED",
                "CopilotKit 请求已取消。",
                { retryable: false },
              ),
            ),
          );
        };
        const timeout = globalThis.setTimeout(() => {
          core.stopAgent({ agent });
          finish(() =>
            reject(
              new WorkbenchRuntimeError(
                "WORKBENCH_REQUEST_TIMEOUT",
                "CopilotKit 请求超时。",
                { retryable: true },
              ),
            ),
          );
        }, timeoutMs);

        callerSignal?.addEventListener("abort", cancel, { once: true });
        activeAbort = cancel;
        agent.addMessage({
          id: createId("message"),
          role: "user",
          content: request.message.content,
        });

        void core
          .runAgent({ agent })
          .then(() => {
            finish(() => {
              if (runtimeResult !== undefined) {
                options.onConnectionStateChange?.("connected");
                resolve(runtimeResult);
                return;
              }
              if (presentation !== undefined) {
                options.onConnectionStateChange?.("connected");
                resolve(
                  runResultFromPresentation(
                    request,
                    threadId,
                    runId,
                    presentation,
                  ),
                );
                return;
              }
              if (runFailed) {
                options.onConnectionStateChange?.("unavailable");
                reject(
                  new WorkbenchRuntimeError(
                    "WORKBENCH_RUNTIME_UNAVAILABLE",
                    "CopilotKit Agent 运行失败。",
                    { retryable: true },
                  ),
                );
                return;
              }
              reject(
                new WorkbenchRuntimeError(
                  "WORKBENCH_RESPONSE_INVALID",
                  "CopilotKit 未返回 PresentationResult。",
                  { retryable: false },
                ),
              );
            });
          })
          .catch(() => {
            options.onConnectionStateChange?.("unavailable");
            finish(() =>
              reject(
                new WorkbenchRuntimeError(
                  "WORKBENCH_RUNTIME_UNAVAILABLE",
                  "CopilotKit 无法连接 Runtime Host。",
                  { retryable: true },
                ),
              ),
            );
          });
      });
    },
  };
}
