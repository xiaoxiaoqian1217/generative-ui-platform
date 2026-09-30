# Agent-driven UI 演进路线

> 当前优先级：先把 AG-UI 变成持续驱动 UI 的状态通道，再逐步引入 Adaptive UI 与 Embedded UI Agent。

## 1. 目标

最终希望形成：

```text
Business Agent
      ↓
    AG-UI
      ↓
Shared UI State
      ↓
UI Decision Layer
      ↓
Controlled / Adaptive / Generative UI
      ↕
     User
```

核心问题从“Agent 返回什么消息”转为：

> Agent 在长任务执行过程中，界面怎样持续表达当前状态，并在必要时支持用户理解、判断、控制和核查。

## 2. 五阶段路线

### Phase 1：AG-UI + Business Agent

目标：

- 真实消费 Run / State / Activity / Tool / Artifact / Error / HITL；
- 同一任务面板持续更新，而不是事件来一条新增一张卡片；
- 明确 AG-UI 事件与前端可见状态的映射。

完成标志：

- 一个完整 Run 从开始到结束都作用于同一任务 Surface；
- 重连 / 增量更新不产生重复 UI；
- Tool Result 与最终视觉状态一致。

### Phase 2：Shared State

目标：

将不同来源的数据归一成 UI-facing Interaction Context。

最小模型：

```ts
interface SharedUIState {
  task: TaskViewState;
  agent: AgentViewState;
  activity: ActivityViewState;
  tools: ToolViewState[];
  risks: RiskViewState[];
  map: MapViewState;
  userInteraction: UserInteractionState;
}
```

来源：

| State | 主要来源 |
| --- | --- |
| task | AG-UI State / Artifact |
| agent | Run lifecycle |
| activity | Activity Snapshot / Delta |
| tools | Tool Call / Result |
| risks | 业务 State / bounded error / 规则派生 |
| map | Frontend Tool result + MapLibre local state |
| userInteraction | 用户输入、选择、接管、HITL response |

边界：

- 它不是 Business Agent 的业务真值；
- 它不是 Runtime Repository；
- 它只服务当前 UI 决策和交互连续性；
- user-owned 与 agent-owned 状态必须区分。

### Phase 3：Rule-based Adaptive UI

目标：

建立显式的 State → UI Strategy 规则。

第一批规则建议围绕：

1. 任务开始 / 执行 / 完成；
2. 当前步骤变化；
3. 等待用户批准 / 选择 / 补充；
4. 风险 / 异常；
5. Tool failed / cancelled / superseded；
6. 用户打断纠偏；
7. 用户直接接管地图。

输出不直接是具体 DOM，而是 UI Strategy，例如：

```ts
interface UIStrategy {
  mode: "understand" | "decide" | "control" | "verify";
  priority: "normal" | "attention" | "critical";
  focusTargets: string[];
  surfaces: string[];
  availableActions: string[];
}
```

再由 Controlled UI / 地图规则执行。

### Phase 4：Embedded UI Agent

准入条件：

- 已存在稳定 Shared State；
- Rule-based Adaptive UI 已跑通；
- 有真实案例证明规则难以覆盖复杂上下文判断。

UI Agent 输入：

```text
Task State
Agent State
Activity
Tool Results
Risk
Map State
User Interaction
```

UI Agent 输出：

```text
UI Strategy
```

职责：

- 判断当前更需要理解 / 判断 / 控制 / 核查；
- 决定信息优先级；
- 判断是否主动提示；
- 推荐界面组织方式。

不负责：

- 无人系统任务规划；
- 业务工具执行；
- 改写业务事实；
- 直接控制高风险设备。

### Phase 5：Generative UI

当 UI Strategy 确认需要动态组合展示时，再选择 A2UI / Generative UI。

```text
UI Agent / Rule Engine
        ↓
     UI Strategy
        ↓
 ┌──────┼─────────┐
 ↓      ↓         ↓
Controlled UI  Adaptive UI  A2UI
```

A2UI 是表达通道，不拥有业务决策。

## 3. 当前仓库能力如何复用

```text
single-agent-chat-server
  → Phase 1 真实 Business Agent

AGUIMock
  → 状态 / Tool / failure 的确定性 fixture

map-validation-agent
  → 后续 UI Agent / 真实 LLM 行为 smoke

CopilotKit Runtime
  → 保持薄接入层

MapLibre + Frontend Tools
  → Adaptive UI 的空间表面

A2UI Renderer + Catalog
  → Phase 5 已有表达能力
```

因此当前不需要重写架构，只需要调整优先级。

## 4. 推荐实施顺序

近期：

```text
1. 完善真实 SACS AG-UI interoperability
2. 定义 SharedUIState 最小模型和来源
3. 建立 AG-UI Event → Shared State 映射
4. 让任务面板 / 地图消费 Shared State
5. 建立第一版 State → UI Strategy 规则
6. 用 #217 打断纠偏 / 混合主导验证状态所有权
```

之后：

```text
7. 收集规则方案不足案例
8. 做 Embedded UI Agent spike
9. UI Agent 只输出 UI Strategy
10. 选择性接入 A2UI / Generative UI
11. 做 Human-Agent Interaction 对照评估
```

## 5. 当前不做

- 不把 UI Agent 与 Business Agent 做成自由对话的双 Agent；
- 不为 Shared State 创建后端 Runtime Truth；
- 不立即扩张 Dynamic A2UI；
- 不让 LLM 直接生成并执行任意前端代码；
- 不因为新增状态模型恢复旧 Runtime Platform；
- 不把所有 UI 改变都交给 LLM。

## 6. 评价标准

这条路线是否有效，不看“用了多少 Agent / LLM”，而看：

1. 用户能否持续知道 Agent 当前在做什么；
2. UI 是否与真实任务状态一致；
3. 用户是否知道什么时候需要介入；
4. 用户介入后旧状态是否正确被替代；
5. 界面是否减少无意义消息流和信息堆叠；
6. UI Agent 引入后是否真的解决规则难以处理的问题。
