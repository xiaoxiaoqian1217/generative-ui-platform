# ADR-0029：采用薄 CopilotKit Runtime 接入边界，并启动 A2UI 下一阶段

- **状态：** Accepted
- **日期：** 2026-08-13
- **范围：** 当前仓库阶段、Web Workbench、Agent 接入边界、A2UI 下一阶段

## 背景

ADR-0028 有意将仓库收敛到一条基于真实证据推进的纵向主线，并移除了上一阶段的 Runtime Platform / Presentation Compiler 实现。
这次 Scope Reset 是必要的，其核心决策继续有效。

第一个受控交互场景已经通过 AGUIMock 跑通：

```text
用户
  ↓
Web Workbench
  ↓
CopilotKit / AG-UI
  ↓
Frontend Tool: locateDevice
  ↓
MapLibre + DeviceCard
```

这证明 AG-UI + CopilotKit Frontend Tool 可以驱动真实浏览器能力。
下一步真实集成目标是 #200 跟踪的业务 Agent：`zhouwen-giser/single-agent-chat-server`。

当前 SACS AG-UI Profile 已经具备有价值的真实 Agent 能力：

- AG-UI HTTP POST + SSE；
- streaming text 与 Run lifecycle；
- `STATE_SNAPSHOT` / `STATE_DELTA`；
- `ACTIVITY_SNAPSHOT` / `ACTIVITY_DELTA`；
- structured output 与已发布 Artifact；
- bounded `RUN_ERROR`；
- interrupt / resume 与 human-in-the-loop；
- 由 SACS 自己维护的 durable Run / reconnect 语义。

SACS 当前**不支持** client-provided Frontend Tools，也不提供 AG-UI `TOOL_CALL_*` 行为。
这是当前真实 Agent Profile 的互操作缺口，不应该被复制成 Workbench 自身的能力上限。

SACS 还要求服务端 credential 与签名身份 header。
这些敏感信息不能进入浏览器 bundle。
如果 Workbench 自己直接适配每个 Agent 的 endpoint、认证、路由和 middleware，浏览器应用会逐渐演化成 Agent Gateway。

与此同时，产品方向已经从“只验证一个 Controlled UI 场景”继续向前推进。
下一步需要验证：当未来业务 Agent 的结果结构不确定时，A2UI 能否提供受约束的生成式展示能力。

ADR-0028 明确要求：重新激活 Runtime 或 A2UI 平台能力前，需要新的阶段决策。
本 ADR 就是这一阶段决策。

## 决策

### 1. 引入薄 CopilotKit Runtime 作为支撑性的 Agent 接入层

目标 Agent 接入拓扑为：

```text
┌──────────────────────────────────────┐
│ Web Workbench                        │
│ CopilotKit Frontend / A2UI Renderer  │
└──────────────────┬───────────────────┘
                   │
                   ▼
          ┌───────────────────┐
          │ CopilotKit Runtime│
          │ 薄集成层          │
          └─────────┬─────────┘
                    │
          ┌─────────┴───────────────┐
          ▼                         ▼
      AGUIMock          single-agent-chat-server
      测试 Agent             真实 Agent
```

CopilotKit Runtime 是**支撑性基础设施**，不是产品领域中的 Runtime 所有者。

当前阶段允许它承担的职责仅限于：

- Agent 注册与路由；
- 服务端 Agent endpoint 配置；
- 服务端 credential / header 注入；
- Workbench 到 Agent 的统一接入 endpoint；
- 当前 CopilotKit / AG-UI / A2UI 集成需要的框架 middleware。

实现由 #207 跟踪。

在 #207 完成前，已有的 Workbench → AGUIMock 路径仍然是当前可执行基线。
文档必须明确区分这个实现事实和上面的已接受目标架构。

### 2. 保留 AGUIMock 与 SACS 两类不同职责的 Agent 来源

两类 Agent 来源承担不同目标：

```text
AGUIMock
  → deterministic capability fixture / test double
  → Frontend Tool / TOOL_CALL 场景
  → regression / failure 场景

single-agent-chat-server
  → 真实业务 Agent 互操作
  → Text / State / Activity / Artifact / Interrupt
  → 当前 Profile 不提供 Frontend Tools
```

Workbench 不得假设所有已注册 Agent 都具有相同能力。
能力差异必须显式表达。

Runtime 不得伪造 Tool Calling 事件，使 SACS 看起来支持它没有发布的能力。

### 3. #200 通过统一接入边界验证真实 AG-UI 互操作

Issue #200 继续承担 Real Agent Profile / interoperability 验证。
它的价值不应缩减成“文本聊天能通”。

真实 SACS 集成应重点验证它已经发布的业务 AG-UI 事实：

- streaming text；
- Run lifecycle 与 bounded error；
- State；
- Activity；
- Artifact / structured business result；
- capability discovery；
- 场景可用时的 interrupt / resume。

SACS 自己负责的 durable Run 语义应被正确消费，但不能因此重新建设 Workbench Runtime Repository 或 Recovery Platform。

### 4. 旧 Runtime Platform 继续延期

CopilotKit Runtime 不是已删除 Runtime Platform 的新名字。

以下能力继续明确延期，并且 #207 不得重新引入：

