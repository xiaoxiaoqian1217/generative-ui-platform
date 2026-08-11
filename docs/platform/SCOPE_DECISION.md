# 平台范围调整决策摘要

## 状态

已接受。

当前阶段范围以 [ADR-0027](../adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md) 为准。
ADR-0018 保留平台扩展历史。
ADR-0019 已部分被 ADR-0027 取代。
ADR-0025 保留 Presentation Integration 与 Agent Runtime Integration 两种长期接入模式。

## 当前 North Star

> 将 Business Agent 或已有 Agent Runtime 产生的 Final AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。

当前端到端参考流程：

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

AgentContent 是可观察边界，不是 Workbench 当前主要人工输入。

## Active Core

- AgentContent / Presentation Contract；
- Presentation Router；
- Presentation Decision；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Validation / Policy / Binding / Action Descriptor；
- trusted A2UI / PresentationResult；
- Controlled Renderer contract；
- Theme / Presentation Context；
- Reliability Validation。

## Supporting

- Generative UI Workbench；
- real Agent Conversation reference experience；
- Reference Integration Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- Development / E2E tooling。

Workbench 当前是 **真实 Agent 驱动的 Generative UI Lab**。

Reference Integration Host 当前负责把 Agent Integration、Business Agent Adapter 和 Presentation Pipeline 组装成可运行参考链路。

Supporting 不得反向定义 Core 产品边界。

## Presentation Router

ADR-0015 继续有效。

Markdown 和 structured data 都可以进入 Router。
Router 可以确定性决策；只有需要展示语义分析时才调用 Presentation Model。
最终 Decision 为 `markdown | generative-ui`，只有 generative-ui 分支包含 UI Plan Candidate。

输入类型不等于展示模式。

## Catalog / Theme

Component Catalog 是 capability authority，决定允许使用什么组件 / Action 能力。

Theme 只决定已授权能力如何呈现，可以影响 design tokens、typography、spacing、density、layout preferences 和 Catalog 已授权 variants。

Theme 不得增加 / 删除 Catalog capability、授权新 Action、改变 Business Truth 或绕过 Compiler Policy。

## Conversation 边界

真实自然语言 Conversation 当前保留，因为它负责产生真实 AgentContent，并验证完整 Agent → Presentation 链路。

当前 Deferred 的是：

- long-term Runtime-owned Conversation History；
- Rename / Archive / Delete；
- 完整 Conversation Management；
- Runtime Host restart recovery；
- Thread / Turn / Operation 产品化。

## Deferred Runtime Platform

以下能力保留既有设计与实现，但当前停止扩张：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- long-term Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

ADR-0024 继续约束仍存在的 Runtime 路径。
这些能力不再属于当前 Presentation-first MVP Release Gate。

## Framework 边界

Generative UI Core 必须保持 Agent Framework 中立。

CopilotKit 和 AG-UI 是当前 Reference Integration，不是 Generative UI Core 的强制依赖。
未来即使不使用 CopilotKit，Presentation Router、UI Compiler Core、Catalog 和 Theme 也必须独立成立。

Presentation Integration 的稳定公共 API 仍需要独立决策。

## 当前功能准入标准

新增功能必须至少直接提升：

1. `AgentContent → Presentation` 语义正确性；
2. Theme / Presentation Context 一致性；
3. 模型候选到 trusted A2UI 的安全性和可靠性；
4. 真实 Agent 驱动 Generative UI 的可调试、可验证能力；
5. Core 必需的最小 Integration。

长期 Conversation Service、Workflow Recovery、Runtime Repository 或 Runtime Observability 默认 Deferred。

当前不建设 Presentation Quality 自动评分体系。

## 迁移原则

本次 Scope Reset 先修改架构和产品文档，不先大规模删除代码。

后续：

1. 保持真实 Conversation → Business Agent → AgentContent → Presentation 主链路；
2. 停止新增 Deferred Runtime 功能；
3. 将 Workbench 聚焦真实 Agent 驱动的 Generative UI Lab；
4. 审查 Presentation Contract / Pipeline 中残留的 Runtime / Surface metadata；
5. 通过独立 Issue / PR 决定旧 Runtime 代码保留、隔离或删除。

Interaction Gateway 和多 Agent 路由仍不属于当前阶段。
