# EXP-001：委托执行

> **交互模式**：委托执行  
> **实验目的**：验证用户把一个完整任务交给 Agent 后，Agent 是否能够接手、持续推进，并以足够清晰但不过度打扰的方式让用户知道任务正在进行以及最终得到了什么结果。

---

## 1. 交互模式

**委托执行**解决的是：用户不再逐步告诉 Agent 每一步怎么做，而是把一个目标交给 Agent，由 Agent 在一段时间内自主完成多个步骤，最后返回结果。

```text
User Goal
↓
Agent Accepts Task
↓
Agent Working
↓
必要的 Progress / Intermediate Result
↓
Agent Completes
↓
Final Result / Artifact
```

这个模式不依赖地图。地图只是当前用于观察执行过程和结果的共享 GUI。

---

## 2. 实验目标

本实验要确认：

> **当用户把一个多步骤任务委托给 Agent 后，交互是否形成“任务已接手 → 正在推进 → 已完成 → 结果可理解”的完整闭环。**

重点关注：

- 用户是否知道 Agent 已经接手任务；
- 执行过程中是否需要看到进度或阶段性结果；
- 哪些过程信息值得展示，哪些只是内部执行细节；
- 最终结果是否能够和最初委托目标对应起来；
- 任务完成后是否清楚下一步应该由用户还是 Agent 行动。

原 EXP-001 中的“意图可见性”不再作为独立 Interaction Mode，而作为委托执行中的一个横切设计问题保留。

---

## 3. 实验场景

沿用“北侧通道巡逻方案研判与调整”。

用户直接委托：

> **帮我想想怎么巡逻北侧通道。**

固定业务事实由 Scenario / Fixture 提供，Agent 不负责生成新的专业路线或业务事实。

任务执行过程可以包括：

```text
接收巡逻研判任务
↓
查看北侧通道范围与限制条件
↓
整理关键观察点
↓
展示既有候选路线
↓
形成当前研判结果
```

本实验关注“完整任务被委托以后如何推进和交付”，而不是单个地图 Tool 是否调用成功。

---

## 4. 交互流程

| 阶段 | 用户 | Agent | GUI |
| --- | --- | --- | --- |
| 委托 | 提出完整目标 | 接受任务并开始处理 | 保留任务上下文 |
| 执行 | 观察，必要时介入 | 连续完成多个步骤 | 展示与任务相关的地图变化 / 状态 |
| 过程反馈 | 判断是否需要继续等待或介入 | 只公开必要进度、关键完成事实和结果边界 | 承载 Progress / Activity / Map state |
| 完成 | 阅读结果 | 给出最终研判结果 | 保留最终地图状态 / Artifact |
| 后续 | 决定是否调整或继续 | 等待下一步输入 | 保持可继续工作的上下文 |

---

## 5. 验证重点

委托执行模式成立，至少需要确认：

- Agent 能明确进入“正在处理该任务”的状态；
- 多步执行期间，用户不会因为界面变化而失去任务上下文；
- 过程信息能帮助理解进展，但不会退化成 Tool Call 日志；
- 临时结果与最终结果的边界明确；
- Agent 完成后不会把“展示候选路线”误报为“路线已选择或已执行”；
- 用户能够理解任务当前是进行中、等待输入还是已完成。

必要时可以比较不同的 Progress / Intent Feedback 方案，但对照不是本 EXP 的固定前提。

---

## 6. 实验结果

> **确定性工程参考链路已经实现，真实 provider 验证和形成性体验观察仍待完成。**

### 当前已有工程基础

- Workbench 已具备 Agent Run、Activity、Artifact、Frontend Tool 和地图状态的可观察链路；
- `map-validation-agent` 已提供 `north-corridor-overview-v1` 版本化场景；
- AGUIMock 已能提供确定性的多步地图执行、公开计划更新和最终文本结果；
- 当前 EXP-001 场景使用 Activity 和最终文本交付结果，尚未把 Artifact 作为本实验的最终交付对象；
- 真实 provider smoke 仍应只依据实际运行证据填写。

### 实际观察

- 待填写。

### 当前判断

> 当前代码已经证明委托任务可以沿 Goal -> Working -> Progress -> Completed -> Result 推进，但尚不能据此声称真实模型表现和用户体验已经通过验证。

---

## 7. 最终沉淀

### 7.1 交互知识资产

实验完成后，应沉淀：

- **模式定义**：什么是委托执行，与单轮问答的差异是什么；
- **标准流程**：Goal → Working → Progress / Intermediate Result → Completed → Result；
- **设计原则**：过程反馈服务于任务理解，而不是暴露内部执行日志；
- **适用边界**：适合多步骤、需要一段时间推进的任务；一步即可完成的简单请求通常不需要进入委托执行模式；
- **可迁移场景**：地图研判、报表分析、批量处理、计划生成、文档整理等。

