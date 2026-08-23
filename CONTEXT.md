# Project Context

## Current objective

Generative UI Platform 当前不是 Agent Runtime Platform，也不是完整 UI Compiler Platform。

当前目标已经从“只证明一个 Controlled UI 场景”推进到：

> **在已经落地的薄 Agent 接入、A2UI Renderer、Platform Catalog 和受控 Dynamic A2UI 基线上，继续验证真实 SACS 互操作、地图人机协作证据和真实 AgentContent 的生成式展示。**

当前已经跑通的空间交互纵向场景是：

```text
AGUIMock
   ↓ AG-UI TOOL_CALL / ACTIVITY
CopilotKit Frontend
   ↓
useFrontendTool(map-domain intents) / A2UI Renderer
   ↓
MapLibre persistent surface / controlled A2UI surface
```

它证明 Frontend Tool + Controlled UI 路线成立，受控 Dynamic A2UI 链路也已经由独立的 Renderer、共享 Catalog 和 Secondary Presentation LLM 跑通。

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

map-validation-agent
→ dev-only real LLM interaction validation
→ versioned run-scoped map scenarios
→ existing Frontend Tools / HITL / real Tool Result continuation
```

三类 Agent 可以通过同一 Workbench / Runtime 集成边界使用，但 capability 必须显式区分。
Runtime 不得伪造 SACS 不支持的 Tool Calling。

## Current product

`apps/web-workbench` 仍然是当前产品主体。

当前优先能力：

- Agent Conversation；
- CopilotKit Frontend；
- AG-UI 传输与事件观察；
- `useFrontendTool`；
- Controlled UI；
- MapLibre GIS Workspace；
- AGUIMock 场景；
- Real SACS interoperability；
- A2UI Renderer、Platform Catalog 与受控 Dynamic A2UI；
- Scenario Lab 与生成结果评估；
- dev-only Map Validation Agent 的真实模型 smoke 和地图人机协作评估；
- 真实 SACS AgentContent 到 Dynamic A2UI；
- 按真实需要后置的 Theme 实践。

## Active repository structure

当前已经存在：

```text
apps/
├─ copilot-runtime/
├─ map-validation-agent/
└─ web-workbench/

packages/
├─ a2ui-catalog/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

`apps/copilot-runtime` 是已经落地的最小 CopilotKit Runtime Host。
`apps/map-validation-agent` 是独立、默认关闭的 dev-only LangGraph server，不嵌入 Runtime 进程，也不替代 SACS。
`packages/a2ui-catalog` 只承载 Runtime 与 Workbench 共享的 Platform Catalog definitions。
不要为了目录形式恢复旧的 `apps/agent-runtime-host`。

以下三个迁移期兼容合同已经解除依赖并删除：

```text
packages/compiler-contract/
packages/presentation-contract/
packages/runtime-contract/
```

不要重新创建它们。
Workbench 继续直接使用 CopilotKit / 原生 AG-UI 契约。

## A2UI current phase

统一 Agent integration boundary 与受控 A2UI 主链路已经建立：

```text
A2UI Renderer MVP（已完成）
        ↓
Fixed A2UI Fixture（已完成）
        ↓
Basic Catalog（已完成）
        ↓
Platform Catalog MVP（已完成）
        ↓
Dynamic A2UI（受控内容，已完成）
        ↓
SACS AgentContent → Dynamic A2UI
```

Theme Tokens 经 ADR-0030 后置，不再是 Dynamic A2UI 的前置条件。

Catalog 优先积累可复用展示语义，例如：

- Metric；
- StatusBadge；
- InfoRow。

任何空间或业务领域组件只有在真实复用出现后再提升为公共 Catalog 能力。

Controlled UI 和 A2UI 应尽量复用同一套真实 UI Implementation 与 Theme。

## Architecture principle

当前仍采用渐进式方案：

> **先纵向跑通场景，再横向抽象公共能力。**

现在的具体含义是：

1. 共享空间表面上的巡逻方案研判与路线征询已经证明地图域意图、HITL 和 Tool Result continuation 可以闭环；
2. Issue #207 已统一 Agent 接入边界；
3. Issue #206、Issue #209 与 Issue #210 已依次证明 Renderer、Catalog 与受控 Dynamic A2UI；
4. Issue #213 已落地 dev-only Scenario Lab 与评估边界；
5. Issue #216 已落地独立 Map Validation Agent，真实模型 smoke 和行为评估继续进行；
6. Issue #200 继续用真实 SACS 验证 AG-UI interoperability；
7. 下一步将真实 SACS AgentContent 接入 Dynamic A2UI；
8. Theme 随真实展示需要后置，不独立建设大平台。

## Frozen / reactivated Workbench capabilities

Playground、Inspect、Cases、Catalog、Scenarios 与 Settings 路由继续保留。
已接受的 shell 原型、case library 与 inspection 支持也继续保留。
原 Compiler 时代的本地 A2UI reducer、受控 renderer、raw viewer 与 component registry 已删除，不再保留为 frozen 能力。

其中 A2UI Renderer、Catalog 与受控 Dynamic A2UI 已按 ADR-0029 / ADR-0030 完成 focused implementation；Theme 与真实 SACS AgentContent 展示继续按当前路线推进。
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
#206 A2UI Renderer MVP
#209 Platform Catalog MVP
#210 Dynamic A2UI MVP (controlled content)
#213 Generative UI Scenario and Evaluation MVP
#216 Dev-only Map Validation Agent implementation

Current
  ↓
#200 Real SACS Interoperability
Map interaction real-provider smoke and human evaluation

Next
SACS AgentContent → Dynamic A2UI

Postponed per ADR-0030
Theme Tokens

Later
Runtime Platform / controlled-generation Compiler
```
