import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  copilotRuntimeNodeHttpEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";
import {
  type BusinessAgentAdapter,
  type BusinessAgentInvocationOptions,
  LangGraphHttpBusinessAgentAdapter,
} from "@generative-ui/business-agent-adapter";
import {
  createFixtureModelAdapter,
  createPresentationModelProviderRegistry,
  createPresentationPipeline,
  DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  FIXTURE_COMPONENT_CATALOG,
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
}

export interface RuntimeHostDependencies {
  businessAgentAdapter?: BusinessAgentAdapter;
  presentationPipeline?: PresentationPipeline;
}

function createEmbeddedPresentationPipeline(
  config: RuntimeHostConfig,
): PresentationPipeline {
  const modelAdapter =
    config.presentationModel.mode === "fixture"
      ? createFixtureModelAdapter()
      : createPresentationModelProviderRegistry([
          config.presentationModel.registration,
        ]).resolve(config.presentationModel.registration.registrationId);
  return createPresentationPipeline({
    catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
    modelAdapter,
    createSurfaceId: (request) => `surface-${request.requestId}`,
    ...(config.presentationModel.mode === "fixture"
      ? {}
      : {
          configuration: {
            ...DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
            modelInvocation: config.presentationModel.modelInvocation,
          },
        }),
  });
}

export function createRuntimeHost(
  config: RuntimeHostConfig,
  dependencies: RuntimeHostDependencies = {},
): RuntimeHost {
  const legacyAgUiAgent = new HttpAgent({
    url: config.businessAgentUrl,
  });

  const runtime = new CopilotRuntime({
    agents: {
      [config.agentId]: legacyAgUiAgent,
      default: legacyAgUiAgent,
    },
  });

  const serviceAdapter = new ExperimentalEmptyAdapter();
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: config.endpoint,
    runtime,
    serviceAdapter,
  }) as RequestHandler;
  const presentationPipeline =
    dependencies.presentationPipeline ??
    createEmbeddedPresentationPipeline(config);
  const businessAgentAdapter =
    dependencies.businessAgentAdapter ??
    new LangGraphHttpBusinessAgentAdapter({
      baseUrl: config.businessAgentContractUrl,
    });

  return {
    handler,
    presentationPipeline,
    runBusinessAgent: (request, options) =>
      businessAgentAdapter.run(request, options),
    resumeBusinessAgentAction: (request, options) =>
      businessAgentAdapter.resumeAction(request, options),
    runtime,
  };
}
