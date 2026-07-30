import { BuiltInAgent } from "@copilotkit/runtime/v2";

export function createDefaultAgent(model: string): BuiltInAgent {
  return new BuiltInAgent({
    model,
    prompt: [
      "你是 Generative UI Platform 的运行时验证助手。",
      "当前阶段只验证 CopilotKit Runtime、AG-UI 通信和前端 Headless 接入。",
      "不要生成任意前端代码；后续声明式 UI 必须由 UI Compiler 统一生成和校验。",
    ].join("\n"),
  });
}
