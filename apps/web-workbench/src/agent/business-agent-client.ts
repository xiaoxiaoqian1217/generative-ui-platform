import type { UserMessage } from "@ag-ui/core";
import {
  type CopilotKitCore,
  CopilotKitCoreRuntimeConnectionStatus,
} from "@copilotkit/core";
import type { RunAgentResult } from "@copilotkit/vue/v2";

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
  | "WORKBENCH_RESPONSE_INVALID";

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
  readonly message: UserMessage & { readonly content: string };
  readonly runId: string;
  readonly threadId: string;
}

export interface AgentTransportClient {
  close(): void;
  connect(): void;
  run(input: AgentRunInput, signal?: AbortSignal): Promise<RunAgentResult>;
}

type CopilotKitAgent = NonNullable<ReturnType<CopilotKitCore["getAgent"]>>;

export interface BusinessAgentClientOptions {
  readonly agentId?: string;
  readonly onConnectionStateChange?: (state: ConnectionState) => void;
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
    },
    connect() {
      if (providerCore !== undefined) connectProviderCore(providerCore);
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
      const baseAgent = await resolveAgent(core, agentId, timeoutMs);
      const agent = agentForThread(core, baseAgent, input.threadId);
      agent.addMessage(input.message);

      return new Promise<RunAgentResult>((resolve, reject) => {
        let settled = false;
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          globalThis.clearTimeout(timeout);
          callerSignal?.removeEventListener("abort", cancel);
          activeAbort = undefined;
          callback();
        };
        const cancel = () => {
          core.stopAgent({ agent });
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
          .runAgent({ agent, runId: input.runId })
          .then((result) => {
            finish(() => {
              const hasAssistantResponse = result.newMessages.some(
                (message) =>
                  message.role === "assistant" &&
                  typeof message.content === "string" &&
                  message.content.length > 0,
              );
              if (!hasAssistantResponse) {
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
              resolve(result);
            });
          })
          .catch(() => {
            options.onConnectionStateChange?.("unavailable");
            finish(() =>
              reject(
                new WorkbenchAgentError(
                  "WORKBENCH_AGENT_UNAVAILABLE",
                  "Unable to connect to the Business Agent.",
                  { retryable: true },
                ),
              ),
            );
          });
      });
    },
  };
}
