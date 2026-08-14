import type { Interrupt, ResumeEntry, UserMessage } from "@ag-ui/core";
import {
  type CopilotKitCore,
  CopilotKitCoreRuntimeConnectionStatus,
} from "@copilotkit/core";
import type { RunAgentResult } from "@copilotkit/vue/v2";
import {
  observationInputFromAgUiEvent,
  type TurnObservationInput,
} from "../inspect/turn-inspection.js";

export type ObservationSink = (input: TurnObservationInput) => void;

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "unavailable";

export type WorkbenchAgentErrorCode =
  | "WORKBENCH_AGENT_UNAVAILABLE"
  | "WORKBENCH_REQUEST_CANCELLED"
  | "WORKBENCH_REQUEST_TIMEOUT"
  | "WORKBENCH_RESPONSE_INVALID"
  | "WORKBENCH_RUN_ERROR";

export class WorkbenchAgentError extends Error {
  readonly code: WorkbenchAgentErrorCode;
  readonly retryable: boolean;

  constructor(
    code: WorkbenchAgentErrorCode,
    message: string,
    options: { retryable: boolean },
  ) {
    super(message);
    this.name = "WorkbenchAgentError";
    this.code = code;
    this.retryable = options.retryable;
  }
}

export interface AgentRunInput {
  readonly message?: UserMessage & { readonly content: string };
  readonly observe?: ObservationSink;
  readonly resume?: readonly ResumeEntry[];
  readonly runId: string;
  readonly threadId: string;
}

export interface AgentTransportClient {
  close(): void;
  connect(): void;
  run(
    input: AgentRunInput,
    signal?: AbortSignal,
  ): Promise<WorkbenchAgentRunResult>;
}

export interface WorkbenchAgentRunResult extends RunAgentResult {
  readonly eventTypes: readonly string[];
  readonly interrupts?: readonly Interrupt[];
  readonly state: unknown;
}

type CopilotKitAgent = NonNullable<ReturnType<CopilotKitCore["getAgent"]>>;

export interface BusinessAgentClientOptions {
  readonly agentId?: string;
  readonly onConnectionStateChange?: (state: ConnectionState) => void;
  readonly timeoutMs?: number;
}

const RETRYABLE_RUN_ERROR_CODES = new Set([
  "INCOMPLETE_STREAM",
  "NETWORK_ERROR",
  "UPSTREAM_UNAVAILABLE",
]);

let providerCore: CopilotKitCore | undefined;

export function bindCopilotKitProviderCore(core: CopilotKitCore): () => void {
  providerCore = core;
  return () => {
    if (providerCore === core) providerCore = undefined;
  };
}

function connectProviderCore(core: CopilotKitCore): void {
  if (
    core.runtimeConnectionStatus === CopilotKitCoreRuntimeConnectionStatus.Error
  ) {
    const runtimeUrl = core.runtimeUrl;
    if (runtimeUrl === undefined) return;
    core.setRuntimeUrl(undefined);
    core.setRuntimeUrl(runtimeUrl);
    return;
  }
  core.connect();
}

