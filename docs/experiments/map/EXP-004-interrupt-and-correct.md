# EXP-004：打断纠偏

> **交互模式**：打断纠偏  
> **实验目的**：验证 Agent 正在推进任务时，用户改变目标、约束或选择后，Agent 是否能够让旧的待执行计划失效，并基于最新用户意图与最新 GUI 状态继续。

---

## 1. 交互模式

**打断纠偏**表示用户在 Agent 当前任务尚未完成时主动改变方向。Agent 需要识别这不是普通补充信息，而是会影响后续行动的新约束。

```text
Agent Working
↓
User Interrupt / Correction
↓
Invalidate Stale Pending Work
↓
Preserve Still-valid State
↓
Reconcile Latest Intent + GUI State
↓
Agent Continue
```

模式的重点不是“用户一说话就全部取消”，而是区分哪些旧计划已经过时、哪些已有状态仍然有效。

---

## 2. 实验目标

本实验要确认：

> **当用户的新输入明确改变当前任务目标、约束或选择时，尚未执行且依赖旧条件的 Agent 行动是否会停止，并从最新状态继续。**

重点关注：

- 用户纠偏是否拥有高于旧待执行计划的优先级；
- 已经完成且仍然有效的 GUI 状态是否能够保留；
- 依赖旧条件的待执行动作是否会失效；
- Agent 是否能明确反馈已经接受新的要求；
- 纠偏之后是否会回到最新共享状态，而不是重新从初始状态开始。

---

## 3. 实验场景

继续使用“北侧通道巡逻方案研判与调整”。

用户首先委托：

> **帮我想想怎么巡逻北侧通道。**

Agent 已经完成部分工作：

```text
显示限制区域
↓
聚焦北侧通道
↓
高亮关键观察点
↓
准备展示候选路线 A
```

此时用户中途修改要求：

> **别走北坡，改从东侧绕。**

这条输入改变了后续路线约束，因此旧的 `previewPath(A)` 不应继续作为有效待执行计划。

期望流程：

```text
收到用户纠偏
↓
停止依赖旧约束的待执行动作
↓
保留仍有效的限制区域、视口和观察点
↓
把新约束纳入当前任务
↓
重新判断后续动作
↓
继续展示符合新约束的既有方案
```

Direct Manipulation 不再作为独立一级 EXP；如果用户通过地图直接选择、取消或修改表达同样的纠偏，它作为本模式的一种输入变体后续验证。

---

## 4. 交互流程

| 阶段 | 用户 | Agent | GUI |
| --- | --- | --- | --- |
| 执行中 | 观察当前任务 | 按原计划推进 | 保存当前有效状态 |
| 打断 | 提出新的目标 / 约束 / 选择 | 识别纠偏语义 | 保持已完成状态 |
| 失效处理 | 等待反馈 | 停止依赖旧条件的待执行动作 | 不再呈现被否定的后续结果 |
| 状态对齐 | 观察 | 合并最新用户意图与共享状态 | 保留仍有效的视图 / 选择 / 高亮 |
| 继续 | 判断新结果 | 根据新条件继续 | 展示新的有效结果 |

---

## 5. 验证重点

打断纠偏模式成立，至少需要确认：

- 用户明确改变任务方向后，旧待执行动作不会继续发生；
- 已经完成且仍然有效的地图状态不会被机械清空；
- Agent 能区分“补充信息”和“会让旧计划失效的纠偏”；
- 用户能够知道新要求已经生效；
- 重新继续时基于最新状态，而不是重复无关的已完成步骤；
- 如果用户通过 GUI 直接操纵表达纠偏，系统能够把有任务语义的状态纳入同一模式；
- 已产生外部副作用或不可逆结果的操作，不被错误地当成“取消待执行计划”即可解决。

对照方案只有在需要判断某种具体中断策略时才增加，不作为默认结构。

---

## 6. 实验结果

> **当前仍以实验设计为主，待完成对应工程闭环与形成性验证后填写。**

### 当前已有工程基础

- AG-UI / CopilotKit 已提供 Run、Tool Call / Result 等基础事件与 Frontend Tool 链路；
- Workbench 已能保持地图共享状态并观察 Agent 行动；
- 当前仓库已有路线、限制区、观察点等固定 Scenario 数据可复用；
- 完整的“纠偏 → 旧待执行计划失效 → 基于最新状态继续”仍需要作为本 EXP 的核心实现与验证对象。

### 实际观察

- 待填写。

### 当前判断

- 待填写。

---

## 7. 最终沉淀

### 7.1 交互知识资产

实验完成后，应沉淀：

