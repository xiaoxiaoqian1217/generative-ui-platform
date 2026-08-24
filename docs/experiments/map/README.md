# 地图场景实验

本目录保存以地图作为实验场的 Agent–User Interaction 单次实验。

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

- [`EXP-001-intent-visibility-a0-a1.md`](./EXP-001-intent-visibility-a0-a1.md)：验证 Agent 连续改变共享 GUI 时，是否需要最小意图反馈。
- [`EXP-002-consult-and-confirm.md`](./EXP-002-consult-and-confirm.md)：验证 Agent 到达存在多个合理选择的决策点时，何时应该让渡控制权给用户。

## 后续方向

- `EXP-003-interrupt-and-correct.md`：用户打断 / 纠偏后，Agent 的旧计划如何失效与接续。
- Direct Manipulation / 混合主导：用户直接修改 GUI 后，Agent 如何读取新状态并继续工作。

后续实验不按功能 Roadmap 自动展开，而根据前一个实验暴露的问题和形成的交互边界决定是否进入实现。
