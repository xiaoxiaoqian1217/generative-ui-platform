# 地图场景实验

本目录保存以地图作为实验场的 Agent–User Interaction 实验。

一级索引不是 UI 问题，而是**可复用交互模式**：

```text
Interaction Mode
↓
Map Scenario
↓
Experiment
↓
实验结果
↓
交互知识资产 + 可复用技术资产
```

上位分享说明：[`AGENT-USER-INTERACTION-MAP-VALIDATION.md`](../../AGENT-USER-INTERACTION-MAP-VALIDATION.md)。  
地图验证主设计：[`MAP-AGENT-INTERACTION-VALIDATION.md`](../../research/MAP-AGENT-INTERACTION-VALIDATION.md)。  
详细研究底稿：[`AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md`](../../research/AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md)。

## 交互模式与实验映射

| 交互模式 | 地图验证场景 | EXP |
| --- | --- | --- |
| 单轮问答 | 普通文本问答 | 已成熟，不单独 EXP |
| 委托执行 | 用户把北侧通道巡逻研判整体交给 Agent | [`EXP-001-delegated-execution.md`](./EXP-001-delegated-execution.md) |
| 征询等待 | 路线 A / B 均合理，Agent 停下来让用户选择 | [`EXP-002-consult-and-wait.md`](./EXP-002-consult-and-wait.md) |
| 工具中介行动 | Agent 通过 Frontend Tool 操作共享地图 | [`EXP-003-tool-mediated-action.md`](./EXP-003-tool-mediated-action.md) |
| 打断纠偏 | Agent 执行中用户修改目标 / 约束，旧待执行计划失效 | [`EXP-004-interrupt-and-correct.md`](./EXP-004-interrupt-and-correct.md) |

## EXP 统一模板

```text
1. 交互模式
2. 实验目标
3. 实验场景
4. 交互流程
5. 验证重点
6. 实验结果
7. 最终沉淀
   7.1 交互知识资产
   7.2 可复用技术资产
```

### 交互知识资产

主要沉淀：

- 模式定义；
- 标准交互流程；
- 设计原则；
- 适用边界；
- 可迁移场景。

### 可复用技术资产

主要检查：

- 可复用交互能力；
- 状态 / 协议约定；
- Frontend / Runtime 实现；
- Scenario / Fixture；
- 自动化测试与可观察证据。

## 横切验证问题

以下内容不是独立一级 Interaction Mode，优先放回对应 EXP 中验证：

- 意图可见性；
- Progress / Activity；
- 控制权让渡；
- Shared State；
- Direct Manipulation；
- 失败与恢复；
- Preview / Confirm / Approval。

只有出现明确设计争议时才增加局部 A/B 对照。**对照方案是实验手段，不是 EXP 的固定章节。**

## 维护原则

1. 不因为出现一个新 UI 问题就自动创建新 EXP。
2. 新 EXP 优先对应一个可独立描述、可跨业务复用的 Interaction Mode。
3. 地图只是验证载体，业务名词不进入模式结构。
4. 实验结果只写真实运行和实际观察，不把候选原则提前写成已验证结论。
5. 单个 EXP 完成后，优先沉淀知识资产和技术资产，而不是继续扩 Demo 功能。
