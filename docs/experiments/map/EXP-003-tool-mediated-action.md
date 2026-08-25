# EXP-003：工具中介行动

> **交互模式**：工具中介行动  
> **实验目的**：验证 Agent 通过 Frontend Tool 操作既有 GUI 时，用户是否能够把这些操作理解为 Agent 对当前任务的直接行动，并形成稳定、可复用的 Agent → Tool → GUI → Result → Continue 闭环。

---

## 1. 交互模式

**工具中介行动**表示 Agent 不只是输出文本，而是通过前端暴露的受控能力改变既有 GUI 状态，用户直接观察结果，Tool Result 再回到 Agent 继续任务。

```text
User Request
↓
Agent Chooses Frontend Capability
↓
Tool Call
↓
GUI Changes
↓
Tool Result
↓
Agent Continue
```

这个模式的可复用对象不是某个地图函数，而是“Agent 通过受控前端能力作用于共享界面”的闭环。

---

## 2. 实验目标

本实验要确认：

> **Agent 连续调用前端能力改变地图时，工具调用、界面变化、结果回传和后续 Agent 行为能否形成一个清晰且稳定的交互闭环。**

重点关注：

- Agent 是否调用与用户目的匹配的前端能力；
- GUI 是否只执行实际发生的 Tool Call，不提前伪造后续动作；
- Tool Result 是否能够支撑 Agent 正确继续；
- 多步工具操作是否保持同一个任务上下文；
- 用户能否理解关键地图变化的任务意义；
- Frontend Tool 是否保持地图域意图，而不绑定智能参谋业务实体。

“意图可见性”在本 EXP 中作为横切验证问题保留，而不再单独作为 Interaction Mode。

---

## 3. 实验场景

使用“北侧通道巡逻要素展示”场景。

用户提出：

> **把北侧通道的巡逻要素展示出来。**

固定 Scenario 提供业务事实与地图投影，Agent 只负责选择和编排已有地图域能力：

```text
显示限制区域
↓
聚焦北侧通道
↓
高亮关键观察点与限制区
↓
预览既有候选路线 A
```

对应当前 Frontend Tools：

```text
setLayerVisibility(...)
focusOn(...)
highlight(...)
previewPath(...)
```

当前 `map-validation-agent` 已绑定这四个能力，`north-corridor-overview-v1` 的 `expectedInteraction` 为 `act`，可直接作为真实 Agent 工具中介行动的验证载体。

---

## 4. 交互流程

| 阶段 | 用户 | Agent | GUI |
| --- | --- | --- | --- |
| 请求 | 提出展示目标 | 理解目标并选择能力 | 保持当前地图状态 |
| 调用 | 观察 | 发起 Frontend Tool Call | 执行真实地图操作 |
| 结果 | 观察变化 | 等待 Tool Result | 返回执行结果 |
| 连续行动 | 必要时介入 | 基于结果调用下一能力 | 保持同一共享表面 |
| 完成 | 阅读结果 | 汇总当前完成内容与边界 | 保留最终地图状态 |

---

## 5. 验证重点

工具中介行动模式成立，至少需要确认：

- Agent 只调用已经注册并允许的 Frontend Tool；
- 工具参数与 Scenario 中的地图目标一致；
- 前端根据真实 Tool Call 改变地图，而不是根据文本猜测；
- Tool Result 能被 Agent 消费并驱动后续步骤；
- 多步调用不会重复执行已完成动作或泄漏业务专有语义到工具契约；
- 用户能够把地图变化与当前任务联系起来；
- 临时预览、选中、已执行等状态边界不被混淆；
- 失败时能够明确知道是工具执行失败，而不是把失败包装成成功结果。

必要时可以针对“多少语义反馈最合适”做局部对照，但这只是该模式中的设计优化，不定义 EXP 本身。

---

## 6. 实验结果

### 当前已有工程基础

- `setLayerVisibility`、`focusOn`、`highlight`、`previewPath` 已作为地图 Frontend Tools 存在；
- AGUIMock 已具备确定性多步 Tool Call → Result 链路；
- `map-validation-agent` 已绑定相同地图能力；
- `north-corridor-overview-v1` 已提供版本化 Scenario 与 Expected Facts；
- Workbench Inspect 可观察 Run、Tool Call、Tool Result 和地图终态；
- 真实 provider smoke 仍需根据实际运行记录补齐。

### 实际观察

- 待形成性验证后填写。

### 当前判断

> 工具闭环已经具有较强工程基础；本 EXP 要进一步确认它是否能形成业务无关、可迁移的交互知识与技术资产。

---

## 7. 最终沉淀

### 7.1 交互知识资产

实验完成后，应沉淀：

- **模式定义**：Agent 通过受控前端能力直接作用于既有 GUI，并基于执行结果继续；
- **标准流程**：Intent → Tool Call → GUI Change → Tool Result → Continue；
- **设计原则**：Agent 决定“做什么”，前端能力决定“如何安全、确定地作用于 GUI”；默认界面展示用户语义，不把协议日志当作交互；
- **适用边界**：适合确定、可结构化、前端已经拥有实现能力的 GUI 操作；不适合让模型生成任意前端代码或把复杂业务执行伪装成视觉操作；
- **可迁移场景**：地图定位/高亮、表格筛选、图表聚焦、甘特图选择、工作流节点定位等。

### 7.2 可复用技术资产

当前可复用基础：

- 地图域 Frontend Tool 集合；
- CopilotKit `useFrontendTool` 承载；
- Tool Result continuation；
- MapLibre persistent surface；
- AGUIMock deterministic scenarios；
- `map-validation-agent` 与 overview Scenario；
- Inspect / E2E 证据链。

实验后再决定是否进一步沉淀：

- Frontend Tool capability contract；
- 跨业务可复用的 Tool Call / Result 测试规范；
- 失败 / 超时 /取消的统一状态语义；
- 其他 GUI 域的同构工具中介实现模板。
