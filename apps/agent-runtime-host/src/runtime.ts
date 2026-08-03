import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  copilotRuntimeNodeHttpEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";
import {
  createFixtureModelAdapter,
  createPresentationPipeline,
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

function createEmbeddedPresentationPipeline(): PresentationPipeline {
  return createPresentationPipeline({
    catalogRepository: { load: () => FIXTURE_COMPONENT_CATALOG },
    modelAdapter: createFixtureModelAdapter(),
    createSurfaceId: (request) => `surface-${request.requestId}`,
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
    dependencies.presentationPipeline ?? createEmbeddedPresentationPipeline();

  return { handler, presentationPipeline, runtime };
}