- **模式定义**：用户在 Agent 执行中改变目标、约束或选择，新的意图覆盖依赖旧条件的待执行计划；
- **标准流程**：Working → Interrupt / Correction → Invalidate Stale Work → Preserve Valid State → Reconcile → Continue；
- **设计原则**：最新明确用户意图优先于尚未执行的旧计划，但纠偏不等于清空所有已有状态；
- **适用边界**：适合用户输入会改变后续行动的多步任务；与当前任务无关的输入、纯浏览行为或仍然有效的已完成动作不应被机械取消；不可逆外部操作需要更强的 Cancel / Compensation / Recovery 机制；
- **可迁移场景**：路线调整、表格筛选纠正、排期修改、工作流执行中变更处理方式等。

### 7.2 可复用技术资产

当前只有支撑打断纠偏的具体资产，还没有形成 EXP-004 所要求的完整技术闭环。

| 类型 | 具体资产 | 代码入口 | 当前能支持什么 | 与 EXP-004 的缺口 |
| --- | --- | --- | --- | --- |
| Run 取消状态 | `failOperation` 的 cancelled 状态与晚到结果隔离 | [`apps/web-workbench/src/conversation/conversation-store.ts`](../../../apps/web-workbench/src/conversation/conversation-store.ts) | 用户停止当前请求后，将 Turn 标记为已取消，并拒绝晚到的 Run 结果覆盖终态。 | 只能取消整个运行，不能判断哪些旧计划失效、哪些状态应保留。 |
| 请求取消接线 | `cancelRequest`、`invalidateAllConsults` | [`apps/web-workbench/src/app/ConversationPage.vue`](../../../apps/web-workbench/src/app/ConversationPage.vue) | Stop 时中止请求并清理过期征询和预览。 | 不是“提交新约束并从最新状态继续”的纠偏流程。 |
| 原生 Interrupt / Resume | `resumeInterrupt`、`ConversationTurnPresentation.vue` 中的 interrupt 响应 | [`conversation-store.ts`](../../../apps/web-workbench/src/conversation/conversation-store.ts)、[`ConversationTurnPresentation.vue`](../../../apps/web-workbench/src/conversation/ConversationTurnPresentation.vue) | 支持 Agent 发起的 AG-UI interrupt，用户回答后按相同 interruptId 恢复。 | 控制权发起方相反，不能替代用户主动打断正在执行的 Agent。 |
| 过期状态清理 | `PatrolRouteConsultController.invalidate`、`clearConsultSessionState` | [`patrol-route-consult.ts`](../../../apps/web-workbench/src/conversation/patrol-route-consult.ts)、[`consult-session.ts`](../../../apps/web-workbench/src/conversation/consult-session.ts) | Stop、Agent Source 切换或组件卸载时使旧征询失效并清理临时 UI。 | 目前只处理征询局部状态，没有通用 stale pending work 语义。 |
| 操作结果表示 | `MapOperationResult.status` 的 `superseded`、`mapOperationSteps` 的已替代呈现 | [`map-operation.ts`](../../../apps/web-workbench/src/features/map/map-operation.ts)、[`map-operation-trace.ts`](../../../apps/web-workbench/src/conversation/map-operation-trace.ts) | 数据结构和 UI 投影能够表示某个操作已被新操作替代。 | 尚无纠偏策略负责产生和关联 superseded 结果。 |
| 共享地图状态 | `MapController`、`MapWorkspace.vue` | [`map-controller.ts`](../../../apps/web-workbench/src/features/map/map-controller.ts)、[`MapWorkspace.vue`](../../../apps/web-workbench/src/features/map/MapWorkspace.vue) | 保留当前视口、图层、高亮和路线预览，提供继续执行的现实状态基础。 | 尚未定义哪些状态在纠偏后仍然有效，以及如何重新注入 Agent 上下文。 |
| 现有自动化证据 | Conversation Store 取消与恢复测试、Stop E2E、SACS interrupt/resume E2E | [`conversation-store.test.ts`](../../../apps/web-workbench/tests/unit/conversation-store.test.ts)、[`workbench.spec.ts`](../../../apps/web-workbench/tests/e2e/workbench.spec.ts) | 证明取消终态、旧征询失效和原生 interrupt/resume 能工作。 | 没有覆盖“用户新约束 -> 旧动作失效 -> 保留有效地图状态 -> 继续”的测试。 |

以下资产目前尚未实现，因此不能列入当前可复用成果：

- EXP-004 专用版本化 Scenario / Fixture；
- 用户纠偏输入与被替代 Tool Call 之间的关联契约；
- stale pending work 的失效方法；
- latest intent 与 shared map state 的对齐方法；
- 纠偏后 continuation 的 Agent 接线；
- 完整的单元测试、协议测试和浏览器 E2E。

这些缺口完成并经过真实场景验证后，才能把 EXP-004 的实现称为可复用技术资产，而不是仅有基础设施支持。
