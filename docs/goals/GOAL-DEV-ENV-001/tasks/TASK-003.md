# TASK-003：Business Agent Adapter

## 目标

让 Agent Runtime Host 通过统一 Adapter 调用 LangGraph Reference Business Agent，并保留替换其他 Agent 实现的能力。

## 工作项

- 定义 `BusinessAgentAdapter`。
- 实现 LangGraph HTTP Adapter。
- 保留 Mock Adapter 作为隔离测试替身。
- 支持 Run 和 Resume Action。
- 支持 Timeout、AbortSignal 和有限重试策略。
- 校验请求和结果 Schema。
- 归一化网络、协议和业务错误。
- 透传 requestId、threadId 和 runId。
- 增加 Contract Test 和进程级集成测试。

## 架构限制

- Runtime Host 不直接依赖 LangGraph SDK。
- Adapter 不做展示决策，不调用 Presentation Pipeline、Presentation Model Adapter 或 UI Compiler Core。
- Adapter 不生成 PresentationRequest、PresentationResult 或 A2UI。
- Adapter 不把具体 Agent 协议泄露给 Web。

## 验收

- Mock 与 LangGraph Adapter 可以互换。
- Run 和 Resume Action 集成测试通过。
- Agent 不可达、超时、非法响应时返回稳定错误。
- Runtime Host 仅依赖 Business Agent Contract。