- Thread Platform；
- Turn / Operation Repository；
- Runtime Truth；
- Command Admission；
- Surface Lifecycle；
- Recovery / Reconcile Platform；
- runtime-owned durable history；
- 自研多 Agent 编排平台。

如果未来真实场景证明这些能力必要，需要新的证据和独立架构决策。

### 5. 将 A2UI 启动为下一产品研究阶段

薄 Runtime 接入边界建立后，产品主线进入 A2UI。

实现顺序保持渐进式：

```text
A2UI Renderer MVP
  ↓
固定 A2UI fixtures
  ↓
Basic Catalog
  ↓
小规模 Custom Catalog
  ↓
Theme tokens
  ↓
真实 AgentContent → Dynamic A2UI
```

第一个 A2UI 里程碑必须先证明 Renderer，再引入 Secondary LLM。

Catalog 初期优先积累可复用的展示语义，例如：

- Metric；
- StatusBadge；
- InfoRow。

只有在出现真实复用证据后，再增加 DeviceCard / AlarmCard / TaskCard 等更具体的领域组件。

Controlled UI 与 A2UI 应尽可能复用同一套真实前端 UI 实现和 Theme 基础。
它们的区别在于“谁决定如何展示”，而不是维护两套视觉组件系统。

### 6. A2UI 不替代 Frontend Tool

产品保留两种互补交互方式：

```text
确定性交互
Agent → Frontend Tool → Controlled UI / 浏览器能力

动态展示
AgentContent → A2UI → Renderer → 受控组件目录
```

地图操作、路线绘制、面板控制等确定性浏览器动作继续适合 Frontend Tool。
业务结果摘要、对比、指标、任务结果等结构变化较大的展示更适合 A2UI。

### 7. UI Compiler 不是当前主链路的强制依赖

历史 Compiler 研究仍可以为未来 Reliability / Controlled Generation 提供参考。

但当前 A2UI 阶段不能要求先恢复 `ui-compiler-core`、Presentation Pipeline 或旧 compatibility contracts，才允许验证 Renderer / Catalog。

如果真实 A2UI 实践证明需要显式 Validation、Policy、Plan 或 Compilation 层，未来可以重新引入相关能力。
这需要独立决策，不能静默恢复已删除的包。

## 当前阶段路线图

```text
已完成
#202 Controlled UI 纵向场景
AGUIMock + Frontend Tool + MapLibre + DeviceCard

当前集成工作
#207 Thin CopilotKit Runtime
  ↓
#200 通过统一边界验证真实 SACS 互操作

下一产品主线
A2UI Renderer MVP
  ↓
Basic / Custom Catalog
  ↓
Theme
  ↓
SACS AgentContent → Dynamic A2UI

以后只有真实证据需要时再进入
Runtime Platform / Controlled-generation Compiler
```

## 对仓库状态的影响

### Active / 已接受的实现目标

- `apps/web-workbench` 继续是产品应用；
- `packages/ag-ui-mock` 继续是确定性的 Agent 测试替身；
- `packages/ag-ui-adapter` 继续只承担协议边界辅助能力；
- `packages/shared-types` 继续保持最小化；
- #207 可以在最小且自然的 Monorepo 边界增加 CopilotKit Runtime Host。

### 从 Frozen 中重新激活

Issue #207 完成后，以下 Workbench 资产可以围绕 A2UI 阶段继续获得聚焦实现：

- A2UI renderer 集成；
- Component Catalog 实验；
- Theme 实验；
- A2UI fixtures / scenarios；
- 为评估生成式 UI 所需的展示比较与验证能力。

这不授权恢复已经删除的 Compiler / Presentation / Runtime Platform 包。

## 与 ADR-0028 的关系

ADR-0028 在以下范围继续有效：

- 使用原生 AG-UI contract，而不是已删除的 compatibility contracts；
- Active / Frozen / Removed / Historical 状态词；
- 已删除的 Runtime / Compiler / Presentation 实现；
- Monorepo 依赖方向；
- 不执行模型生成的任意 HTML / JavaScript。

本 ADR 在两个方面**部分取代 ADR-0028**：

1. 当前 Agent 接入目标加入薄 CopilotKit Runtime，而不是继续假设 Workbench 长期直接面对 Agent；
2. A2UI / Catalog / Theme 不再无限期 Frozen，而是薄 Agent 接入边界完成后的明确下一阶段。

## 影响

- Workbench 获得一个服务端 Agent 接入边界，而不需要重新建设自研 Runtime Platform；
- 真实 Agent credential 保持在浏览器之外；
- AGUIMock 与 SACS 可以使用统一前端接入模型，同时保留能力差异；
- 即使 SACS 尚不支持 Frontend Tool，也可以成为后续 A2UI 实验的真实 AgentContent 来源；
- 项目开始从 A2UI 实践中积累可复用 UI / Theme 能力，而不是提前设计大型平台抽象；
- 历史 Compiler / Runtime 研究继续保留参考价值，但不再成为下一阶段实现前置条件。

## 实现原则

> **先统一 Agent 接入边界，再进入 A2UI；先证明 Renderer，再横向抽象 Catalog / Theme。**
