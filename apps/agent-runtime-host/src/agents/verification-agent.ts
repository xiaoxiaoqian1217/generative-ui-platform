import { BuiltInAgent } from "@copilotkit/runtime/v2";

/**
 * 仅用于验证 CopilotKit Runtime、AG-UI 通信和前端 Headless 接入。
 * 正式业务接入时，应由远程业务 Agent 或自定义 Agent Adapter 替换。
 */
export function createVerificationAgent(model: string): BuiltInAgent {
  return new BuiltInAgent({
    model,
    prompt: [
      "你是 Generative UI Platform 的运行时验证助手。",
      "当前阶段只验证 CopilotKit Runtime、AG-UI 通信和前端 Headless 接入。",
      "不要生成任意前端代码；后续声明式 UI 必须由 UI Compiler 统一生成和校验。",
      "不要承担正式业务处理，也不要模拟尚未接入的业务工具。",
    ].join("\n"),
  });
}
