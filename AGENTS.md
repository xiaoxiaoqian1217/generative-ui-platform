# Repository Instructions for Coding Agents

## Current scope

当前阶段已经从单一 Controlled UI 验证推进到两步主线：

```text
Step 1
统一 Agent 服务端接入边界
Workbench → thin CopilotKit Runtime → AGUIMock / SACS

Step 2
进入 A2UI Renderer / Catalog / Theme 实践
```

已经跑通的第一条纵向场景仍然是 `locateDevice`：Agent 发起前端工具调用，Workbench 通过 `useFrontendTool` 驱动 MapLibre 定位设备。

当前阶段继续遵守：

> **先纵向跑通场景，再横向抽象公共能力。**

## Current implementation fact

在 #207 尚未实现前，当前可执行基线仍是：

```text
AGUIMock
  ↓ AG-UI
CopilotKit Frontend
  ↓
Web Workbench
  ↓
Frontend Tool / MapLibre / DeviceCard
```

不得把尚未落地的 CopilotKit Runtime 或 A2UI 目标写成已经实现的代码事实。

## Accepted target architecture

ADR-0029 已接受：

```text
Web Workbench
      ↓
CopilotKit Runtime
thin Integration Layer
      ↓
┌───────────────┬──────────────────────┐
│               │                      │
AGUIMock        single-agent-chat-server
```

CopilotKit Runtime 只允许承担 Supporting Infrastructure 职责：

- Agent registration / routing；
- server-side endpoint 与 credential；
- Workbench 的统一 Agent integration endpoint；
- CopilotKit / AG-UI / A2UI 所需的最小 middleware integration。

不得在 #207 中把它扩展为自研 Runtime Platform。

## Agent source roles

### AGUIMock

用于：

- deterministic capability fixture；
- Frontend Tool / `TOOL_CALL_*`；
- regression / failure scenarios。

### single-agent-chat-server

用于真实 Business Agent interoperability，当前重点消费：

- streaming text；
- Run lifecycle / `RUN_ERROR`；
- State Snapshot / Delta；
- Activity Snapshot / Delta；
- Artifact / structured result；
- Interrupt / Resume。

当前 SACS profile 不支持 client-provided Frontend Tools。
不得由 Runtime 或 Workbench 伪造 Tool Calling 来掩盖这一 capability gap。

## Active modules

当前已经存在：

```text
apps/
└─ web-workbench/

packages/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

职责：

- `apps/web-workbench`：当前产品主体与交互 / Generative UI 实验场。
- `packages/ag-ui-mock`：可复用 AG-UI 测试服务。
- `packages/ag-ui-adapter`：仅允许承载 AG-UI 协议边界辅助能力。
- `packages/shared-types`：最小跨模块共享类型。

#207 可以增加最小 CopilotKit Runtime Host，但应选择现有 Monorepo 中最小自然落点。
不得因为历史代码存在就恢复 `apps/agent-runtime-host`。

## Removed compatibility contracts

以下迁移期契约已经解除依赖并删除，不要重新创建：

```text
packages/compiler-contract/
packages/presentation-contract/
packages/runtime-contract/
```

Workbench 使用 CopilotKit / 原生 AG-UI 契约。
AG-UI Adapter 只使用 `@ag-ui/core` 原生契约。

## A2UI phase admission

ADR-0029 已经明确允许 A2UI 重新进入 focused implementation，但必须按以下顺序：

```text
A2UI Renderer MVP
  ↓
Fixed Fixtures
  ↓
Basic Catalog
  ↓
Small Custom Catalog
  ↓
Theme Tokens
  ↓
Dynamic A2UI
```

约束：

- 第一阶段先证明 Renderer，不先接 Secondary LLM；
- 优先复用 CopilotKit Basic Catalog / 现成 Renderer 能力；
- Custom Catalog 优先增加 Metric / StatusBadge / InfoRow 等高复用展示语义；
- DeviceCard / AlarmCard / TaskCard 只有出现真实复用后再抽成公共能力；
- Controlled UI 与 A2UI 尽量复用同一套真实 UI implementation / Theme；
- 不为了做 A2UI 恢复旧 Compiler / Presentation contracts。

## Frozen architecture

以下 Workbench 能力继续保留：

- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- 本地 A2UI reducer、受控 renderer、raw viewer 与 component registry；
- 已接受的 Workbench shell 与 inspection 原型基线；
- case-library 与 inspection 支持。

与 A2UI Renderer / Catalog / Theme 直接相关的能力，在 ADR-0029 后可以按当前阶段目标进行 focused implementation。
Inspect 等其他能力仍不得借机恢复旧 Runtime Platform。

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

历史 Compiler 研究可以作为以后 Reliability / Controlled Generation 的设计输入，但不是当前 A2UI Renderer 的前置条件。

## Out of scope for the current phase

除非新的真实需求明确证明必要，不实现：

- Thread / Turn / Operation 平台模型；
- Runtime Repository；
- Runtime Truth；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- runtime-owned durable history；
- 自研 Business Agent；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 多 Agent orchestration platform；
- 通用 GIS Agent SDK。

## Feature admission gate

任何新 Issue / PR / 模块必须优先回答：

1. 是否直接服务 #207 Agent integration、#200 Real Agent interoperability 或下一阶段 A2UI 验证？
2. 是否由已经跑通或正在验证的真实场景提出？
3. 是否可以先在 `web-workbench` 内最小实现，再根据第二个真实消费者抽象？
4. CopilotKit / AG-UI / A2UI 已经提供的能力是否可以直接复用？
5. 是否正在无意中恢复旧 Runtime / Compiler / Presentation Platform？

没有真实复用证据时，不提前建立自研平台层、通用 Catalog Package、Compiler 或 Runtime 抽象。

## Dependency rules

- Apps 可以依赖 packages，packages 不得依赖 apps。
- Workbench 优先使用 CopilotKit 提供的 Frontend / Runtime / A2UI 能力，不重复实现框架已有职责。
- CopilotKit Runtime 是 Supporting Infrastructure，不拥有产品 Runtime Truth。
- AG-UI Mock 只模拟 Business Agent 的协议行为，不承载产品 Runtime。
- SACS capability gap 必须显式呈现，不伪造协议能力。
- GIS 实现属于浏览器前端；Agent 只看到稳定的 Frontend Tool capability。
- 不执行模型生成的任意 HTML / JavaScript。

## Current roadmap

```text
Completed
#202 Controlled UI Vertical Slice

Current
#207 Thin CopilotKit Runtime
  ↓
#200 Real SACS Interoperability

Next
A2UI Renderer MVP
  ↓
Catalog + Theme
  ↓
SACS AgentContent → Dynamic A2UI

Later
Runtime Platform / controlled-generation Compiler
```

## Branch and change safety

- 默认目标分支为 `dev_1.0`。
- 修改前检查当前范围，不因为历史文档存在就恢复已删除架构。
- 大范围架构变更需要用户明确授权。
- 当前阶段决策以 ADR-0029 为主；ADR-0028 继续约束 native AG-UI、Removed/Historical 边界与已删除 contracts。
- Historical 文档不是当前实现规范。
