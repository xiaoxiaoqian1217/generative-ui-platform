# Platform Documentation

该目录包含仓库级平台规范。

## 文档入口

- [平台级需求](./REQUIREMENTS.md)
- [平台级架构](./ARCHITECTURE.md)
- [架构简图](./SYSTEM_ARCHITECTURE.md)
- [Runtime Truth Model 迁移与冲突处置](./RUNTIME_TRUTH_MIGRATION.md)
- [开发验证环境](./DEVELOPMENT_ENVIRONMENT.md)
- [平台范围调整摘要](./SCOPE_DECISION.md)
- [平台一键开发环境实现说明](./PLATFORM_DEVELOPMENT.md)
- [平台开发者体验](./DEVELOPER_EXPERIENCE.md)
- [Web Demo 迁移决策](./WEB_DEMO_MIGRATION.md)
- [ADR-0018：平台全链路开发验证环境范围](../adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0019：Presentation Pipeline 嵌入 Agent Runtime Host](../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0023：受控 CopilotKit 会话 UI 与平台调试历史](../adr/0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0025：双外部接入模式与内部能力分层](../adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：AG-UI Agent 应用协议边界](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
- [架构决策记录索引](../adr/README.md)
- [阶段 Goal 文档](../goals/)

## 规范关系

平台级需求和架构定义跨子系统范围、职责和调用关系。
ADR 记录重要架构选择的背景、取舍、取代关系和后果。
当前 Goal 定义阶段性交付范围和验收标准。
迁移说明记录已确认架构在旧 Contract、Goal、SRS 和实现上的兼容迁移方式，不创建新的架构语义。

当前平台后端部署边界由 ADR-0019 固定：Agent Runtime Host 是统一后端入口，Presentation Pipeline 以独立 Package 形式嵌入 Runtime Host，UI Compiler Core 和相关契约继续保持独立。

当前 Runtime 状态所有权由 ADR-0024 固定：Business Agent 拥有业务状态和业务副作用语义；Agent Runtime Host 拥有 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot；Diagnostics 是观察投影，不是 Runtime 状态恢复的唯一来源。

当前外部接入模式由 ADR-0025 固定：平台对外区分 Presentation Integration 与 Agent Runtime Integration，不把内部能力层次当作多级产品接入模型。

当前 Workbench Agent 协议边界由 ADR-0026 固定：Workbench 与 Runtime Host 之间只使用 AG-UI 作为 Agent 应用协议，当前 Transport 为 HTTP POST + SSE；HTTP、SSE 和 WebSocket 不作为并列 Agent 业务协议。
Runtime Host 与 Business Agent 的 HTTP + SSE / WebSocket 选择属于 Business Agent Adapter 私有边界。

ADR-0024 已确认的六项旧架构冲突以 `RUNTIME_TRUTH_MIGRATION.md` 记录。
这些冲突不再需要重复确认，除非后续实现提出新的架构语义或需要修改 ADR-0024 本身。

发生新的冲突时，必须先根据根目录 `AGENTS.md` 的规范优先级和 Architecture Conflict Gate 处理。
不得通过 Goal、PR、测试或实现静默覆盖当前已接受架构。

## 旧文档关系

以下文档保留在原路径，继续作为 Generative UI Compiler MVP 和 Compiler 子系统基线：

- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/Generative_UI_Compiler_Design.md`

平台级文档负责跨子系统范围和关系。
旧文档负责 Compiler 内部需求、架构和设计。
原 Compiler ADR 继续约束 Compiler 子系统，除非后续 ADR 明确说明取代范围。

已完成 Goal、迁移记录和旧 README 中与 ADR-0024 或 ADR-0026 冲突的 Run-centric / 多协议入口表述只保留为历史背景，不得继续作为新增实现规范。