### 7.2 可复用技术资产

可复用技术资产必须对应真实代码实体和验证入口，而不只是一组能力描述。

| 类型 | 具体资产 | 代码入口 | 作用 | 当前复用成熟度 |
| --- | --- | --- | --- | --- |
| 共享契约 | `MapPlanActivityContent`、`MapPlanActivityStep`、`isMapPlanActivityContent` | [`packages/shared-types/src/index.ts`](../../../packages/shared-types/src/index.ts) | 定义并校验 Agent 公开目标、阶段状态、完成事实和决策边界。 | 已位于 `shared-types`，可跨模块复用。 |
| 委托执行 Fixture | `MAP_PATROL_ROUTE_REVIEW_STEPS`、`mapPatrolRouteReviewPlan`、`registerMapPatrolRouteReviewScenario` | [`packages/ag-ui-mock/src/scenarios/map-patrol-route-review.ts`](../../../packages/ag-ui-mock/src/scenarios/map-patrol-route-review.ts) | 生成确定性的多步执行、Activity 更新、Tool Result continuation 和最终结果。 | 已位于 `ag-ui-mock`，可用于协议与回归验证。 |
| 任务状态方法 | `startRun`、`resolveRun`、`failOperation` | [`apps/web-workbench/src/conversation/conversation-store.ts`](../../../apps/web-workbench/src/conversation/conversation-store.ts) | 将 Run 生命周期映射为用户可见的 pending、completed、failed 或 cancelled Turn。 | Workbench 应用内可复用，尚未形成公共 package。 |
| 进度解析方法 | `mapPlanFromObservations`、`mapPlanFromTurn`、`mapPlanStepForOperation` | [`apps/web-workbench/src/conversation/map-plan-activity.ts`](../../../apps/web-workbench/src/conversation/map-plan-activity.ts) | 从真实 Activity 和 Turn 中恢复公开计划及其与地图操作的关联。 | Workbench 应用内可复用，依赖当前 Turn 模型。 |
| 意图投影方法 | `mapOperationSteps` | [`apps/web-workbench/src/conversation/map-operation-trace.ts`](../../../apps/web-workbench/src/conversation/map-operation-trace.ts) | 将实际 Tool Call 和 Tool Result 投影为用户可理解的动作与状态。 | Workbench 应用内可复用，依赖当前 observation 模型。 |
| 呈现组件 | `AgentMapOperationHud.vue`、`MapPlanActivityPresentation.vue` | [`AgentMapOperationHud.vue`](../../../apps/web-workbench/src/conversation/AgentMapOperationHud.vue)、[`MapPlanActivityPresentation.vue`](../../../apps/web-workbench/src/conversation/MapPlanActivityPresentation.vue) | 分别在地图附近展示当前行动，在 Conversation 中保留阶段结果和决策边界。 | 真实产品组件，当前与 Workbench 的 Turn 和 Activity 呈现耦合。 |
| 真实 Agent 验证输入 | `north-corridor-overview-v1`、`loadValidationScenario`、`loadValidationScenarioInput` | [`north-corridor-overview-v1.json`](../../../apps/map-validation-agent/scenarios/north-corridor-overview-v1.json)、[`scenario-loader.ts`](../../../apps/map-validation-agent/src/scenario-loader.ts) | 为真实模型运行提供版本化事实、允许能力和预期交互。 | `map-validation-agent` 内的验证资产，不是产品业务事实 API。 |
| 自动化证据 | Map Plan、Operation HUD、AGUIMock 场景与浏览器 E2E | [`map-plan-activity.test.ts`](../../../apps/web-workbench/tests/unit/map-plan-activity.test.ts)、[`agent-map-operation-hud.test.ts`](../../../apps/web-workbench/tests/unit/agent-map-operation-hud.test.ts)、[`server.test.ts`](../../../packages/ag-ui-mock/test/server.test.ts)、[`workbench.spec.ts`](../../../apps/web-workbench/tests/e2e/workbench.spec.ts) | 验证计划解析、可见反馈、多步 continuation 和地图终态。 | 已形成回归资产，不是产品 API。 |

当前可以直接复用的是共享契约、确定性 Fixture 和测试辅助能力。
Workbench 内的方法与组件是具体、真实的候选复用资产，但在出现第二个消费者之前不提前提取为通用 package。

真实 provider 一致性测试、Artifact 交付语义以及跨场景的委托任务状态契约仍属于待沉淀资产，不能列为当前已经完成的代码事实。
