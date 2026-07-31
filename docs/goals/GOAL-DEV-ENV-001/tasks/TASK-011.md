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
- normalizedModelUsage
- presentationDecisionMode
- uiPlanValidationStatus
- compilerLatencyMs
- presentationMode
- surfaceId
- actionId
- normalizedErrorCode

## Workbench 诊断

仅展示安全、最小化的诊断摘要：

- 用户请求的类型、长度、时间和脱敏摘要，不展示完整原文。
- Business Agent Result 状态、内容类型、大小和 Schema 校验结果，不展示完整 AgentContent。
- Presentation Pipeline 阶段状态。
- Model Adapter 的供应商无关安全摘要。
- PresentationDecision 模式和 UI Plan Candidate 校验状态，不展示 Provider 原始响应。
- PresentationResult 类型、A2UI Operation 数量和渲染状态；Raw Viewer 必须受开发模式和脱敏规则约束。
- Action Event 的标识、类型、校验结果和执行状态；Payload 仅展示脱敏摘要。
- 各阶段耗时、重试、错误与降级。

## 架构限制

- HTTP 请求终局和 Run 生命周期由 Agent Runtime Host 统一拥有。
- Presentation Pipeline 只记录展示阶段事件，不创建独立 Compiler HTTP 请求终局。
- 可观测性使用供应商无关 Port，不向应用层暴露具体 SDK。
- `normalizedModelUsage` 只能包含批准的数值字段，不得透传 Provider 原始 Usage 对象。

禁止记录或在诊断面板展示：

- API Key 或 Authorization。
- 模型隐藏推理。
- 原始或清理后的完整业务内容。
- 完整 AgentContent、完整用户请求或未脱敏 Action Payload。
- 不必要的完整 Prompt、Provider 原始响应或 Provider 特有对象。
- 未脱敏敏感业务数据。

诊断字段必须区分未发生、未配置、不可用和执行失败。

## 验收

- 一次请求可以通过 requestId 查看完整安全链路。
- PresentationDecision 模式、UI Plan 校验和降级原因可见。
- HTTP 与 WebSocket 使用一致的关联字段。
- Pipeline 事件归属于同一个 Runtime Run。
- 日志和 Workbench 不泄露完整业务内容、模型原始响应、凭据或敏感 Payload。
- 使用自动化测试验证禁止字段不会进入日志、Trace、Metric 标签或浏览器诊断数据。
