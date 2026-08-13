# Project Context

## Current objective

Generative UI Platform 当前不是 Agent Runtime Platform，也不是完整 UI Compiler Platform。

当前目标是通过真实场景验证：

```text
Business Agent / AGUIMock
        ↓ AG-UI
CopilotKit
        ↓
Web Workbench
        ↓
Controlled UI / Frontend Tool / MapLibre
```

第一阶段只需要证明 Agent 可以通过 AG-UI 驱动前端真实能力，并且 Workbench 能稳定调试这条链路。

## Current product

`apps/web-workbench` 是当前产品主体。

当前优先能力：

- Agent Conversation；
- CopilotKit 集成；
- AG-UI 传输与事件观察；
- `useFrontendTool`；
- 受控业务组件；
- MapLibre GIS Workspace；
- AG-UI Mock 场景。

当前第一条纵向场景：

```text
“定位无人机 01”
→ AG-UI TOOL_CALL locateDevice
→ Workbench useFrontendTool
→ MapLibre 定位设备
→ tool result 返回 Agent
```

## Active repository structure

```text
apps/
└─ web-workbench/

packages/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

以下三个迁移期兼容合同已经解除依赖并删除：

```text
packages/compiler-contract/
packages/presentation-contract/
packages/runtime-contract/
```

不要重新创建它们。
Workbench 直接使用 CopilotKit / AG-UI，AG-UI Adapter 只使用 `@ag-ui/core` 原生契约。

## Frozen Workbench capabilities

现有 Playground、Inspect、Cases、Catalog、Scenarios 与 Settings 路由继续保留。
本地 A2UI reducer、受控 renderer、raw viewer、component registry、已接受的 shell 原型、case library 与 inspection 支持也继续保留。

这些能力属于冻结，而不是废除。
它们可以接受兼容性维护，但不属于当前 Release Gate，也不得重新依赖已删除的 contracts。

## Removed implementation

以下上一阶段实现已经退出当前主线并删除：

```text
apps/agent-runtime-host/
apps/business-agent-langgraph/
packages/business-agent-adapter/
packages/component-catalog-schema/
packages/presentation-pipeline/
packages/ui-compiler-core/
```

同时删除围绕 Runtime Platform 建立的启动、环境、E2E、Workspace contract 辅助代码。

历史恢复点：

```text
archive/pre-scope-reset-2026-08-13
c33504db91614420c2ccdf26a8c707f61d659065
```

## Architecture principle

当前采用渐进式方案：

> **先纵向跑通一个场景，再横向抽象公共能力。**

因此：

- 第一个 DeviceCard 可以先是 Workbench 内最小受控组件；
- 第二、第三个真实场景出现后，再判断是否抽 Component Catalog；
- Frontend Tool 先验证 GIS 能力，再考虑通用 Web SDK；
- A2UI、Theme、Secondary LLM 等能力等受控 UI 主链路稳定后再进入下一阶段。

## Explicitly deferred

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- Runtime-owned History；
- Runtime Truth Diagnostics；
- 多 Agent Interaction Gateway；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 完整 A2UI Catalog / Theme Platform；
- 通用 GIS Agent SDK。

这些方向不是错误，只是当前没有真实需求证明需要承担其复杂度。
