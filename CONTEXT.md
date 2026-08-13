# Project Context

## Current objective

Generative UI Platform 当前不是 Agent Runtime Platform，也不是完整 UI Compiler Platform。

当前目标已经从“只证明一个 Controlled UI 场景”推进到：

> **先统一真实 Agent 的服务端接入边界，再进入 A2UI Renderer / Catalog / Theme，验证业务结果不确定时的受控 Generative UI。**

已经跑通的第一条纵向场景是：

```text
AGUIMock
   ↓ AG-UI TOOL_CALL
CopilotKit Frontend
   ↓
useFrontendTool("locateDevice")
   ↓
MapLibre + DeviceCard
```

它证明 Frontend Tool + Controlled UI 路线成立。

## Current implementation vs accepted target

### Current executable baseline

当前仓库通过 thin CopilotKit Runtime 暴露统一 Agent integration endpoint：

```text
Web Workbench
   ↓
CopilotKit Runtime
   ↓
AGUIMock / single-agent-chat-server
```

AGUIMock 继续作为确定性测试 Agent，SACS 作为真实 Business Agent profile。

### Accepted integration target

ADR-0029 接受以下目标：

```text
Web Workbench
      ↓
CopilotKit Runtime
thin Integration Layer
      ↓
┌───────────────┬──────────────────────┐
│               │                      │
AGUIMock        single-agent-chat-server
Test Agent      Real Business Agent
```

CopilotKit Runtime 当前只作为 Supporting Infrastructure：

- Agent registration / routing；
- server-side Agent endpoint；
- credential / header 注入；
- Workbench 到不同 Agent 的统一服务端边界；
- CopilotKit / AG-UI / A2UI middleware 接入点。

它不是旧的 Runtime Platform，也不拥有业务 Runtime Truth。

## Real Agent baseline

`single-agent-chat-server` 是当前真实 Business Agent 互操作目标。

当前 SACS AG-UI profile 已支持：

- HTTP POST + SSE；
- streaming text / Run lifecycle；
- bounded `RUN_ERROR`；
- `STATE_SNAPSHOT` / `STATE_DELTA`；
- `ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA`；
- structured output / Artifact；
- Interrupt / Resume；
- durable Run / reconnect 语义。

当前不支持：

- client-provided Frontend Tools；
- `TOOL_CALL_*`；
- WebSocket；
- multi-Agent behavior。

这属于当前 Real Agent interoperability gap，不代表 Workbench 要删除 Frontend Tool 能力。

## Agent source roles

```text
AGUIMock
→ deterministic capability fixture
→ Frontend Tool / TOOL_CALL
→ regression / failure scenario

single-agent-chat-server
→ real Business Agent interoperability
→ Text / State / Activity / Artifact / Interrupt
```

两类 Agent 可以通过同一 Workbench / Runtime 集成边界使用，但 capability 必须显式区分。
Runtime 不得伪造 SACS 不支持的 Tool Calling。

## Current product

`apps/web-workbench` 仍然是当前产品主体。

当前与下一阶段优先能力：

- Agent Conversation；
- CopilotKit Frontend；
- AG-UI 传输与事件观察；
- `useFrontendTool`；
- Controlled UI；
- MapLibre GIS Workspace；
- AGUIMock 场景；
- Real SACS interoperability；
- A2UI Renderer；
- Component Catalog 实践；
- Theme 实践。

## Active repository structure

当前已经存在：

```text
apps/
├─ copilot-runtime/
└─ web-workbench/

packages/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

`apps/copilot-runtime` 是已经落地的最小 CopilotKit Runtime Host。
不要为了目录形式恢复旧的 `apps/agent-runtime-host`。

以下三个迁移期兼容合同已经解除依赖并删除：

```text
packages/compiler-contract/
packages/presentation-contract/
packages/runtime-contract/
```

不要重新创建它们。
Workbench 继续直接使用 CopilotKit / 原生 AG-UI 契约。

## A2UI next phase

统一 Agent integration boundary 已经建立，产品主线进入：

```text
A2UI Renderer MVP
        ↓
Fixed A2UI Fixture
        ↓
Basic Catalog
        ↓
Small Custom Catalog
        ↓
Theme Tokens
        ↓
SACS AgentContent → Dynamic A2UI
```

第一步先证明 Renderer，不先要求 Secondary LLM。

Catalog 优先积累可复用展示语义，例如：

- Metric；
- StatusBadge；
- InfoRow。

DeviceCard / AlarmCard / TaskCard 等领域组件只有在真实复用出现后再提升为公共 Catalog 能力。

Controlled UI 和 A2UI 应尽量复用同一套真实 UI Implementation 与 Theme。

## Architecture principle

当前仍采用渐进式方案：

> **先纵向跑通场景，再横向抽象公共能力。**

现在的具体含义是：

1. `locateDevice` 已证明 Controlled UI 可行；
2. #207 先统一 Agent 接入边界；
3. #200 用真实 SACS 验证 AG-UI interoperability；
4. A2UI 先从 Renderer + Fixture 开始；
5. 出现第二个真实消费者后再抽公共 Catalog / UI Package；
6. Theme 随 Catalog 增长，不独立建设大平台；
7. Dynamic A2UI 在 Renderer / Catalog 稳定后再引入 Secondary LLM。

## Frozen / reactivated Workbench capabilities

Playground、Inspect、Cases、Catalog、Scenarios 与 Settings 路由继续保留。
本地 A2UI reducer、受控 renderer、raw viewer、component registry、已接受的 shell 原型、case library 与 inspection 支持也继续保留。

其中与 A2UI Renderer / Catalog / Theme 直接相关的能力，在 ADR-0029 之后可以为下一阶段进行 focused implementation。
这不代表恢复旧 Presentation Pipeline / UI Compiler / Runtime Platform。

## Removed implementation

以下上一阶段实现仍保持删除：

```text
apps/agent-runtime-host/
apps/business-agent-langgraph/
packages/business-agent-adapter/
packages/component-catalog-schema/
packages/presentation-pipeline/
packages/ui-compiler-core/
```

同时仍保持删除围绕 Runtime Platform 建立的启动、环境、E2E、Workspace contract 辅助代码。

历史恢复点：

```text
archive/pre-scope-reset-2026-08-13
c33504db91614420c2ccdf26a8c707f61d659065
```

历史 Compiler 研究可以作为后续 Reliability / Controlled Generation 输入，但不是当前 A2UI Renderer 的前置条件。

## Explicitly deferred

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- Runtime-owned History；
- Runtime Truth Diagnostics；
- 多 Agent orchestration platform；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 通用 GIS Agent SDK。

这些方向不是错误，只是当前没有真实需求证明需要承担其复杂度。

## Current roadmap

```text
Completed
#202 Controlled UI Vertical Slice
#207 Thin CopilotKit Runtime

Current
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
