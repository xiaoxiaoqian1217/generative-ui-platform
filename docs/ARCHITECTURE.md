# Generative UI Platform 架构

> **状态：当前**
>
> 本文描述 `dev_1.0` 当前产品路线与已经接受的近期目标。
> 文档必须明确区分“当前已经实现的事实”和“已经接受但尚未实现的目标架构”。

## 1. 产品边界

Generative UI Platform 当前聚焦于验证并沉淀：

> **真实业务 Agent 如何通过 AG-UI 与 Web Workbench 交互，并逐步支持受控 UI、A2UI、组件目录与主题能力。**

平台当前不是：

- 通用 Agent Runtime Platform；
- 多 Agent 编排平台；
- 自研 UI Compiler Platform；
- Runtime Truth / Recovery Platform。

## 2. 当前已实现基线

当前已经验证的纵向链路是：

```text
用户
  ↓
Web Workbench
  ↓
CopilotKit Frontend
  ↓ AG-UI
AGUIMock
  ↓
Frontend Tools: setLayerVisibility / focusOn / highlight / previewPath
  ↓
MapLibre persistent surface
```

该场景已经证明：

- Workbench 可以消费 AG-UI；
- CopilotKit Frontend Tool 可以驱动真实浏览器能力；
- GIS 能力可以保持在前端实现；
- AGUIMock 可以作为稳定的协议测试服务。

## 3. 已接受的 Agent 接入目标

ADR-0029 已接受下一阶段目标：引入**薄 CopilotKit Runtime 集成层**。

```text
┌──────────────────────────────────────────┐
│ Web Workbench                            │
│                                          │
│ Conversation                             │
│ Controlled UI / Frontend Tools           │
│ A2UI Renderer（下一阶段）                │
│ Catalog / Theme（下一阶段）              │
└────────────────────┬─────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ CopilotKit Runtime │
            │ 薄集成层           │
            └─────────┬──────────┘
                      │
           ┌──────────┴───────────┐
           ▼                      ▼
       AGUIMock        single-agent-chat-server
       测试 Agent          真实业务 Agent
```

Issue #216 在该边界上增加一个默认关闭的独立验证来源：

```text
Workbench
  -> existing CopilotKit Runtime
       -> map-validation-agent
            -> independent LangGraph server
            -> validation LLM
  -> existing Frontend Tools / HITL
  -> MapLibre persistent surface
```

`map-validation-agent` 是 dev-only 交互研究仪器，不替代 SACS，也不在 Runtime 进程内执行 graph。

在 #207 完成前，上图中的 CopilotKit Runtime 仍是目标状态，不应被误写成已完成实现。

## 4. CopilotKit Runtime 边界

CopilotKit Runtime 在当前阶段只承担**支撑性基础设施**职责：

- Agent 注册与路由；
- 服务端 Agent endpoint 配置；
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
- 多 Agent 编排平台。

因此：

```text
CopilotKit Runtime
= 薄 Agent Integration Layer

≠

旧 Runtime Platform
```

## 5. Agent 来源

### 5.1 AGUIMock

AGUIMock 是测试 Agent / 能力测试替身。

主要用途：

- 稳定构造 AG-UI 事件流；
- Frontend Tool / `TOOL_CALL_*` 场景；
- failure / edge case；
- fixture / regression；
- 在真实 Agent 尚未支持某项能力时验证 Workbench 自身能力。

AGUIMock 不承载生产 Runtime 职责。

### 5.2 single-agent-chat-server

`single-agent-chat-server`（SACS）是当前真实业务 Agent 互操作目标。

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

这些属于当前真实 Agent 的互操作缺口，不应限制 Workbench 自身能力模型，也不能由 Runtime 伪造。

### 5.3 map-validation-agent

`map-validation-agent` 用真实 LLM 验证地图意图选择、工具顺序、真实 Tool Result continuation 和缺少用户决定时的征询。
它从 run-scoped context 加载版本化场景输入，只消费 Workbench 已有的地图和 HITL Frontend Tools。
它不访问真实业务系统，不计算路线，不提供正式可靠性统计，也不改变默认产品 Agent 拓扑。

### 5.4 来源发现与呈现决策分离

