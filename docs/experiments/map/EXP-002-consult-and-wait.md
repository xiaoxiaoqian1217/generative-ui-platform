# EXP-002：征询等待

> **交互模式**：征询等待  
> **实验目的**：验证 Agent 在无法仅凭当前事实确定下一步时，是否能够在合适的决策点停下来征询用户，并在用户完成选择后基于该选择继续。

---

## 1. 交互模式

**征询等待**表示 Agent 在执行过程中遇到需要用户偏好、授权或任务取舍的决策点时，不继续替用户决定，而是主动暂停并等待用户输入。

```text
Agent Working
↓
Decision Point
↓
Ask User
↓
Wait
↓
User Decision
↓
Agent Resume
```

模式的重点不是“弹出确认框”，而是**正确识别什么时候应该让渡控制权，以及等待期间不继续执行依赖该决定的动作**。

---

## 2. 实验目标

本实验要确认：

> **当多个后续方案都合理，而最终选择取决于用户偏好时，Agent 是否能够正确进入等待，并在收到用户选择后自然恢复。**

重点关注：

- 征询是否发生在真正的决策点；
- 用户是否清楚现在轮到自己决定；
- 等待期间 Agent 是否保持暂停；
- 用户选择之后是否基于真实选择继续；
- 是否出现没有必要的频繁询问。

---

## 3. 实验场景

沿用“北侧通道巡逻方案研判与调整”。

用户提出：

> **帮我想想怎么巡逻北侧通道。**

固定 Fixture 提供两条已有候选路线及其差异：

```text
路线 A
覆盖范围更完整，但距离较长

路线 B
距离较短，但东侧覆盖较少
```

两条路线都可行，当前事实不能替用户决定更重视哪种取舍。

Agent 因此在路线选择处进入征询：

```text
整理路线 A / B 的关键差异
↓
向用户提出选择
↓
等待
↓
用户选择路线 B
↓
Agent 基于 B 继续展示方案
```

当前 `map-validation-agent` 已提供 `requestPatrolRouteSelection`，并有正常顺序与候选顺序反转的版本化场景，可用于验证真实模型是否依赖事实而不是候选顺序。

---

## 4. 交互流程

| 阶段 | 用户 | Agent | GUI |
| --- | --- | --- | --- |
| 前置研判 | 提出目标 | 整理事实与候选 | 展示相关地图上下文 |
| 决策点 | 观察候选 | 判断当前事实不足以唯一决定 | 展示必要差异 |
| 征询 | 阅读问题 | 提出选择并暂停 | 提供可理解的选择入口 |
| 等待 | 做决定 | 不执行依赖选择的后续动作 | 保留当前上下文 |
| 恢复 | 提交选择 | 消费用户选择并继续 | 展示被选择的路线 / 后续结果 |

---

## 5. 验证重点

征询等待模式成立，至少需要确认：

- Agent 只在真正需要用户决定的地方征询；
- 选项表达足以支持用户做决定，不要求阅读内部工具参数；
- Agent 在等待期间不会偷偷选择或继续执行依赖该选择的动作；
- 用户选择后，Agent 能正确恢复并保持原有上下文；
- 取消、修改要求等非“选择 A/B”的回应有明确语义；
- 候选顺序变化不会导致 Agent 固定偏向第一个选项；
- 低风险、可逆且无需用户偏好的动作不会被过度征询。

只有当具体设计存在争议时才增加对照，例如“纯文本征询 vs 结构化选择 UI”；对照不是本实验的默认结构。

---

## 6. 实验结果

### 当前已有工程基础

- AGUIMock 已支持 `requestPatrolRouteSelection` 的确定性 Human-in-the-loop 闭环；
- Workbench 已能呈现路线差异、等待用户选择并把结果回传 Agent；
- `map-validation-agent` 已提供 `north-corridor-route-choice-v1` 与 `north-corridor-route-choice-reversed-v1`；
- 真实 provider smoke 文档目前仍标记为 Pending，不能提前声称真实模型可靠性已成立。

### 实际观察

- 待形成性验证后填写。

### 当前判断

> 工程闭环已经具备；交互知识结论需要根据实际体验与真实 provider 运行继续确认。

---

## 7. 最终沉淀

### 7.1 交互知识资产

实验完成后，应沉淀：

- **模式定义**：Agent 在决策点征询并等待用户，再恢复执行；
- **标准流程**：Working → Decision Point → Ask → Wait → User Decision → Resume；
- **设计原则**：当选择依赖用户偏好、授权或任务取舍时，应让渡控制权，而不是替用户做无依据决定；
- **适用边界**：多个方案都合理且无法从已有上下文确定用户选择时适用；唯一答案、明确指令、低风险视觉动作通常不需要征询；
- **可迁移场景**：路线取舍、筛选策略、排期冲突处理、工作流分支选择等。

### 7.2 可复用技术资产

当前已经存在的具体技术资产如下。

