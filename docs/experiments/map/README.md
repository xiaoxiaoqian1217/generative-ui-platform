# 地图场景实验

本目录保存以地图作为实验场的 Agent-User Interaction 单次实验。

实验文档重点回答：

```text
实验目标
↓
实验场景
↓
对照方案
↓
实验结果
↓
Interaction Pattern / Design Principle / Boundary
```

上位研究说明：[`AGENT-USER-INTERACTION-MAP-VALIDATION.md`](../../AGENT-USER-INTERACTION-MAP-VALIDATION.md)。
详细研究底稿：[`AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md`](../../research/AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md)。
地图母场景与既有验证设计：[`MAP-AGENT-INTERACTION-VALIDATION.md`](../../research/MAP-AGENT-INTERACTION-VALIDATION.md)。

## 当前实验

- [`EXP-001-intent-visibility-a0-a1.md`](./EXP-001-intent-visibility-a0-a1.md)：验证 Agent 连续操作共享 GUI 时的最小意图可见性。
- [`EXP-002-consult-and-confirm.md`](./EXP-002-consult-and-confirm.md)：验证 Agent 到达存在多个合理选择的决策点时，何时应该让渡控制权给用户。
- [`EXP-003-interrupt-and-correct.md`](./EXP-003-interrupt-and-correct.md)：验证用户通过语言打断 / 纠偏后，依赖旧条件且尚未执行的 Agent 计划如何失效，并从最新状态继续。
- [`EXP-004-direct-manipulation-and-shared-state.md`](./EXP-004-direct-manipulation-and-shared-state.md)：验证用户直接操作 GUI 产生的任务语义状态，何时应该成为 Agent 的最新上下文。

## 当前实验主线

```text
EXP-001
Agent 在做什么？
→ Intent Visibility

EXP-002
Agent 什么时候应该停下来让用户决定？
→ Control Yield / Decision Point

EXP-003
用户通过语言改变方向后怎么办？
→ Interrupt / Correction / Stale Plan

EXP-004
用户直接操作 GUI 表达意图后怎么办？
→ Direct Manipulation / Semantic Shared State
```

这四个实验逐步从“看懂 Agent”推进到“人与 Agent 共同操作同一个有状态 GUI”。

## 后续方向

后续不按功能 Roadmap 自动增加实验，而根据前述实验暴露的问题决定。

优先可能进入：

- Agent 操作与用户直接操作发生冲突时，当前控制权如何确定；
- 哪些 GUI State 应进入 Agent Context，哪些只属于本地视觉状态；
- 高风险 / 不可逆操作中的 Preview、Confirm 与 Commit 边界；
- 从地图实验中提炼可迁移到表格、甘特图、工作流等 GUI 的 Interaction Pattern。

后续实验的目的仍然不是补齐功能，而是形成可以复用的 **Interaction Pattern、Design Principle 和 Boundary**。
