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
- 实现 ActionOrchestrator 的基础结构，并明确 TASK-008 负责完整 Action 安全闭环。
- 在 Agent Runtime Host 组合根中直接组装 `packages/presentation-pipeline`。
- 将 AgentContent 转换为 Pipeline 所需的 PresentationRequest 或等价内部请求。
- 实现最小 SurfaceContextStore。
- 分离远程依赖健康状态与进程内能力就绪状态：Business Agent 属于远程依赖，Pipeline、Catalog 和 Fixture Adapter 属于进程内能力。
- 提供 `/api/runs`、`/api/actions`、`/health/dependencies` 和 `/ws/runs`。
- 让 HTTP 与 WebSocket 复用相同应用层编排。
- 贯穿 requestId、threadId、runId 和 presentationRequestId。
- 统一 Run 的 AbortSignal、总超时预算和观测上下文。
- 为模型调用增加有界并发、超时和异常隔离，避免阻塞 Runtime Host 其他请求。
- 删除或拒绝使用 `UI_COMPILER_URL`、UI Compiler Client 和 Remote Mode 配置。

## 架构限制

- Runtime Host 不构造 PresentationDecision、UI Plan Candidate、UI IR 或 A2UI。
- Runtime Host 不直接调用模型，Model Adapter 只能由 Presentation Pipeline 调用。
- Runtime Host 不复制 Sanitizer、Catalog、Router 或 Compiler Core 规则。
- Runtime Host 不依赖 `apps/ui-compiler-service`，App 不得依赖 App。
- Transport 层不放业务逻辑。
- 当前不实现 UI Compiler Client、独立 UI Compiler HTTP Service 或 Remote 模式。
- Pipeline 失败时优先保留有效 Business Agent 内容并执行安全 Markdown 降级。

## 验收

- AgentContent 可以在同一 Run 内进入 Presentation Pipeline。
- Runtime Host 通过 Package 依赖直接组装 Pipeline，不产生内部 HTTP 调用。
- PresentationResult 正确映射为 Runtime Result。
- HTTP 和 WebSocket 对相同输入产生等价应用结果。
- Pipeline 的成功、降级和失败场景均有测试。
- 取消、超时和关闭语义覆盖 Business Agent 与 Presentation Pipeline。
- 模型超时或异常不会耗尽 Runtime Host 的并发资源。
- Runtime 配置、依赖图和测试中不存在 UI Compiler Client、`UI_COMPILER_URL` 或 Remote Mode。
- 全链路关联 ID 可用于诊断。
