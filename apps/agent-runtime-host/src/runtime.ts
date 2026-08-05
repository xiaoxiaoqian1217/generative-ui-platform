import { randomUUID } from "node:crypto";
import {
  CopilotRuntime,
  copilotRuntimeNodeHttpEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";
import {
  type BusinessAgentAdapter,
  type BusinessAgentInvocationOptions,
  LangGraphHttpBusinessAgentAdapter,
  LangGraphWebSocketBusinessAgentAdapter,
} from "@generative-ui/business-agent-adapter";
import {
  createPresentationModelProviderRegistry,
  createPresentationPipeline,
  DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  FIXTURE_COMPONENT_CATALOG,
  type PresentationModelProviderRegistry,
  type PresentationPipeline,
} from "@generative-ui/presentation-pipeline";
import type {
  BusinessAgentResumeActionRequest,
  BusinessAgentResumeActionResult,
  BusinessAgentRunRequest,
  BusinessAgentRunResult,
  RuntimeActionResult,
  RuntimeRunResult,
} from "@generative-ui/runtime-contract";
import type { RequestHandler } from "express";
import type { RuntimeHostConfig } from "./config.js";
import { CopilotKitRuntimeAgent } from "./copilotkit-runtime-agent.js";
import { createRunOrchestrator, type RunOrchestrator } from "./orchestrator.js";
import {
  createRuntimeCatalogSummary,
  createRuntimeScenarioSummaries,
  type RuntimeCatalogSummary,
  type RuntimeScenarioSummary,
} from "./runtime-read-contract.js";
import { createSurfaceContextStore } from "./surface-context-store.js";
import {
  createSqliteThreadRepository,
  type ThreadRepository,
} from "./thread-repository.js";

export interface RuntimeHost {
  handler: RequestHandler;
  presentationPipeline: PresentationPipeline;
  runBusinessAgent(
    request: BusinessAgentRunRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentRunResult>;
  resumeBusinessAgentAction(
    request: BusinessAgentResumeActionRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentResumeActionResult>;
  runtime: CopilotRuntime;
  orchestrator: RunOrchestrator;
  catalogSummary: RuntimeCatalogSummary;
  scenarios: readonly RuntimeScenarioSummary[];
  threadRepository: ThreadRepository;
  deleteThread(threadId: string): Promise<"completed" | "partial" | "failed">;
  clearThreads(): Promise<{
    completed: number;
    partial: number;
    failed: number;
  }>;
  run(input: unknown, signal?: AbortSignal): Promise<RuntimeRunResult>;
  action(input: unknown, signal?: AbortSignal): Promise<RuntimeActionResult>;
}

export interface RuntimeHostDependencies {
  businessAgentAdapter?: BusinessAgentAdapter;
  presentationPipeline?: PresentationPipeline;
  presentationModelProviderRegistry?: PresentationModelProviderRegistry;
}

function createEmbeddedPresentationPipeline(
  config: RuntimeHostConfig,
  providerRegistry?: PresentationModelProviderRegistry,
): PresentationPipeline {
  const modelAdapter = (
    providerRegistry ??
    createPresentationModelProviderRegistry([
      config.presentationModel.registration,
    ])
  ).resolve(config.presentationModel.registration.registrationId);
  return createPresentationPipeline({
    catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
    modelAdapter,
    createSurfaceId: (request) => `surface-${request.requestId}`,
    configuration: {
      ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
      modelInvocation: config.presentationModel.modelInvocation,
    },
  });
}

export function createRuntimeHost(
  config: RuntimeHostConfig,
  dependencies: RuntimeHostDependencies = {},
): RuntimeHost {
  const threadRepository = createSqliteThreadRepository(
    config.threadDatabasePath ??
      (process.env.VITEST === "true"
        ? ":memory:"
        : ".platform/runtime-threads.sqlite"),
  );
  // Retention is enforced before the host accepts debug traffic.
  threadRepository.cleanup();
  const presentationPipeline =
    dependencies.presentationPipeline ??
    createEmbeddedPresentationPipeline(
      config,
      dependencies.presentationModelProviderRegistry,
    );
  const businessAgentAdapter: BusinessAgentAdapter =
    dependencies.businessAgentAdapter ??
    (config.businessAgentTransport === "websocket"
      ? new LangGraphWebSocketBusinessAgentAdapter({
          url: config.businessAgentContractUrl.replace(/^http/u, "ws"),
        })
      : new LangGraphHttpBusinessAgentAdapter({
          baseUrl: config.businessAgentContractUrl,
        }));
  const orchestrator = createRunOrchestrator({
    businessAgentAdapter,
    presentationPipeline,
    surfaceContextStore: createSurfaceContextStore(),
    configuration: {
      ...(config.runtime ?? { totalTimeoutMs: 15_000, maxConcurrentRuns: 16 }),
      catalog: { catalogId: "fixture", catalogVersion: "1.0.0" },
      catalogDefinition: FIXTURE_COMPONENT_CATALOG,
      agentId: config.agentId,
      modelProvider: config.presentationModel.registration.provider,
      modelName: config.presentationModel.registration.modelName,
    },
  });
  const run = async (
    input: unknown,
    signal?: AbortSignal,
  ): Promise<RuntimeRunResult> => {
    if (typeof input !== "object" || input === null)
      return orchestrator.run(input, signal);
    const candidate = input as Record<string, unknown>;
    if (
      typeof candidate.requestId !== "string" ||
      typeof candidate.message !== "object" ||
      candidate.message === null ||
      typeof (candidate.message as Record<string, unknown>).content !== "string"
    )
      return orchestrator.run(input, signal);
    const threadId =
      typeof candidate.threadId === "string"
        ? candidate.threadId
        : threadRepository.create().threadId;
    const runId =
      typeof candidate.runId === "string" ? candidate.runId : randomUUID();
    const body = { ...candidate, threadId, runId };
    let turn: ReturnType<ThreadRepository["beginTurn"]> | undefined;
    try {
      turn = threadRepository.beginTurn({
        threadId,
        runId,
        requestId: candidate.requestId,
        userMessage: (candidate.message as Record<string, unknown>)
          .content as string,
      });
    } catch (caught) {
      const code =
        caught instanceof Error && caught.message === "DUPLICATE_REQUEST"
          ? "REQUEST_INVALID"
          : "HISTORY_RESOURCE_LIMIT";
      return {
        protocolVersion: "1.0",
        requestId: candidate.requestId,
        threadId,
        runId,
        status: "failed",
        error: {
          code,
          message:
            code === "REQUEST_INVALID"
              ? "A duplicate debug request was rejected."
              : "Debug history capacity is exhausted.",
          retryable: false,
        },
      };
    }
    const result = await orchestrator.run(body, signal);
    try {
      if (result.status === "failed") {
        threadRepository.finishTurn({
          turnId: turn.turnId,
          status:
            result.error.code === "REQUEST_CANCELLED" ? "cancelled" : "failed",
          errorCode: result.error.code,
        });
      } else {
        threadRepository.finishTurn({
          turnId: turn.turnId,
          status: "completed",
          snapshot: {
            contractVersion: "1.0",
            catalogId: "fixture",
            catalogVersion: "1.0.0",
            compilerVersion: "1.0.0",
            presentation: result.presentation,
          },
        });
      }
    } catch {
      // The business result remains valid, but the persisted turn is made diagnosable.
      try {
        threadRepository.finishTurn({
          turnId: turn.turnId,
          status: "history-write-failed",
          errorCode: "HISTORY_WRITE_FAILED",
        });
      } catch {
        /* A failed database cannot be repaired in-process. */
      }
      return result.status === "completed"
        ? { ...result, status: "degraded" }
        : result;
    }
    return result;
  };
  const action = async (
    input: unknown,
    signal?: AbortSignal,
  ): Promise<RuntimeActionResult> => {
    const result = await orchestrator.action(input, signal);
    if (result.status !== "failed")
      try {
        threadRepository.updateRunSnapshot(result.threadId, result.runId, {
          contractVersion: "1.0",
          catalogId: "fixture",
          catalogVersion: "1.0.0",
          compilerVersion: "1.0.0",
          presentation: result.presentation,
        });
      } catch {
        /* preserve valid Action result */
      }
    return result;
  };
  const copilotKitAgent = new CopilotKitRuntimeAgent({ run }, config.agentId);
  const runtime = new CopilotRuntime({
    agents: { [config.agentId]: copilotKitAgent, default: copilotKitAgent },
  });
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: config.endpoint,
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
  }) as RequestHandler;

  return {
    handler,
    presentationPipeline,
    runBusinessAgent: (request, options) =>
      businessAgentAdapter.run(request, options),
    resumeBusinessAgentAction: (request, options) =>
      businessAgentAdapter.resumeAction(request, options),
    runtime,
    orchestrator,
    catalogSummary: createRuntimeCatalogSummary(FIXTURE_COMPONENT_CATALOG),
    scenarios: createRuntimeScenarioSummaries(),
    threadRepository,
    run,
    action,
    async deleteThread(threadId) {
      let checkpointDeleted = false;
      try {
        if (businessAgentAdapter.deleteThread === undefined) return "failed";
        await businessAgentAdapter.deleteThread(threadId);
        checkpointDeleted = true;
        return threadRepository.delete(threadId) ? "completed" : "partial";
      } catch {
        return checkpointDeleted ? "partial" : "failed";
      }
    },
    async clearThreads() {
      const threads = [];
      let cursor: string | undefined;
      do {
        const page = threadRepository.list(cursor, 100);
        threads.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor !== undefined);
      const totals = { completed: 0, partial: 0, failed: 0 };
      for (const thread of threads)
        totals[await this.deleteThread(thread.threadId)] += 1;
      return totals;
    },
  };
}