Agent Source 回答业务内容从哪里来；呈现路径由 Runtime 的确定性 Presentation Policy 按内容决定。
用户只有自然语言一个入口，可以切换的只有 Agent Source；呈现路径不是用户开关。

```text
Agent Source
├─ AGUIMock
├─ single-agent-chat-server
└─ map-validation-agent（dev-only，条件注册）

Presentation paths(按内容单元决策,非全局模式)
1. Native A2UI Passthrough(已是 A2UI,如固定 fixture)
2. 显式 requestedMode(仅 scenario / 测试经 forwardedProps 注入)
3. Plain Content Fallback(原文保留 + 明确错误)
```

固定 A2UI fixture 是 AGUIMock 的原生输出，经 Passthrough 渲染，不受任何 requestedMode 影响。
受控 Dynamic A2UI 由挂在 `ag-ui-mock` 上的薄 Presentation Policy middleware 在同一 run 内完成：scenario 经 forwardedProps 携带 `requestedMode: "dynamic"`，稳定检查点触发 Secondary LLM，生成的 a2ui-surface 缝合进当前事件流。
Frontend Tool 是执行路径而非呈现路径，与呈现决策正交。
在真实 SACS AgentContent 接入 Dynamic A2UI 之前，SACS 链路没有任何 dynamic 入口。

## 6. UI 能力模型

Workbench 后续保留两条互补 UI 路线。

### 6.1 受控 UI

适用于确定性、带副作用或必须由前端能力显式控制的交互：

```text
Agent
  ↓
Frontend Tool
  ↓
浏览器能力
  ↓
Controlled UI
```

典型场景：

- 地图定位；
- 绘制路线；
- 打开面板；
- 设备控制；
- 前端本地状态操作。

### 6.2 A2UI / 生成式展示

适用于业务结果结构不确定，但展示空间需要受约束的场景：

```text
AgentContent
  ↓
A2UI
  ↓
Renderer
  ↓
Catalog + Theme
```

推荐演进顺序（ADR-0030 调整后）：

```text
固定 A2UI Fixture
  ↓
A2UI Renderer MVP
  ↓
Basic Catalog
  ↓
小规模 Custom Catalog
  ↓
Dynamic A2UI（受控内容）
  ↓
真实 AgentContent → Dynamic A2UI
```

Theme Tokens 经 ADR-0030 后置，不再是 Dynamic A2UI 的前置条件。
第一阶段先验证 Renderer，不要求 Secondary LLM。

## 7. 共享 UI 原则

Controlled UI 和 A2UI 应尽量共用同一套真实 UI 实现。

```text
UI Primitives / Domain UI / Theme
             ▲
             │
      ┌──────┴──────┐
      │             │
Controlled UI   A2UI Renderer
```

A2UI Catalog 描述 AI 可以声明哪些 UI；它不是第二套真实组件库。

## 8. Post-Agent Presentation 方向

受控内容下的 Dynamic A2UI 已由 Issue #210 跑通。
当前下一步是验证真实业务结果到 Dynamic A2UI：

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
业务 Agent 负责业务结果，Presentation 层负责展示决策。

## 9. 明确延期的能力

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

## 10. 当前路线图

```text
已完成
#202 Controlled UI 纵向场景
#207 Thin CopilotKit Runtime
#206 A2UI Renderer MVP
#209 Platform Catalog MVP
#210 Dynamic A2UI MVP（受控内容）

当前
#200 Real SACS Interoperability
#213 Generative UI Scenario and Evaluation MVP
#216 Dev-only map validation Agent interaction loop

下一阶段
SACS AgentContent → Dynamic A2UI

经 ADR-0030 后置
Theme Tokens（不再是 Dynamic A2UI 的前置条件）

以后按真实需求再考虑
Runtime Platform / Controlled-generation Compiler
```

## 11. 架构原则

1. **先纵向跑通场景，再横向抽象公共能力。**
2. Workbench 不自研框架已经提供的 Agent Gateway / Runtime 能力。
3. 真实 Agent 当前能力与 Workbench capability 必须分开描述。
4. 目标架构与当前实现必须分开描述。
5. 不执行模型生成的任意 HTML / JavaScript。
6. 新增 Runtime / Compiler / Platform 抽象前必须有真实需求和新的架构决策。
