# TASK-005：Runtime Host 平台编排

## 目标

把 Business Agent 和 Embedded Presentation Pipeline 串成同一次 Agent Run 内的完整后端链路。

Fixture Pipeline 不等待真实 Provider 接入完成。

## 流程

```text
用户请求
→ Business Agent Adapter
→ AgentContent
→ Embedded Presentation Pipeline
→ PresentationResult
→ Web
```

## 工作项

- 实现 RunOrchestrator。
- 实现 ActionOrchestrator 的基础结构。
- 在 Agent Runtime Host 组合根中组装 `packages/presentation-pipeline`。
- 将 AgentContent 转换为 Pipeline 所需的 PresentationRequest 或等价内部请求。
- 实现最小 SurfaceContextStore。
- 实现 DependencyHealthService。
- 提供 `/api/runs`、`/api/actions`、`/health/dependencies` 和 `/ws/runs`。
- 让 HTTP 与 WebSocket 复用相同应用层编排。
- 贯穿 requestId、threadId、runId 和 presentationRequestId。
- 统一 Run 的 AbortSignal、总超时预算和观测上下文。

## 架构限制

- Runtime Host 不构造 PresentationDecision、UI Plan Candidate、UI IR 或 A2UI。
- Runtime Host 不直接调用模型，Model Adapter 只能由 Presentation Pipeline 调用。
- Runtime Host 不复制 Sanitizer、Catalog、Router 或 Compiler Core 规则。
- Transport 层不放业务逻辑。
- 当前不实现 UI Compiler Client、独立 UI Compiler HTTP Service 或 Remote 模式。
- Pipeline 失败时优先保留有效 Business Agent 内容并执行安全 Markdown 降级。

## 验收

- AgentContent 可以在同一 Run 内进入 Presentation Pipeline。
- PresentationResult 正确映射为 Runtime Result。
- HTTP 和 WebSocket 对相同输入产生等价应用结果。
- Pipeline 的成功、降级和失败场景均有测试。
- 取消、超时和关闭语义覆盖 Business Agent 与 Presentation Pipeline。
- 全链路关联 ID 可用于诊断。
