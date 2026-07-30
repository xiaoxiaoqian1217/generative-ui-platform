import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";
import type { RequestHandler } from "express";
import type { RuntimeHostConfig } from "./config.js";

export interface RuntimeHost {
  handler: RequestHandler;
  runtime: CopilotRuntime;
}

export function createRuntimeHost(config: RuntimeHostConfig): RuntimeHost {
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

  return { handler, runtime };
}
