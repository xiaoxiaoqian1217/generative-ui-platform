# 文档导航

本目录按平台规范、阶段 Goal、子系统基线和架构决策组织。

当前阶段以 ADR-0027 定义的 **Presentation-first Generative UI** 为主线。
旧文档继续保留，不通过静默改写掩盖其形成时的阶段背景。

## 规范优先级

发生范围或架构冲突时，按以下顺序判断：

1. 已接受且仍有效的 ADR；
2. `docs/platform/REQUIREMENTS.md`；
3. `docs/platform/ARCHITECTURE.md` 和相关平台架构文档；
4. 当前已批准的 Goal 和可执行任务包；
5. 对应子系统的需求、架构和设计基线；
6. Roadmap 和说明性文档。

任何后续文档或实现如果与当前有效架构发生实质冲突，必须先明确标记冲突并由用户/架构决策者确认。
不得通过代码、测试或文档静默覆盖当前架构。
详细规则以根目录 `AGENTS.md` 为准。

## 当前阶段范围

当前 North Star：

> 将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。

当前 Active Product Track 是 ADR-0025 定义的 Presentation Integration。

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

## 平台级规范

- [平台文档索引](./platform/README.md)
- [平台范围调整摘要](./platform/SCOPE_DECISION.md)
- [ADR-0027：Presentation-first Scope Reset](./adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台级需求](./platform/REQUIREMENTS.md)
- [平台级架构](./platform/ARCHITECTURE.md)
- [平台架构简图](./platform/SYSTEM_ARCHITECTURE.md)
- [Workbench SRS](./WEB_WORKBENCH_SRS.md)

## 当前产品分层

### Core

- Presentation Contract；
- Presentation Router；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Theme / Presentation Context；
- trusted Presentation；
- Reliability Evaluation。

### Supporting

- Generative UI Workbench；
- Agent Runtime Host；
- CopilotKit / AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Development / E2E tooling。

### Deferred Runtime Platform

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics。

ADR-0024 继续约束已有 Runtime Integration 路径。
这些能力不再属于当前 Presentation-first MVP Release Gate。

## Generative UI Workbench

- [Workbench 文档索引](./workbench/README.md)
- [Workbench 需求规格](./WEB_WORKBENCH_SRS.md)

Workbench 当前是 Generative UI Lab。

它优先验证：

- AgentContent；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Rendered UI；
- Theme / Catalog / Viewport；
- Compare / Reliability。

Conversation-first、Runtime Recovery、Command Admission 和完整 Diagnostics 不再是当前 Workbench Release Gate。

## 当前阶段 Goal

- [GOAL-DEV-ENV-001](./goals/GOAL-DEV-ENV-001.md)（已完成，历史交付基线）
- [GOAL-WEB-COPILOTKIT-UI-001](./goals/GOAL-WEB-COPILOTKIT-UI-001.md)（Runtime-first 历史 / Deferred，除非重新授权）
- [GOAL-DEBUG-CONVERSATIONS-001](./goals/GOAL-DEBUG-CONVERSATIONS-001.md)（Runtime-first 历史 / Deferred，除非重新授权）
- [GOAL-DEV-ENV-001 子任务包](./goals/GOAL-DEV-ENV-001/README.md)

Goal 定义阶段性交付范围和验收标准，不是独立产品定义。

ADR-0027 接受后，主要建设 Conversation、Runtime History、Recovery 或 Runtime Diagnostics 的旧 Goal 不得继续自动授权新增实现。
如需恢复，必须重新建立当前 Goal / Issue，并说明为什么该能力已经成为 Presentation 主线的必要条件，或者正式恢复 Agent Runtime Integration。

## UI Compiler 子系统

- [Compiler 子系统文档索引](./compiler/README.md)
- [Compiler MVP 需求](./REQUIREMENTS.md)
- [Compiler MVP 架构](./ARCHITECTURE.md)
- [Compiler 系统设计](./Generative_UI_Compiler_Design.md)
- [数据契约](./CONTRACTS.md)

这些旧文档继续作为 UI Compiler 子系统的需求和设计基线。
ADR-0027 不放宽任何 Compiler 输入信任、Catalog、Validation 或 A2UI 编译边界。

## 架构决策

- [ADR 索引](./adr/README.md)
- [ADR-0018：扩展仓库范围到平台验证环境](./adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0019：Presentation Pipeline 嵌入 Runtime Host](./adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](./adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0025：双外部接入模式与内部能力分层](./adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：AG-UI Agent 应用协议边界](./adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
- [ADR-0027：Presentation-first Scope Reset](./adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)

ADR-0018 中“当前阶段平台全链路 Runtime 验证环境”的优先级已被 ADR-0027 部分取代。
ADR-0024 仍有效，但当前属于 Deferred Agent Runtime Integration。
ADR-0025 仍定义两种长期接入模式，其中 Presentation Integration 当前 Active，Agent Runtime Integration 当前 Deferred。
ADR-0026 继续约束 Supporting Workbench ↔ Runtime Host 参考路径，不约束 Presentation Core。

## Supporting / Historical 平台文档

以下文档继续用于维护现有工程和理解历史决策：

- [Runtime Truth Model 迁移与冲突处置](./platform/RUNTIME_TRUTH_MIGRATION.md)
- [全链路开发验证环境](./platform/DEVELOPMENT_ENVIRONMENT.md)
- [平台开发者体验](./platform/DEVELOPER_EXPERIENCE.md)
- [平台一键开发环境实现说明](./platform/PLATFORM_DEVELOPMENT.md)
- [Web Demo 迁移决策](./platform/WEB_DEMO_MIGRATION.md)

其中 Runtime-first 产品目标不再自动成为当前 Release Gate。

## 当前功能准入

当前新增功能必须直接提升以下至少一项：

- `AgentContent → Presentation` 语义正确性；
- 生成 UI 视觉质量；
- Theme 一致性；
- UI Plan → trusted A2UI 安全与可靠性；
- Generative UI 调试、比较或评测能力；
- Core 必需的最小 Integration。

其他通用 Agent Runtime 能力默认 Deferred。
