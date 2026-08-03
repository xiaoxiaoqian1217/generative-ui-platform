import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  copilotRuntimeNodeHttpEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";
import {
  createFixtureModelAdapter,
  createPresentationModelProviderRegistry,
  createPresentationPipeline,
  DEFAULT_PRESENTATION_PIPELINE_CONFIGURATION,
  FIXTURE_COMPONENT_CATALOG,
  type PresentationPipeline,
} from "@generative-ui/presentation-pipeline";
import type { RequestHandler } from "express";
import type { RuntimeHostConfig } from "./config.js";

export interface RuntimeHost {
  handler: RequestHandler;
  presentationPipeline: PresentationPipeline;
  runtime: CopilotRuntime;
}

export interface RuntimeHostDependencies {
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
  const businessAgent = new HttpAgent({
    url: config.businessAgentUrl,
  });

  const runtime = new CopilotRuntime({
    agents: {
      [config.agentId]: businessAgent,
      default: businessAgent,
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

  return { handler, presentationPipeline, runtime };
}
