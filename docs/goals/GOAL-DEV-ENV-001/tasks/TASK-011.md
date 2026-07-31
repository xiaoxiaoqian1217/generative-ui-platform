# TASK-011：诊断与可观测性

## 目标

使用统一关联 ID 追踪 Business Agent、Runtime Host、Embedded Presentation Pipeline、Model Adapter、Compiler Core、Renderer 和 Action。

该任务是横切任务，应从 TASK-001 起随各模块增量实施。

## 统一字段

- requestId
- threadId
- runId
- agentId
- presentationRequestId
- modelProvider
- modelName
- modelLatencyMs
- modelUsage
- presentationDecisionMode
- uiPlanValidationStatus
- compilerLatencyMs
- presentationMode
- surfaceId
- actionId
- normalizedErrorCode

## Workbench 诊断

- 用户请求。
- Business Agent Result 和 AgentContent。
- Presentation Pipeline 阶段状态。
- Model Adapter 安全摘要。
- PresentationDecision 和 UI Plan Candidate 校验状态。
- PresentationResult 和 A2UI Operations。
- Action Event。
- 各阶段耗时、重试、错误与降级。

## 架构限制

- HTTP 请求终局和 Run 生命周期由 Agent Runtime Host 统一拥有。
- Presentation Pipeline 只记录展示阶段事件，不创建独立 Compiler HTTP 请求终局。
- 可观测性使用供应商无关 Port，不向应用层暴露具体 SDK。

禁止记录：

- API Key 或 Authorization。
- 模型隐藏推理。
- 未脱敏敏感业务数据。
- 不必要的完整 Prompt 或 Provider 原始响应。

诊断字段必须区分未发生、未配置、不可用和执行失败。

## 验收

- 一次请求可以通过 requestId 查看完整安全链路。
- PresentationDecision、UI Plan 校验和降级原因可见。
- HTTP 与 WebSocket 使用一致的关联字段。
- Pipeline 事件归属于同一个 Runtime Run。
- 日志和 Workbench 不泄露敏感信息。
