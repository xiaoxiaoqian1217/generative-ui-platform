# TASK-011：诊断与可观测性

## 目标

用 requestId 追踪 Business Agent、Runtime、Model Adapter、Compiler、Renderer 和 Action。

## 字段

- requestId
- threadId
- runId
- agentId
- presentationRequestId
- modelProvider
- modelName
- modelLatencyMs
- modelUsage
- uiPlanValidationStatus
- compilerLatencyMs
- presentationMode
- surfaceId
- actionId
- normalizedErrorCode

## Workbench 显示

- 用户请求；
- Business Agent Result；
- AgentContent；
- PresentationRequest；
- Model Adapter 安全摘要；
- UI Plan Candidate 校验状态；
- PresentationResult；
- A2UI Operations；
- Action Event；
- 阶段耗时；
- 错误与降级。

## 限制

禁止记录：

- API Key；
- Authorization；
- 模型隐藏推理；
- 未脱敏敏感数据；
- 不必要的完整 Prompt。

## 验收

- 一次请求可查看完整安全链路；
- UI Plan 校验和降级原因可见；
- 日志不泄露敏感信息。
