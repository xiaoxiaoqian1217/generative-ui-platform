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

当前 North Star：

> 将 Business Agent 或已有 Agent Runtime 产生的 Final AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。

```text
Natural Language
→ Business Agent
→ Final AgentContent
→ Presentation Router
→ Presentation Decision
   ├── markdown
   └── generative-ui + UI Plan Candidate
→ UI Compiler Core
→ trusted Presentation
→ Workbench Renderer
```

AgentContent 是可观察系统边界，不是 Workbench 当前主要人工输入。

ADR-0015 继续约束 Router：Markdown 与 structured data 都可进入 Router；只有需要展示语义分析时才调用 Presentation Model；content type 不等于 presentation mode。

## Workbench

Generative UI Workbench 当前是 **真实 Agent 驱动的 Generative UI Lab**。

当前重点：

- Natural-language Conversation；
- Business Agent public activity；
- Final AgentContent Inspect；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Rendered UI；
- Theme / Catalog / Viewport；
- fallback / Reliability。

真实 Conversation 当前保留。

Deferred 的是：

- long-term Conversation History；
- Conversation Management；
- Runtime restart recovery；
- Thread / Turn / Operation 产品化；
- Command Admission 产品化；
- 完整 Runtime Diagnostics。

## Core

当前 Core 包括：

- Presentation Pipeline；
- Presentation Router / Decision；
- UI Compiler Core；
- Component Catalog；
- Theme / Presentation Context；
- Controlled Renderer contracts；
- Reliability Validation。

当前不建设 Presentation Quality 自动评分体系。

## Catalog / Theme

Component Catalog 是 capability authority。
Theme 只负责 visual expression。

Theme 不得增加 / 删除 Catalog capability、授权新的 Action、改变 Business Truth 或绕过 Compiler Policy。

## Supporting Integration

以下能力当前属于 Supporting：

- Generative UI Workbench；
- real Agent Conversation reference experience；
- Reference Integration Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- Development / E2E tooling。

Supporting 用于证明 Core 可以接入真实 Agent 环境，不定义 Core 长期框架边界。

## Deferred Runtime Platform

以下能力保留，但当前停止扩张：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- long-term Runtime-owned Conversation History；
- Conversation Management；
- Runtime restart recovery；
- Recovery / Reconcile；
- Runtime Truth Diagnostics。

ADR-0024 继续约束已有 Agent Runtime Integration 路径安全行为。

## 关键 ADR 关系

- ADR-0015：当前 Active，定义 Router / Model Adapter；
- ADR-0018：保留全链路 Runtime-first 扩展历史，当前阶段范围已被 ADR-0027 部分取代；
- ADR-0019：部分被 ADR-0027 取代；Package / Reference Host 组合方式继续有效，Runtime Host 不再定义 Core 长期宿主；
- ADR-0024：继续定义已有 / 未来 Agent Runtime Integration 的 Runtime Truth 和 Interaction Safety，当前 Deferred；
- ADR-0025：Presentation Integration 当前 Active，Agent Runtime Integration 当前 Deferred；
- ADR-0026：继续约束 Supporting Workbench ↔ Runtime Host AG-UI Reference Path；
- ADR-0027：当前 Scope / Product Priority 权威决策。

## Supporting / Historical Documents

以下文档继续保留，但不自动定义当前 Release Gate：

- [Runtime Truth Model 迁移与冲突处置](./RUNTIME_TRUTH_MIGRATION.md)
- [开发验证环境](./DEVELOPMENT_ENVIRONMENT.md)
- [平台一键开发环境实现说明](./PLATFORM_DEVELOPMENT.md)
- [平台开发者体验](./DEVELOPER_EXPERIENCE.md)
- [Web Demo 迁移决策](./WEB_DEMO_MIGRATION.md)

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
- Theme / Presentation Context 一致性；
- trusted A2UI 安全与可靠性；
- 真实 Agent 驱动 Generative UI 调试 / 验证能力；
- Core 必要的最小 Integration。

长期 Conversation Service、Workflow Recovery、Runtime Repository 或 Observability Platform 默认 Deferred。

发生新的架构冲突时，必须遵守根目录 `AGENTS.md` 的 Architecture Conflict Gate。
