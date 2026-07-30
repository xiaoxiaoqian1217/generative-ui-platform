import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { createCopilotNodeHandler } from "@copilotkit/runtime/v2/node";
import { createVerificationAgent } from "./agents/verification-agent.js";
import type { RuntimeHostConfig } from "./config.js";

export function isRuntimeRequestPath(
  pathname: string,
  basePath: string,
): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function createAgentRuntimeHost(config: RuntimeHostConfig) {
  const runtime = new CopilotRuntime({
    agents: {
      default: createVerificationAgent(config.model),
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
    fetchHandler,
    nodeHandler: createCopilotNodeHandler(fetchHandler),
  };
}
