# 平台范围调整决策摘要

## 状态

已接受。

当前阶段范围以 [ADR-0027](../adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md) 为准。
ADR-0018 保留平台扩展历史。
ADR-0025 保留 Presentation Integration 与 Agent Runtime Integration 两种长期接入模式。

## 当前 North Star

Generative UI Platform 当前阶段只聚焦一个核心问题：

> 将 Business Agent 或已有 Agent Runtime 产生的 Markdown / structured AgentContent，转换为美观、可靠、主题一致且受控的 Presentation。

当前核心链路为：

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

## Active Core

当前 Core 包括：

- AgentContent / Presentation Contract；
- Presentation Router；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Validation / Policy / Binding / Action Descriptor 约束；
- trusted A2UI / PresentationResult；
- 受控 Renderer；
- Theme / Presentation Context；
- Generative UI reliability evaluation。

## Supporting

以下能力当前用于接入、调试、演示和验证 Core：

- Generative UI Workbench；
- Agent Runtime Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- 开发环境与 E2E。

Supporting 能力不得反向定义 Core 的产品边界。

Generative UI Workbench 当前定位为 **Generative UI Lab / 可视化开发调试工作台**。
它优先验证 AgentContent、Presentation Decision、UI Plan、Validation、A2UI、Renderer、Theme、Catalog 和生成稳定性。

Agent Runtime Host 当前定位为参考 Integration Host。
它可以继续承载 CopilotKit / AG-UI 参考路径和 Presentation Pipeline，但不是当前产品核心。

## Deferred Runtime Platform

以下能力保留设计与已有实现，但当前停止扩张：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

ADR-0024 继续约束仍然存在的 Runtime 路径。
这些能力不再属于当前 Presentation-first MVP Release Gate。

未来只有在明确需要平台拥有 Stateful Interaction 和 Action Execution Authority 时，才重新启动 Agent Runtime Integration 的产品化工作。

## 框架边界

Generative UI Core 必须保持 Agent Framework 中立。

CopilotKit 和 AG-UI 是当前参考 Integration，而不是 Generative UI Core 的强制依赖或长期产品边界。
未来即使不使用 CopilotKit，Presentation Pipeline 和 UI Compiler Core 也必须能够独立成立。

Presentation Integration 的稳定公共 API 形态仍需要后续独立决策。

## 当前功能准入标准

当前阶段新增功能必须至少直接提升以下一项：

1. `AgentContent → Presentation` 的语义正确性；
2. 生成 UI 的视觉质量或主题一致性；
3. 模型输出到 trusted A2UI 的安全性和可靠性；
4. Generative UI 的可调试、可比较、可评测能力；
5. 为 Core 提供必要且最小的 Framework / Runtime Integration。

主要解决通用 Agent Runtime、Conversation Service、Workflow Recovery 或 Runtime Observability 的功能默认属于 Deferred。

## 迁移原则

本次 Scope Reset 先修改架构和产品文档，不先大规模删除代码。

现有 Runtime Platform 代码继续存在期间保持安全约束和测试。
后续通过独立 Issue / PR 逐步判断哪些代码应该保留、隔离或删除。

旧 Compiler MVP 文档继续保留，并继续约束 Compiler 子系统。
Interaction Gateway 和多 Agent 路由仍不属于当前阶段。
