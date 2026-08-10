# Generative UI Workbench 文档

本目录汇总 Generative UI Workbench 的当前产品和架构入口。

Workbench 当前是 Generative UI Platform 的 **Generative UI Lab / 可视化开发调试工作台**。

它的首要目标是验证 `AgentContent → Presentation → trusted A2UI → Renderer` 是否正确、稳定、主题一致且受控。

## 当前规范

- [Workbench 软件需求规格](../WEB_WORKBENCH_SRS.md)
- [ADR-0027：Presentation-first Scope Reset](../adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台级需求](../platform/REQUIREMENTS.md)
- [平台级架构](../platform/ARCHITECTURE.md)
- [平台系统架构](../platform/SYSTEM_ARCHITECTURE.md)

## 当前主线

Workbench 当前优先建设和验证：

- AgentContent / Reference Scenario；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Controlled Renderer；
- Theme / Presentation Context；
- Catalog；
- Viewport；
- Compare；
- Reliability / fallback。

Workbench 不生成 UI Plan，也不拥有 Compiler Trust。

## Supporting Integration

Workbench 当前可以继续通过 Agent Runtime Host 使用 CopilotKit / AG-UI 参考路径。

这条路径用于真实 Agent Integration 和 E2E。
它不是 Generative UI Core 的强制协议。

Business Agent 不需要实现 AG-UI。
未来替换 CopilotKit 时，Workbench 的 Presentation 调试模型不应改变。

## Deferred Runtime 能力

Conversation-first、Runtime-owned Conversation History、Thread / Turn / Operation、Surface Lifecycle、Command Admission、Recovery、Reconcile 和完整 Runtime Diagnostics 不再属于当前 Workbench MVP Release Gate。

相关已有代码和历史文档可以保留。
ADR-0024 继续约束仍然存在的 Runtime Integration 安全行为。

## Supporting / Historical 入口

- [全链路开发验证环境](../platform/DEVELOPMENT_ENVIRONMENT.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：当前 AG-UI 参考路径](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)

这些文档不再自动定义当前 Workbench Release Gate。
