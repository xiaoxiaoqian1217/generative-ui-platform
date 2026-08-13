# Repository Instructions for Coding Agents

## Current scope

当前唯一 Active Track：

> **Business Agent / AGUIMock → AG-UI → CopilotKit → Web Workbench → Controlled UI / Frontend Tool。**

当前阶段的架构原则：

> **先纵向跑通一个真实场景，再横向抽象公共能力。**

第一条场景是 `locateDevice`：Agent 发起前端工具调用，Workbench 通过 `useFrontendTool` 驱动 MapLibre 定位设备，再把工具结果返回 Agent。

## Active modules

```text
apps/
└─ web-workbench/

packages/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

职责：

- `apps/web-workbench`：当前产品主体与交互实验场。
- `packages/ag-ui-mock`：可复用 AG-UI 测试服务。
- `packages/ag-ui-adapter`：仅允许承载 AG-UI 协议边界辅助能力。
- `packages/shared-types`：最小跨模块共享类型。

## Removed compatibility contracts

以下迁移期契约已经解除依赖并删除，不要重新创建：

```text
packages/compiler-contract/
packages/presentation-contract/
packages/runtime-contract/
```

Workbench 直接使用 CopilotKit / AG-UI，AG-UI Adapter 只使用 `@ag-ui/core` 原生契约。

## Frozen architecture

以下 Workbench 能力为后续阶段保留，但不属于当前 Release Gate：

- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- 本地 A2UI reducer、受控 renderer、raw viewer 与 component registry；
- 已接受的 Workbench shell 与 inspection 原型基线；
- 已解除旧 contract 依赖的 case library 与 inspection 支持。

冻结表示保留但不扩建平台能力。
不要把冻结能力当作迁移债务删除，也不要用它们恢复已移除的 Runtime / Compiler / Presentation 架构。

## Removed architecture

不要重新创建或恢复以下模块，除非用户明确开启新的架构阶段：

- `apps/agent-runtime-host`；
- `apps/business-agent-langgraph`；
- `packages/business-agent-adapter`；
- `packages/component-catalog-schema`；
- `packages/presentation-pipeline`；
- `packages/ui-compiler-core`；
- Runtime Platform 配套脚本与 Workspace 架构测试。

旧代码恢复点：

```text
archive/pre-scope-reset-2026-08-13
c33504db91614420c2ccdf26a8c707f61d659065
```

## Out of scope for the current phase

除非真实纵向场景证明必要，不实现：

- Thread / Turn / Operation 平台模型；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- Runtime Truth / 完整 Diagnostics；
- 自研 Business Agent；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- A2UI 平台化能力；
- Theme 平台化能力；
- 通用 GIS Agent SDK。

## Feature admission gate

任何新 Issue / PR / 模块必须优先回答：

1. 是否直接服务当前 `Agent → AG-UI → Workbench → Frontend Tool` 链路？
2. 是否由已经跑通或正在跑通的真实场景提出？
3. 是否可以先在 `web-workbench` 内最小实现，再根据第二个场景抽象？

没有真实复用证据时，不提前建立平台层、Catalog、Compiler、Runtime 抽象。

## Dependency rules

- Apps 可以依赖 packages，packages 不得依赖 apps。
- Workbench 优先使用 CopilotKit 提供的 AG-UI / Frontend Tool 能力，不重复实现框架已有职责。
- AG-UI Mock 只模拟 Business Agent 的协议行为，不承载产品 Runtime。
- GIS 实现属于浏览器前端；Agent 只看到稳定的 Frontend Tool capability。
- 不执行模型生成的任意 HTML / JavaScript。

## Branch and change safety

- 默认目标分支为 `dev_1.0`。
- 修改前检查当前范围，不因为历史文档存在就恢复已删除架构。
- 大范围架构变更需要用户明确授权；不得以历史文档为依据恢复旧 Runtime / Compiler / Presentation 实现。
- 保持改动与当前纵向场景相关，避免顺手扩展未来能力。
- ADR-0028 是当前阶段决策，并定义 Active、Frozen、Removed 与 Historical 的区别。