| 类型 | 具体资产 | 代码入口 | 作用 | 当前复用成熟度 |
| --- | --- | --- | --- | --- |
| 共享标识 | `PATROL_ROUTE_CONSULT_TOOL`、`PATROL_ROUTE_REVISE_INSTRUCTION` | [`packages/shared-types/src/index.ts`](../../../packages/shared-types/src/index.ts) | 在 AGUIMock 和 Workbench 之间保持 Tool 名称与受控修改指令一致。 | 已位于 `shared-types`，但仍是当前巡逻场景专用语义。 |
| 征询契约 | `patrolRouteConsultRequestSchema`、`patrolRouteConsultResponseSchema`、`parsePatrolRouteConsultResponse`、`patrolRouteConsultResult` | [`apps/web-workbench/src/conversation/patrol-route-consult.ts`](../../../apps/web-workbench/src/conversation/patrol-route-consult.ts) | 校验两条既有路线、选择、取消和受控修改响应，并拒绝请求外选项。 | Workbench 应用内可复用，当前绑定巡逻路线领域。 |
| 控制器接口 | `PatrolRouteConsultController` | [`apps/web-workbench/src/conversation/patrol-route-consult.ts`](../../../apps/web-workbench/src/conversation/patrol-route-consult.ts) | 统一预览、激活、完成、取消预览和失效处理。 | 已形成明确应用内接口，尚未证明跨业务通用性。 |
| HITL 注册 | `useHumanInTheLoop` 的 `requestPatrolRouteSelection` 注册 | [`CopilotKitFrontendToolsBridge.vue`](../../../apps/web-workbench/src/conversation/CopilotKitFrontendToolsBridge.vue) | 把结构化征询交给用户，并通过真实 Tool Result 返回选择。 | 已在 Workbench 产品链路使用。 |
| 呈现组件 | `PatrolRouteConsultHost.vue`、`PatrolRouteConsultSlim.vue`、`ConsultMapOverlay.vue` | [`PatrolRouteConsultHost.vue`](../../../apps/web-workbench/src/conversation/PatrolRouteConsultHost.vue)、[`PatrolRouteConsultSlim.vue`](../../../apps/web-workbench/src/conversation/PatrolRouteConsultSlim.vue)、[`ConsultMapOverlay.vue`](../../../apps/web-workbench/src/conversation/ConsultMapOverlay.vue) | 在 Conversation 与地图决策 dock 之间呈现等待、比较、选择、取消和修改。 | 真实产品组件，当前与地图路线场景耦合。 |
| 会话状态 | `activeConsultSession`、`consultOutcome`、`resetConsultInteractionUi`、`clearConsultSessionState` | [`apps/web-workbench/src/conversation/consult-session.ts`](../../../apps/web-workbench/src/conversation/consult-session.ts) | 连接 Conversation 内 HITL renderer 与地图覆盖层，并清理过期交互状态。 | Workbench 应用内状态资产。 |
| 等待期限方法 | `createPausableRunDeadline`、`isPatrolRouteHumanWaitTool` | [`apps/web-workbench/src/agent/business-agent-client.ts`](../../../apps/web-workbench/src/agent/business-agent-client.ts) | 将真实用户等待排除在短 Run deadline 之外，同时保留普通 Frontend Tool 的执行期限。 | 可复用机制已实现，但当前的等待 Tool 识别仍绑定具体名称。 |
| 确定性 Fixture | `PATROL_ROUTE_CONSULT_REQUEST`、`PATROL_ROUTE_CONSULT_RESPONSES`、`registerConsultPatrolRouteSelectionScenario` | [`packages/ag-ui-mock/src/scenarios/consult-patrol-route-selection.ts`](../../../packages/ag-ui-mock/src/scenarios/consult-patrol-route-selection.ts) | 覆盖选择 A/B、取消、修改和后续地图 continuation。 | 已位于 `ag-ui-mock`，可直接用于协议回归。 |
| 顺序鲁棒性场景 | `north-corridor-route-choice-v1`、`north-corridor-route-choice-reversed-v1` | [`north-corridor-route-choice-v1.json`](../../../apps/map-validation-agent/scenarios/north-corridor-route-choice-v1.json)、[`north-corridor-route-choice-reversed-v1.json`](../../../apps/map-validation-agent/scenarios/north-corridor-route-choice-reversed-v1.json) | 验证模型依据候选事实而不是固定选择第一个选项。 | 真实 Agent 验证资产，provider 结论仍待 smoke 证据。 |
| 自动化证据 | 征询单元测试、AGUIMock 分支测试和浏览器 E2E | [`patrol-route-consult.test.ts`](../../../apps/web-workbench/tests/unit/patrol-route-consult.test.ts)、[`server.test.ts`](../../../packages/ag-ui-mock/test/server.test.ts)、[`workbench.spec.ts`](../../../apps/web-workbench/tests/e2e/workbench.spec.ts) | 验证等待、选择、取消、修改、Stop 失效和真实 continuation。 | 已形成较完整的确定性回归资产。 |

这套工程闭环已经真实存在，但当前公共复用单位主要是 Fixture、测试方法和局部接口。
通用 `waiting_for_user` / `resuming` 状态、跨 Agent capability contract 和业务无关的选择契约仍需第二个消费者证明后再抽象。
