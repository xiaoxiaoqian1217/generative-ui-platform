# Generative UI Workbench 文档

本目录汇总 Generative UI Workbench 的当前产品和架构入口。

Workbench 是 Generative UI Platform 的 Frontend Runtime 参考实现和端到端开发验收环境。
它只连接 Agent Runtime Host，不直接连接 Business Agent、Presentation Pipeline 或 UI Compiler Core。

## 当前规范

- [Workbench 软件需求规格](../WEB_WORKBENCH_SRS.md)
- [平台级需求](../platform/REQUIREMENTS.md)
- [平台级架构](../platform/ARCHITECTURE.md)
- [平台系统架构](../platform/SYSTEM_ARCHITECTURE.md)
- [全链路开发验证环境](../platform/DEVELOPMENT_ENVIRONMENT.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：AG-UI Agent 应用协议边界](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)

## 核心边界

- Web 只连接 Agent Runtime Host；
- Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 应用协议；
- 当前 AG-UI 参考 Transport 为 HTTP POST + SSE；HTTP、SSE、WebSocket 不作为并列 Agent 业务协议；
- Runtime Host 是 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot 的权威来源；
- Business Agent 负责业务推理、后端业务工具、Checkpoint 和权威业务状态；
- Business Agent 不要求实现 AG-UI，具体私有协议由 Business Agent Adapter 隔离；
- Presentation Pipeline 负责最终 AgentContent 的展示路由、候选验证、受控 UI 编译和安全降级；
- Model Adapter 输出不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- Workbench 负责 Conversation、Markdown/A2UI 渲染、受控用户意图和诊断展示，不拥有 Runtime Truth 或业务工具执行权威；
- Action 是否被正式接受由 Runtime Host 的 Command Admission 决定，浏览器 `runId` 不得作为权威执行上下文。

## 产品方向

Workbench 当前采用 Conversation-first 模型。
MVP Release Gate 聚焦 Conversation、Presentation、Safe Interaction、Recovery 和 Inspect。
Catalog、Scenarios、Settings 可以作为 Supporting Developer Tools。
Cases、Case Replay 和自动语义 Assertion 不再属于当前 MVP 的核心产品要求。
