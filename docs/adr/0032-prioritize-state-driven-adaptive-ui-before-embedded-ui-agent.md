# ADR-0032：先建设状态驱动 Adaptive UI，再引入 Embedded UI Agent

- Status: Accepted
- Date: 2026-09-30

## Context

当前仓库已经证明以下能力可以成立：

- Business Agent 可以通过 AG-UI 与 Workbench 建立 Run / State / Activity / Tool 等交互；
- Frontend Tool 可以驱动地图等浏览器侧真实能力；
- Controlled UI、A2UI Renderer、Platform Catalog 与受控 Dynamic A2UI 已完成基础验证；
- map-validation-agent 可以作为 dev-only 真实 LLM 交互验证来源。

但当前产品仍存在一个更基础的问题：

> AG-UI 不能只被当成“消息和卡片的传输协议”，而应该持续驱动同一任务界面，让用户看到任务、Agent、工具、风险和人工介入状态如何连续变化。

如果此时直接增加独立 UI Agent，会立即遇到两个问题：

1. UI Agent 与 Business Agent 之间的数据流和状态真值边界不清晰；
2. 尚未证明哪些 UI 决策真的需要 LLM，容易把本可确定实现的规则过早升级为 Agent。

因此当前阶段需要先建立可观察、可回归的状态驱动 UI 基线，再逐步引入智能决策。

## Decision

接受以下演进顺序：

```text
Phase 1  AG-UI + Business Agent
            ↓
Phase 2  Shared State
            ↓
Phase 3  Rule-based Adaptive UI
            ↓
Phase 4  Embedded UI Agent
            ↓
Phase 5  Generative UI
            ↓
         Human-Agent Interaction evaluation
```

### Phase 1：AG-UI 持续状态驱动

优先消费真实 Agent 提供的：

- Run lifecycle；
- State Snapshot / Delta；
- Activity Snapshot / Delta；
- Tool Call / Result；
- Artifact / structured output；
- Interrupt / Resume；
- bounded error。

目标不是“每个事件生成一张新卡片”，而是：

> 同一个任务 Surface 随 Agent 状态持续更新。

### Phase 2：Shared State

在 Workbench 建立 UI-facing Shared State，把 Agent 事件、前端交互和地图状态归一为稳定的界面上下文。

建议最小切片：

```text
Shared UI State
├─ task
├─ agent
├─ activity
├─ tools
├─ risks
├─ map
└─ userInteraction
```

该 Shared State 是 **UI 投影 / Interaction Context**，不是新的 Runtime Truth、业务数据库或 durable Runtime Repository。

Business Agent 仍然拥有业务决策和业务事实；Workbench 只维护支持界面决策所需的前端状态。

### Phase 3：Rule-based Adaptive UI

在引入 LLM 前，先显式定义：

> 什么状态变化 → 什么 UI 应该变化。

例如：

```text
RUN_STARTED
→ 进入任务工作态

ACTIVITY 进入执行阶段
→ 更新同一任务面板当前步骤

风险升高
→ 提升风险信息优先级 + 地图高亮

等待用户决定
→ 显示批准 / 选择 / 补充交互

Tool cancelled / superseded
→ 撤销旧临时视觉状态，不宣称完成
```

规则层首先负责高确定性、高风险和有副作用的 UI 决策。

### Phase 4：Embedded UI Agent

只有当规则层出现明确的复杂判断缺口后，才引入 UI Agent。

UI Agent 不直接接管 Business Agent，也不拥有业务真值。

推荐数据流：

```text
Business Agent
      ↓
    AG-UI
      ↓
Shared UI State
      ↓
 Embedded UI Agent
      ↓
   UI Strategy
      ↓
Adaptive UI / Controlled UI / Generative UI
```

UI Agent 主要回答：

- 用户此刻更需要理解、判断、控制还是核查？
- 哪些信息应被突出、折叠或延后？
- 是否需要主动提示？
- 应提供什么交互入口？

UI Agent 输出的是 **UI Strategy**，而不是业务命令。

不得形成：

```text
UI Agent → 自然语言指挥 → Business Agent
```

这种强耦合链路。

### Phase 5：Generative UI

Generative UI / A2UI 保留为重要能力，但从“当前主线目标”调整为 **UI Strategy 的表达手段之一**。

```text
UI Strategy
   ↓
├─ Controlled UI
├─ Adaptive Layout
└─ A2UI / Generative UI
```

确定性、高风险、有副作用的交互继续优先 Controlled UI；结构多变、展示组合不确定时再使用 Generative UI。

## Existing capability mapping

现有能力不废弃，重新定位如下：

| 能力 | 新定位 |
| --- | --- |
| AG-UI | Agent → User App 的状态与交互底座 |
| CopilotKit Runtime | 薄 Agent Integration Layer |
| Frontend Tools | 浏览器独有 / 确定性副作用能力 |
| Controlled UI | 高确定性与关键交互表达 |
| Shared State | UI-facing Interaction Context |
| Adaptive UI | 当前主要产品演进方向 |
| Embedded UI Agent | 后续复杂 UI 决策层 |
| A2UI / Generative UI | UI Strategy 的动态表达手段 |
| map-validation-agent | 真实 LLM 交互行为验证来源 |

## Relationship to existing issues

- #200 继续验证真实 SACS AG-UI interoperability，是 Phase 1 的基础。
- #214 / #215 / #216 已提供地图工具、HITL 和真实 Agent 验证资产。
- #217 的“打断纠偏 / 混合主导”应作为 Phase 2 / Phase 3 的关键验证场景之一，而不是单独发展第二套状态框架。
- 既有 A2UI / Dynamic A2UI 成果继续保留，但真实 SACS AgentContent → Dynamic A2UI 不再抢在 Shared State / Adaptive UI 之前。

## Non-goals

本决策不授权：

- 新建多 Agent orchestration platform；
- 新建 Runtime Truth / Runtime Repository；
- 让 UI Agent 直接执行高风险业务动作；
- 让 UI Agent 与 Business Agent 通过自由自然语言互相驱动；
- 恢复旧 Presentation Pipeline / UI Compiler；
- 执行模型生成的任意 HTML / JavaScript；
- 为 Shared State 建立新的通用后端状态平台。

## Consequences

正面结果：

- 优先解决 AG-UI “持续驱动 UI”价值未充分体现的问题；
- 先把数据流和状态边界做清楚，再增加 LLM 决策；
- UI Agent 可以建立在稳定上下文上，而不是直接耦合 Business Agent；
- A2UI 从目的变成手段，减少为了 Generative UI 而 Generative UI；
- #217 等现有交互场景可以直接成为 Adaptive UI 的验证证据。

代价：

- Dynamic A2UI 的进一步扩张暂时降级；
- 需要先补 Shared State、状态映射和规则决策层；
- 后续引入 UI Agent 时必须证明规则方案的真实不足。

## Exit gates

进入 Embedded UI Agent 前至少满足：

1. 一条真实 Business Agent 链路能够持续驱动同一个任务 Surface；
2. Shared State 的最小切片、来源和所有权明确；
3. 至少覆盖正常执行、等待用户、风险 / 异常、打断纠偏中的状态映射；
4. Rule-based Adaptive UI 有可回归测试；
5. 已记录规则无法可靠处理的复杂 UI 决策案例。

只有满足以上条件，才进入 UI Agent 实验。
