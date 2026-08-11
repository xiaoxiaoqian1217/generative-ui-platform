# Generative UI Workbench 文档

本目录汇总 Generative UI Workbench 的当前产品和架构入口。

Workbench 当前是 Generative UI Platform 的 **真实 Agent 驱动 Generative UI Lab / 可视化开发调试工作台**。

它的首要目标是验证：

```text
Natural Language
→ Business Agent
→ Final AgentContent
→ Presentation Decision
→ trusted Presentation
→ Renderer
```

AgentContent 是 Inspect 中的可观察系统边界，不是当前 Workbench 主输入。

## 当前规范

- [Workbench 软件需求规格](../WEB_WORKBENCH_SRS.md)
- [Workbench 已接受原型基线](./PROTOTYPE_BASELINES.md)
- [ADR-0027：Presentation-first Scope Reset](../adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [ADR-0015：Presentation Router / Model Adapter](../adr/0015-presentation-router-and-model-adapter.md)
- [平台级需求](../platform/REQUIREMENTS.md)
- [平台级架构](../platform/ARCHITECTURE.md)
- [平台系统架构](../platform/SYSTEM_ARCHITECTURE.md)

## 已接受原型基线

Workbench 后续实现默认继承 Issue #174 与 Issue #179 的最终 Resolution。

当前固定组合为：

```text
#174
Conversation-first Shell
+ Inline Generated UI
+ on-demand Inspect

        ↓

#179
Swimlane Timeline
+ Artifact JSON pass-through
+ Presentation / Compiler Detail
```

ADR-0027 只调整其中 Runtime Platform 能力的阶段优先级，不重新打开已经验证完成的 Workbench UI / IA 方案。
除非出现新的业务证据、可用性问题或与当前有效 ADR 的明确冲突，否则不得重新进行同类原型选型。

## 当前主线

Workbench 当前优先建设和验证：

- Natural-language Conversation；
- Business Agent public activity；
- Final AgentContent Inspect；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Controlled Renderer；
- Theme / Presentation Context；
- Catalog；
- Viewport；
- fallback / Reliability。

Workbench 不生成 UI Plan，也不拥有 Compiler Trust。

## Conversation 边界

真实 Agent Conversation 当前保留，因为它负责驱动 Business Agent 并产生真实 AgentContent。

以下能力当前 Deferred：

- long-term Runtime-owned Conversation History；
- Conversation Rename / Archive / Delete；
- Thread / Turn / Operation 产品视图；
- Runtime Host restart recovery；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- Recovery / Reconcile；
- 完整 Runtime Diagnostics。

因此不得再把 `Conversation-first` 整体写成 Deferred。

## Supporting Integration

Workbench 当前可以继续通过 Agent Runtime Host 使用 CopilotKit / AG-UI Reference Path。

```text
Workbench
   │ AG-UI
   ▼
Reference Integration Host
   │ private Business Agent Adapter
   ▼
Business Agent
```

这条路径用于真实 Agent Integration 和 E2E，不是 Generative UI Core 的强制协议。

Business Agent 不需要实现 AG-UI。
未来替换 CopilotKit 时，Workbench 的 `Conversation → Presentation → Inspect` 心智不应改变。

## Catalog / Theme

Component Catalog 决定允许使用什么能力。
Theme 只决定已授权能力如何呈现。

Theme 不得增加 / 删除 Catalog capability、授权新的 Action、改变 Business Truth 或绕过 Compiler Policy。

## Supporting / Historical 入口

- [全链路开发验证环境](../platform/DEVELOPMENT_ENVIRONMENT.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：当前 AG-UI Reference Path](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)

这些文档不再自动定义当前 Workbench Release Gate。
