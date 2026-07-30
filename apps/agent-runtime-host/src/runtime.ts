import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { createCopilotNodeHandler } from "@copilotkit/runtime/v2/node";
import { createDefaultAgent } from "./agents/default-agent.js";
import type { RuntimeHostConfig } from "./config.js";

export function createAgentRuntimeHost(config: RuntimeHostConfig) {
  const runtime = new CopilotRuntime({
    agents: {
      default: createDefaultAgent(config.model),
    },
    // 不启用 CopilotKit 自动 A2UI 生成。
    // 后续由 UI Compiler 生成并校验 A2UI，再通过 Runtime Host 转发。
  });

  const fetchHandler = createCopilotRuntimeHandler({
    runtime,
    basePath: config.basePath,
    cors: config.cors,
  });

  return {
    runtime,
    nodeHandler: createCopilotNodeHandler(fetchHandler),
  };
}
