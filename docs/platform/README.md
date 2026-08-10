# Platform Documentation

该目录包含仓库级平台规范。

当前阶段以 ADR-0027 定义的 **Presentation-first Generative UI** 为主线。

## 当前文档入口

- [平台范围摘要](./SCOPE_DECISION.md)
- [平台级需求](./REQUIREMENTS.md)
- [平台级架构](./ARCHITECTURE.md)
- [架构简图](./SYSTEM_ARCHITECTURE.md)
- [Workbench SRS](../WEB_WORKBENCH_SRS.md)
- [ADR-0027：Presentation-first Scope Reset](../adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [ADR 索引](../adr/README.md)

## 当前产品主线

当前 North Star 是：

> 将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。

```text
AgentContent
    ↓
Presentation Router
    ├── Markdown → safe Markdown PresentationResult
    └── Structured Business Data
              ↓
      Presentation Model
              ↓
      untrusted UI Plan Candidate
              ↓
      UI Compiler Core
              ↓
      trusted A2UI PresentationResult
```

当前 Core 包括 Presentation Pipeline、UI Compiler Core、Component Catalog、Theme / Presentation Context、受控 Renderer Contract 和 Reliability Evaluation。

## Workbench

Generative UI Workbench 当前是 **Generative UI Lab / 可视化开发调试工作台**。

当前重点是：

- AgentContent；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Rendered UI；
- Theme / Catalog / Viewport；
- Compare / Reliability。

Conversation-first、Runtime Recovery、Command Admission 和完整 Runtime Diagnostics 不再是当前 Workbench Release Gate。

## Supporting Integration

以下能力当前属于 Supporting：

- Agent Runtime Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- Development / E2E tooling。

Supporting Integration 用于证明 Core 能够接入真实 Agent 环境。
它不定义 Core 的长期框架边界。

## Deferred Runtime Platform

以下能力保留，但当前停止扩张：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics。

ADR-0024 继续约束已有 Agent Runtime Integration 路径的安全行为。
这些能力不再属于当前 Presentation-first MVP Release Gate。

## 关键 ADR 关系

- ADR-0018 保留平台全链路扩展历史，其当前阶段 Runtime-first 范围被 ADR-0027 部分取代；
- ADR-0019 继续定义当前参考实现中 Presentation Pipeline 嵌入 Agent Runtime Host；
- ADR-0024 继续定义已有 / 未来 Agent Runtime Integration 的 Runtime Truth 和 Interaction Safety；
- ADR-0025 继续定义 Presentation Integration 与 Agent Runtime Integration 两种长期接入模式；
- ADR-0027 将 Presentation Integration 提升为当前唯一 Active Product Track；
- ADR-0026 继续约束当前 Workbench ↔ Runtime Host 的 Supporting AG-UI 参考路径。

## Supporting / Historical Documents

以下文档继续保留，但不自动定义当前产品 Release Gate：

- [Runtime Truth Model 迁移与冲突处置](./RUNTIME_TRUTH_MIGRATION.md)
- [开发验证环境](./DEVELOPMENT_ENVIRONMENT.md)
- [平台一键开发环境实现说明](./PLATFORM_DEVELOPMENT.md)
- [平台开发者体验](./DEVELOPER_EXPERIENCE.md)
- [Web Demo 迁移决策](./WEB_DEMO_MIGRATION.md)
- [ADR-0018：平台全链路开发验证环境范围](../adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0023：受控 CopilotKit 会话 UI 与平台调试历史](../adr/0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：AG-UI 参考路径协议边界](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
- [阶段 Goal 文档](../goals/)

这些文档中与 ADR-0027 当前阶段优先级冲突的 Runtime-first Release Gate 只作为历史背景保留。

## Compiler 子系统基线

以下文档继续作为 Generative UI Compiler 内部规范：

- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/Generative_UI_Compiler_Design.md`

原 Compiler ADR 继续约束 Compiler 子系统。
ADR-0027 不放宽任何 Compiler 输入信任、Catalog、Validation 或 A2UI 编译安全边界。

## 当前开发准入

当前新增能力必须直接提高：

- `AgentContent → Presentation` 语义正确性；
- 视觉质量；
- Theme 一致性；
- trusted A2UI 安全与可靠性；
- Generative UI 调试、比较或评测能力；
- Core 必要的最小 Integration。

主要解决通用 Agent Runtime、Conversation Service、Workflow Recovery 或 Observability Platform 的功能默认 Deferred。

发生新的架构冲突时，必须遵守根目录 `AGENTS.md` 的 Architecture Conflict Gate。
