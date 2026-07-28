# ADR-0013: 将 AG-UI Run 生命周期移出 UI Compiler Service

- **状态：** 已接受
- **日期：** 2026-07-28

## 背景

Generative UI Compiler 的职责是判断业务 Agent 的 Markdown 或 JSON 应当如何安全展示，并在需要时将不可信的 UI Plan Candidate 编译为受控的 A2UI Operations。
AG-UI 解决的是前端与 Agent Runtime 之间的 Run、Step、消息和事件传输问题。
A2UI 解决的是声明式 UI Surface 的描述和更新问题。
两者处于不同架构层，不应因为当前集成框架使用 CopilotKit 而混为同一个 Compiler 输出协议。

先前设计要求 UI Compiler Service 同时提供 HTTP 和 AG-UI 接口，并由 Service 管理完整的 AG-UI Run 生命周期。
当外部 Copilot Runtime 或其他 Runtime Host 已经拥有 Agent Run 时，该设计会产生两层 Run 生命周期、两套关联标识、重复的取消和错误映射，以及不清晰的执行语义。
它还会使 Compiler 的网络边界与特定 Agent 事件协议产生不必要的耦合。

业务 Agent、Copilot Runtime、Frontend Runtime 和 Interaction Gateway 仍然是当前 Compiler MVP 的外部系统。
本 ADR 不授权创建或实现 Runtime Host、Interaction Gateway 或真实业务 Agent。

## 决策

`PresentationResult` 是 UI Compiler Service 的规范应用层输出。
`POST /api/ui-compiler/present` 是 UI Compiler Service 的主要网络接口，并使用 HTTP JSON 传输 `PresentationRequest` 和 `PresentationResult`。
`PresentationResult` 的 generative-ui 分支继续携带经过验证的 A2UI Operations。

UI Compiler Core 不输出 AG-UI 事件，不管理 AG-UI Run 生命周期，也不依赖 CopilotKit、AG-UI SDK 或任何 Agent Runtime。
UI Compiler Service 不负责外部业务 Agent Run 的 `RUN_STARTED`、`RUN_FINISHED`、`RUN_ERROR`、Step、Thread 或事件流编排。

外部 Runtime Host 或调用方 Adapter 负责：

- 接收前端 Agent 协议请求；
- 调用协议无关的业务 Agent；
- 将业务 Agent 的 Markdown 或 JSON 封装为 `PresentationRequest`；
- 通过 HTTP 调用 UI Compiler Service；
- 将 `PresentationResult` 映射为当前运行时需要的 AG-UI、WebSocket、SSE 或其他外部协议；
- 维护属于业务 Agent Run 的关联标识、取消、错误和终止语义。

Compiler 仓库可以保留独立、可选且可替换的 AG-UI 协议适配工具。
该工具不得成为 UI Compiler Core 的依赖，不得使 AG-UI 成为 `PresentationResult` 的规范表示，也不得成为 UI Compiler Service 独立运行的前置条件。
当前 Compiler MVP 不要求提供 AG-UI Endpoint，也不把完整 AG-UI Run 生命周期纳入 Compiler Service 验收范围。

未来如果有明确调用方需要直接把一次展示编译表示为独立 AG-UI Run，可以通过单独的范围 Issue 和 Adapter 验收标准启用可选接口。
该可选接口只能包装 `PresentationResult`，不得扩展 Compiler 去执行或路由业务 Agent。

## 后果

- Compiler 的主要公共网络边界保持简单的 HTTP 请求响应模型。
- 更换 CopilotKit 或 AG-UI 时，业务 Agent、Presentation Router 和 UI Compiler Core 不需要修改。
- 当前 A2UI 输出能力保持不变，并继续通过 UI IR 与未来其他声明式 UI 输出协议隔离。
- 外部 Runtime Host 可以选择 AG-UI、WebSocket、SSE、gRPC 或其他传输协议。
- 业务 Agent 只需要提供协议无关的业务调用接口，不需要实现 AG-UI。
- `threadId` 和 `runId` 继续作为可选关联字段存在于 Presentation 契约中，但 Compiler 不拥有外部 Agent Run 生命周期。
- `packages/ag-ui-adapter` 如果保留，只能作为可选协议工具包，不属于 Compiler Core，也不构成 UI Compiler Service 的必需接口。
- 新增 Copilot Runtime Host 或 Interaction Gateway 仍然需要显式范围变更 Issue 和新的 ADR。
- Compiler 的契约测试继续验证 `PresentationRequest`、`PresentationResult`、A2UI Profile 和 HTTP 映射，不再要求验证完整 AG-UI Run 生命周期。

## 被取代的决策

本 ADR 取代 ADR-0010 中由 UI Compiler Service 或其必需 Adapter 拥有完整 AG-UI Run 生命周期的决定。
ADR-0010 记录的标准事件名称、CustomEvent Payload 版本化和终止事件互斥规则，只有在未来启用可选 AG-UI Adapter 时继续适用。
