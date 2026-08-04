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
  const presentationPipeline =
    dependencies.presentationPipeline ??
    createEmbeddedPresentationPipeline(
      config,
      dependencies.presentationModelProviderRegistry,
    );
  const businessAgentAdapter =
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
  const copilotKitAgent = new CopilotKitRuntimeAgent(
    orchestrator,
    config.agentId,
  );
  const runtime = new CopilotRuntime({
    agents: {
      [config.agentId]: copilotKitAgent,
      default: copilotKitAgent,
    },
  });
  const serviceAdapter = new ExperimentalEmptyAdapter();
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: config.endpoint,
    runtime,
    serviceAdapter,
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
  };
}
