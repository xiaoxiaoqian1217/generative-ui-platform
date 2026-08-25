# 实验记录

`docs/experiments/` 用于保存 Agent–User Interaction 的单次实验。

实验记录不是产品规范，也不是最终结论。当前实验优先围绕**可复用交互模式**组织，而不是围绕零散 UI 问题或功能 Roadmap 展开。

## 目录

- [`map/`](./map/)：以地图作为实验场的 Agent–User Interaction 实验。

## 当前实验组织方式

```text
Interaction Mode
↓
具体场景
↓
实验运行与观察
↓
交互知识资产 + 可复用技术资产
```

每个 EXP 统一回答：

1. 这是什么交互模式；
2. 这次实验具体要确认什么；
3. 在什么地图场景里验证；
4. User / Agent / GUI 如何协作；
5. 模式成立需要重点观察什么；
6. 实际结果是什么；
7. 最后沉淀了哪些知识资产和技术资产。

## 规则

1. 一个 EXP 优先对应一个能够脱离业务名词描述的 Interaction Mode。
2. 不因为出现一个新的 UI 设计问题就自动创建 EXP；意图可见性、Shared State、Direct Manipulation 等优先作为横切问题放回对应模式。
3. A/B 对照是可选验证手段，不是所有 EXP 的固定要求。
4. 实验结果只记录真实运行和实际观察；候选原则不得提前写成已验证事实。
5. 工程链路跑通可以证明机制成立，但不能单独证明交互设计已经成立。
6. 稳定结论进入 `docs/reports/`，并优先整理为交互知识资产与可复用技术资产。

地图验证主设计见 [`docs/research/MAP-AGENT-INTERACTION-VALIDATION.md`](../research/MAP-AGENT-INTERACTION-VALIDATION.md)。  
详细研究方法仍可参考 [`docs/research/AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md`](../research/AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md)。
