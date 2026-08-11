# 文档导航

本目录按平台规范、子系统基线和架构决策组织。

当前阶段以 ADR-0027 定义的 **Presentation-first Generative UI** 为主线。

## 规范优先级

发生范围或架构冲突时，按以下顺序判断：

1. 已接受且仍有效的 ADR；
2. `docs/platform/REQUIREMENTS.md`；
3. `docs/platform/ARCHITECTURE.md`；
4. 当前已批准 Goal / Decision；
5. 子系统需求、架构和设计；
6. Roadmap 和说明性文档。

旧文档继续保留，不通过静默改写掩盖其形成时的阶段背景。

## 当前 North Star

> 将 Business Agent 或已有 Agent Runtime 产生的 Final AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。

当前主链路：

```text
Natural Language
→ Business Agent
→ Final AgentContent
→ Presentation Router
→ Presentation Decision
→ UI Plan Candidate（仅 generative-ui）
→ UI Compiler Core
→ trusted A2UI / Markdown
→ Workbench Renderer
```

AgentContent 是可观察的系统边界，不是 Workbench 当前主要人工输入。

## 当前平台级规范

- [ADR-0027：Presentation-first Scope Reset](./adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台范围摘要](./platform/SCOPE_DECISION.md)
- [平台级需求](./platform/REQUIREMENTS.md)
- [平台级架构](./platform/ARCHITECTURE.md)
- [平台架构简图](./platform/SYSTEM_ARCHITECTURE.md)
- [Workbench SRS](./WEB_WORKBENCH_SRS.md)
- [ADR 索引](./adr/README.md)

## 当前产品分层

### Core

- Presentation Contract；
- Presentation Router / Decision；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Theme / Presentation Context；
- trusted Presentation；
- Controlled Renderer contracts；
- Reliability Validation。

### Supporting

- Generative UI Workbench；
- real Agent Conversation reference experience；
- Reference Integration Host；
- CopilotKit / AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- Development / E2E tooling。

### Deferred Runtime Platform

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- long-term Runtime-owned Conversation History；
- Conversation management；
- Runtime restart recovery；
- Recovery / Reconcile；
- Runtime Truth Diagnostics。

真实 Agent Conversation 不属于 Deferred。
Deferred 的是完整 Conversation Management / Persistence / Recovery 和 Runtime Platform 产品化。

## Workbench

- [Workbench 文档索引](./workbench/README.md)
- [Workbench 需求规格](./WEB_WORKBENCH_SRS.md)

Workbench 当前是 **真实 Agent 驱动的 Generative UI Lab**。

它优先验证：

- Natural-language Conversation；
- Business Agent public activity；
- Final AgentContent；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Rendered UI；
- Theme / Catalog / Viewport；
- fallback / Reliability。

## Compiler 子系统

- [Compiler MVP 需求](./REQUIREMENTS.md)
- [Compiler MVP 架构](./ARCHITECTURE.md)
- [Compiler 系统设计](./Generative_UI_Compiler_Design.md)
- [数据契约](./CONTRACTS.md)

这些文档继续约束 Compiler 输入信任、Catalog、Validation 和 A2UI 编译边界。

## 关键 ADR

- [ADR-0015：Presentation Router / Model Adapter](./adr/0015-presentation-router-and-model-adapter.md)
- [ADR-0018：仓库扩展到平台验证环境](./adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0019：Presentation Pipeline 嵌入 Reference Runtime Host](./adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](./adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0025：双外部接入模式](./adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：AG-UI Reference Agent 协议边界](./adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
- [ADR-0027：Presentation-first Scope Reset](./adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)

ADR-0019 当前为“部分被 ADR-0027 取代”。
其 Package / Reference Integration 组合结论继续有效，但 Runtime Host 不再是 Generative UI Core 的长期产品边界。

ADR-0024 仍有效，但当前属于 Deferred Agent Runtime Integration。

ADR-0026 只约束 Supporting Workbench ↔ Runtime Host reference path，不约束 Presentation Core。

## Supporting / Historical 平台文档

以下文档继续用于维护现有工程和理解历史决策：

- [Runtime Truth Model 迁移与冲突处置](./platform/RUNTIME_TRUTH_MIGRATION.md)
- [全链路开发验证环境](./platform/DEVELOPMENT_ENVIRONMENT.md)
- [平台开发者体验](./platform/DEVELOPER_EXPERIENCE.md)
- [平台一键开发环境实现说明](./platform/PLATFORM_DEVELOPMENT.md)
- [Web Demo 迁移决策](./platform/WEB_DEMO_MIGRATION.md)

其中 Runtime-first 产品目标不再自动成为当前 Release Gate。

## 当前功能准入

新增功能必须直接提升以下至少一项：

- `AgentContent → Presentation` 语义正确性；
- Theme / Presentation Context 一致性；
- UI Plan → trusted A2UI 安全与可靠性；
- 真实 Agent 驱动 Generative UI 的调试 / 验证能力；
- Core 必需的最小 Integration。

通用 Agent Runtime 能力默认 Deferred。
