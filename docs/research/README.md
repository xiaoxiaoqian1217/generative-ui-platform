# 研究资料

`docs/research/` 用于保存对 Generative UI、Agent 交互、HITL、Approval、Runtime safety 等方向仍有思想参考价值的研究资料。

这些文档属于**非规范性输入**：不是当前架构事实，不代表仓库已经实现其中全部方案，也不授权恢复已经退出的 Runtime / Compiler / Presentation 架构。

## Agent–User Interaction 研究主线

当前主线已经收敛为：

> **以有限的 Agent 交互模式为一级索引，用地图场景逐一验证，并把结果沉淀为交互知识资产与可复用技术资产。**

```text
5 类 Interaction Mode
↓
地图验证场景
↓
EXP-001 ~ EXP-004
↓
真实运行与观察
↓
交互知识资产 + 可复用技术资产
↓
阶段性验证报告
```

五类模式：

- 单轮问答：已有基础能力，不单独建立 EXP；
- 委托执行：EXP-001；
- 征询等待：EXP-002；
- 工具中介行动：EXP-003；
- 打断纠偏：EXP-004。

### 当前入口

- [Agent–User Interaction 地图场景验证说明](../AGENT-USER-INTERACTION-MAP-VALIDATION.md)：**面向分享的主文档**，说明为什么验证、如何验证以及最终价值。
- [地图场景 Agent–User Interaction 验证方向](./MAP-AGENT-INTERACTION-VALIDATION.md)：**当前地图验证主设计**，维护 Interaction Mode → Scenario → EXP 的映射、横切问题和实现载体。
- [地图实验记录](../experiments/map/README.md)：四类核心交互模式的具体实验。
- [Agent 交互泛化方向讨论记录](./AGENT-INTERACTION-GENERALIZATION.md)：五类交互模式及 Layer 2 泛化逻辑的思想来源，含五种交互模式的 AG-UI 事件流对照（fixture 与两条消费路径）。
- [Agent–User Interaction 地图场景验证研究设计](./AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md)：**详细方法底稿**，保留 Research Question、假设、证据和研究方法；用于需要解释验证严谨性时查阅，不再作为 EXP 编号或场景组织的一级入口。
- [验证报告](../reports/README.md)：多个 EXP 稳定后形成阶段性结论。

## EXP 的组织原则

EXP 优先对应一个能够脱离业务名词完整描述的 Interaction Mode，而不是每发现一个 UI 问题就新建实验。

统一结构：

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

意图可见性、Progress、Shared State、Direct Manipulation、失败恢复、Preview / Confirm 等作为横切问题，优先放回对应 Interaction Mode 中验证。

A/B 对照是可选实验手段，不是每个 EXP 的固定结构。

## 最终沉淀

### 交互知识资产

包括：

- 模式定义；
- 标准交互流程；
- 设计原则；
- 适用边界；
- 可迁移场景。

### 可复用技术资产

包括：

- 可复用交互能力；
- 状态 / 协议约定；
- Frontend / Runtime 实现；
- Scenario / Fixture；
- 自动化测试与可观察证据。

适用边界保留，因为它回答“什么时候应该用、什么时候不要用”，但不再作为独立一级成果。

## 其他当前资料

- [Agent Approval Patterns](./ISSUE-175-AGENT-APPROVAL-PATTERNS.md)：Approval / Human-in-the-loop 研究参考。
- [委托执行与 Artifact 语义讨论记录](./DELEGATED-EXECUTION-ARTIFACT-SEMANTICS.md)：委托执行、生命周期、Artifact 与事件流的深度研究输入。
- [Felt 地图域意图参考](./FELT-MAP-INTENT-REFERENCE.md)：Felt 官方地图能力与当前地图域意图边界参考。

## 使用原则

1. 真实代码、当前 ADR、`AGENTS.md` 和 `CONTEXT.md` 仍定义当前工程事实。
2. 实验文档只把真实运行和实际观察写成结果，不把候选原则提前写成已验证结论。
3. 工程链路跑通证明机制成立，但不自动等于交互知识已经成立。
4. 单个地图场景的发现先标明适用条件，再判断能否迁移到其他 GUI。
5. 稳定的多实验结论进入 `docs/reports/`。
