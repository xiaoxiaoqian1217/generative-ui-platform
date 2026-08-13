# Generative UI Platform Architecture

> **Status: Current**
>
> 本文描述 `dev_1.0` 当前产品路线与已接受的近期目标。
> 目标架构与已完成实现必须明确区分。

## 1. Product Boundary

Generative UI Platform 当前聚焦于验证并沉淀：

> **真实 Business Agent 如何通过 AG-UI 与 Web Workbench 交互，并逐步支持 Controlled UI、A2UI、Catalog 与 Theme。**

平台当前不是：

- 通用 Agent Runtime Platform；
- 多 Agent orchestration platform；
- 自研 UI Compiler Platform；
- Runtime Truth / Recovery Platform。

## 2. Current Implemented Baseline

当前已经验证的纵向链路是：

```text
User
  ↓
Web Workbench
  ↓
CopilotKit Frontend
  ↓ AG-UI
AGUIMock
  ↓
Frontend Tool: locateDevice
  ↓
MapLibre + DeviceCard
```

该场景证明：

- Workbench 可以消费 AG-UI；
- CopilotKit Frontend Tool 可以驱动真实浏览器能力；
- GIS 能力可以保持在前端实现；
- AGUIMock 可以作为稳定的协议测试服务。

## 3. Accepted Integration Target

ADR-0029 接受下一阶段目标：引入**薄 CopilotKit Runtime Integration Layer**。

```text
┌──────────────────────────────────────────┐
│ Web Workbench                            │
│                                          │
│ Conversation                             │
│ Controlled UI / Frontend Tools           │
│ A2UI Renderer（next phase）              │
│ Catalog / Theme（next phase）            │
└────────────────────┬─────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ CopilotKit Runtime │
            │ thin integration   │
            └─────────┬──────────┘
                      │
           ┌──────────┴───────────┐
           ▼                      ▼
       AGUIMock        single-agent-chat-server
       Test Agent          Real Business Agent
```

在 #207 完成前，上图中的 CopilotKit Runtime 仍是目标状态，不应被误写成已完成实现。

## 4. CopilotKit Runtime Boundary

CopilotKit Runtime 在当前阶段只承担 Supporting Infrastructure 职责：

- Agent registration / routing；
- server-side Agent endpoint 配置；
- 服务端 credential / header 注入；
- Workbench 到不同 Agent 的统一接入边界；
- 为后续 A2UI middleware 保留自然接入点。

它不拥有新的业务状态模型，也不重新建设：

- Thread / Turn / Operation Platform；
- Runtime Repository；
- Runtime Truth；
- Command Admission；
- Surface Lifecycle；
- Recovery / Reconcile；
- 多 Agent orchestration。

因此：

```text
CopilotKit Runtime
= thin Agent Integration Layer

≠

旧 Runtime Platform
```

## 5. Agent Sources

### 5.1 AGUIMock

AGUIMock 是 Test Agent / Capability Test Double。

主要用途：

- 稳定构造 AG-UI 事件流；
- Frontend Tool / `TOOL_CALL_*` 场景；
- failure / edge case；
- fixture / regression；
- 在真实 Agent 尚未支持某项能力时验证 Workbench 自身能力。

AGUIMock 不承载生产 Runtime 职责。

### 5.2 single-agent-chat-server

`single-agent-chat-server`（SACS）是当前真实 Business Agent interoperability 目标。

当前已知能力包括：

- AG-UI HTTP POST + SSE；
- streaming text / Run lifecycle；
- `STATE_SNAPSHOT` / `STATE_DELTA`；
- `ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA`；
- structured output / published Artifact；
- bounded `RUN_ERROR`；
- Interrupt / Resume / HITL；
- durable Run / reconnect semantics。

当前不支持：

- client-provided Frontend Tools；
- AG-UI `TOOL_CALL_*`；
- WebSocket；
- multi-agent behavior。

这些是当前 Real Agent 的 interoperability gap，不应限制 Workbench 自身能力模型，也不能由 Runtime 伪造。

## 6. UI Capability Model

Workbench 后续保留两条互补 UI 路线。

### 6.1 Controlled UI

适用于确定性、带副作用或必须由前端能力显式控制的交互：

```text
Agent
  ↓
Frontend Tool
  ↓
Browser Capability
  ↓
Controlled UI
```

典型场景：

- 地图定位；
- 绘制路线；
- 打开面板；
- 设备控制；
- 前端本地状态操作。

### 6.2 A2UI / Generative Presentation

适用于业务结果结构不确定、但展示空间需要受约束的场景：

```text
AgentContent
  ↓
A2UI
  ↓
Renderer
  ↓
Catalog + Theme
```

推荐演进顺序：

```text
Fixed A2UI Fixture
  ↓
A2UI Renderer MVP
  ↓
Basic Catalog
  ↓
Small Custom Catalog
  ↓
Theme Tokens
  ↓
Dynamic A2UI
```

第一阶段先验证 Renderer，不要求 Secondary LLM。

## 7. Shared UI Principle

Controlled UI 和 A2UI 应尽量共用同一套真实 UI Implementation。

```text
UI Primitives / Domain UI / Theme
             ▲
             │
      ┌──────┴──────┐
      │             │
Controlled UI   A2UI Renderer
```

A2UI Catalog 描述 AI 可以声明哪些 UI；它不是第二套真实组件库。

## 8. Post-Agent Presentation Direction

当 A2UI Renderer、Catalog 与 Theme 稳定后，再验证真实业务结果到 Dynamic A2UI：

```text
single-agent-chat-server
        ↓
Text / State / Activity / Artifact
        ↓
AgentContent
        ↓
Presentation Intelligence / Secondary LLM
        ↓
A2UI
        ↓
Workbench Renderer
```

SACS 不需要为了该方向理解 A2UI。
Business Agent 负责业务结果，Presentation 层负责展示决策。

## 9. Deferred Capabilities

以下方向当前明确延期：

- Runtime Thread / Turn / Operation；
- Runtime Repository / Runtime Truth；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- Runtime-owned History；
- 自研 Interaction Gateway；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 通用 GIS Agent SDK。

旧 Compiler 中关于 Validation / Policy / Controlled Generation 的思想可以作为未来 Reliability 研究输入，但不是当前 A2UI Renderer 的前置条件。

## 10. Current Roadmap

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
Basic / Custom Catalog
  ↓
Theme
  ↓
SACS AgentContent → Dynamic A2UI

Later
Runtime Platform / Controlled-generation Compiler
```

## 11. Architecture Principles

1. **先纵向跑通场景，再横向抽象公共能力。**
2. Workbench 不自研框架已经提供的 Agent Gateway / Runtime 能力。
3. 真实 Agent 当前能力与 Workbench capability 必须分开描述。
4. 目标架构与当前实现必须分开描述。
5. 不执行模型生成的任意 HTML / JavaScript。
6. 新增 Runtime / Compiler / Platform 抽象前必须有真实需求和新的架构决策。