function requireProviderCore(): CopilotKitCore {
  if (providerCore !== undefined) return providerCore;
  throw new WorkbenchAgentError(
    "WORKBENCH_AGENT_UNAVAILABLE",
    "CopilotKit Provider is not ready.",
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
        new WorkbenchAgentError(
          "WORKBENCH_AGENT_UNAVAILABLE",
          "CopilotKit Provider did not discover the Business Agent.",
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

export function createBusinessAgentClient(
  options: BusinessAgentClientOptions,
): AgentTransportClient {
  const agentId = options.agentId ?? "default";
  const timeoutMs = options.timeoutMs ?? 30_000;
  const threadAgents = new Map<string, CopilotKitAgent>();
  let boundCore: CopilotKitCore | undefined;
  let activeAbort: (() => void) | undefined;
  let activeObservation:
    | { observe: ObservationSink; runId: string; threadId: string }
    | undefined;
  let coreSubscription: { unsubscribe(): void } | undefined;
  let reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  function connectionStateForRuntime(
    status: CopilotKitCoreRuntimeConnectionStatus,
  ): ConnectionState {
    return status === CopilotKitCoreRuntimeConnectionStatus.Connected
      ? "connected"
      : status === CopilotKitCoreRuntimeConnectionStatus.Connecting
        ? "connecting"
        : status === CopilotKitCoreRuntimeConnectionStatus.Error
          ? "unavailable"
          : "disconnected";
  }

  function observeRuntimeConnection(core: CopilotKitCore): void {
    coreSubscription?.unsubscribe();
    options.onConnectionStateChange?.(
      connectionStateForRuntime(core.runtimeConnectionStatus),
    );
    coreSubscription = core.subscribe({
      onRuntimeConnectionStatusChanged: ({ status }) => {
        const connectionState = connectionStateForRuntime(status);
        options.onConnectionStateChange?.(connectionState);
        // Issue #205：连接状态变化是 Workbench 可真实观察的 Runtime 事实
        // （如 reconnect / unavailable），仅观察，不实现 Recovery Platform。
        const active = activeObservation;
        if (active !== undefined) {
          const failed =
            connectionState === "unavailable" ||
            connectionState === "disconnected";
          active.observe({
            hasArtifact: false,
            payload: { connectionState },
            runId: active.runId,
            source: "copilotkit-runtime",
            ...(failed
              ? { status: "failed" as const }
              : connectionState === "reconnecting"
                ? { status: "reconnecting" as const }
                : {}),
            threadId: active.threadId,
            type: "RUNTIME_CONNECTION_STATE",
          });
        }
        if (status === CopilotKitCoreRuntimeConnectionStatus.Error) {
          globalThis.clearTimeout(reconnectTimer);
          reconnectTimer = globalThis.setTimeout(
            () => connectProviderCore(core),
            1_000,
          );
        }
      },
    });
  }

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
      coreSubscription?.unsubscribe();
      coreSubscription = undefined;
      globalThis.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      threadAgents.clear();
    },
    connect() {
      if (providerCore !== undefined) {
        observeRuntimeConnection(providerCore);
        connectProviderCore(providerCore);
      }
    },
    async run(input, callerSignal) {
      if (callerSignal?.aborted === true) {
        throw new WorkbenchAgentError(
          "WORKBENCH_REQUEST_CANCELLED",
          "The request was cancelled.",
          { retryable: false },
        );
      }

      const core = requireProviderCore();
      if (boundCore !== core) observeRuntimeConnection(core);
      const baseAgent = await resolveAgent(core, agentId, timeoutMs);
      const agent = agentForThread(core, baseAgent, input.threadId);
      if (input.message !== undefined) agent.addMessage(input.message);
      const observe = input.observe;
      activeObservation =
        observe === undefined
          ? undefined
          : { observe, runId: input.runId, threadId: input.threadId };
      observe?.({
        hasArtifact: true,
        ...(input.resume?.[0]?.interruptId === undefined
          ? {}
          : { interruptId: input.resume[0].interruptId }),
        payload: {
          ...(input.message === undefined ? {} : { message: input.message }),
          ...(input.resume === undefined ? {} : { resume: input.resume }),
          runId: input.runId,
          threadId: input.threadId,
        },
        runId: input.runId,
        source: "workbench",
        threadId: input.threadId,
        type: input.resume === undefined ? "RUN_INPUT" : "RESUME_INPUT",
      });
      const startedAt = globalThis.performance.now();
      const eventTypes: string[] = [];
      let runError: { code?: string; message: string } | undefined;
      const eventSubscription = agent.subscribe({
        onEvent: ({ event }) => {
          eventTypes.push(event.type);
          observe?.(
            observationInputFromAgUiEvent(event, {
              runId: input.runId,
              threadId: input.threadId,
            }),
          );
          if (event.type === "RUN_ERROR") {
            runError = {
              ...(typeof event.code === "string" ? { code: event.code } : {}),
              message:
                typeof event.message === "string"
                  ? event.message
                  : "The Business Agent could not complete this run.",
            };
          }
        },
      });

      return new Promise<WorkbenchAgentRunResult>((resolve, reject) => {
        let settled = false;
        const settleObservation = (
          type: string,
          status: "cancelled" | "failed" | "ok",
        ) => {
          observe?.({
            durationMs: Math.round(globalThis.performance.now() - startedAt),
            hasArtifact: false,
            runId: input.runId,
            source: "workbench",
            status,
            threadId: input.threadId,
            type,
          });
        };
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout(timeout);
          callerSignal?.removeEventListener("abort", cancel);
          activeAbort = undefined;
          activeObservation = undefined;
          eventSubscription.unsubscribe();
          callback();
        };
        const cancel = () => {
          core.stopAgent({ agent });
          settleObservation("RUN_CANCELLED", "cancelled");
          finish(() =>
            reject(
              new WorkbenchAgentError(
                "WORKBENCH_REQUEST_CANCELLED",
                "The request was cancelled.",
                { retryable: false },
              ),
            ),
          );
        };
        const timeout = globalThis.setTimeout(() => {
          core.stopAgent({ agent });
          settleObservation("RUN_TIMEOUT", "failed");
          finish(() =>
            reject(
              new WorkbenchAgentError(
                "WORKBENCH_REQUEST_TIMEOUT",
                "The request timed out.",
                { retryable: true },
              ),
            ),
          );
        }, timeoutMs);

        callerSignal?.addEventListener("abort", cancel, { once: true });
        activeAbort = cancel;
        void core
          .runAgent({
            agent,
            runId: input.runId,
            ...(input.resume === undefined
              ? {}
              : { resume: [...input.resume] }),
          })
          .then((result) => {
            finish(() => {
              if (runError !== undefined) {
                const unavailable =
                  runError.code !== undefined &&
                  RETRYABLE_RUN_ERROR_CODES.has(runError.code);
                if (unavailable)
                  options.onConnectionStateChange?.("unavailable");
                settleObservation("RUN_SETTLED", "failed");
                reject(
                  new WorkbenchAgentError(
                    unavailable
                      ? "WORKBENCH_AGENT_UNAVAILABLE"
                      : "WORKBENCH_RUN_ERROR",
                    unavailable
                      ? "Unable to connect to the Business Agent."
                      : "The Business Agent could not complete this run.",
                    { retryable: unavailable },
                  ),
                );
                return;
              }
              const pendingInterrupts = agent.pendingInterrupts ?? [];
              const hasAssistantResponse = result.newMessages.some(
                (message) =>
                  message.role === "assistant" &&
                  typeof message.content === "string" &&
                  message.content.length > 0,
              );
              const hasStructuredResult = result.result !== undefined;
              const hasNativeObservation = eventTypes.some((type) =>
                [
                  "STATE_SNAPSHOT",
                  "STATE_DELTA",
                  "ACTIVITY_SNAPSHOT",
                  "ACTIVITY_DELTA",
                ].includes(type),
              );
              if (
                !hasAssistantResponse &&
                !hasStructuredResult &&
                !hasNativeObservation &&
                pendingInterrupts.length === 0
              ) {
                settleObservation("RUN_SETTLED", "failed");
                reject(
                  new WorkbenchAgentError(
                    "WORKBENCH_RESPONSE_INVALID",
                    "The Business Agent returned no assistant message.",
                    { retryable: false },
                  ),
                );
                return;
              }
              options.onConnectionStateChange?.("connected");
              settleObservation("RUN_SETTLED", "ok");
              resolve({
                ...result,
                eventTypes,
                ...(pendingInterrupts.length === 0
                  ? {}
                  : { interrupts: [...pendingInterrupts] }),
                state: agent.state,
              });
            });
          })
          .catch(() => {
            const retryableRunError =
              runError?.code !== undefined &&
              RETRYABLE_RUN_ERROR_CODES.has(runError.code);
            if (runError === undefined || retryableRunError)
              options.onConnectionStateChange?.("unavailable");
            settleObservation("RUN_SETTLED", "failed");
            finish(() =>
              reject(
                runError === undefined || retryableRunError
                  ? new WorkbenchAgentError(
                      "WORKBENCH_AGENT_UNAVAILABLE",
                      "Unable to connect to the Business Agent.",
                      { retryable: true },
                    )
                  : new WorkbenchAgentError(
                      "WORKBENCH_RUN_ERROR",
                      "The Business Agent could not complete this run.",
                      { retryable: false },
                    ),
              ),
            );
          });
      });
    },
  };
}
