# 研究资料

`docs/research/` 用于保存对 Generative UI、Agent 交互、HITL、Approval、Runtime safety 等方向仍有思想参考价值的研究资料。

这些研究文档属于**非规范性输入**。

它们：

- 不是当前架构事实；
- 不是当前 Release Gate；
- 不代表仓库已经实现其中方案；
- 不授权直接恢复已经删除的 Runtime / Compiler / Presentation 实现；
- 在真正进入产品阶段前，必须结合当时的真实 Agent、框架版本和业务需求重新验证。

## 当前资料

- [Agent Approval Patterns](./ISSUE-175-AGENT-APPROVAL-PATTERNS.md)：Approval / Human-in-the-loop 方案研究，可作为未来交互安全能力的参考。
- [Agent 交互泛化方向讨论记录](./AGENT-INTERACTION-GENERALIZATION.md)：泛化交互方式而非 UI 界面的第一性原理推演，交互模式三层模型与 Layer 2 交付边界，可作为 Issue #200 与后续交互模式设计的参考。
- [地图场景人机交互验证方向](./MAP-AGENT-INTERACTION-VALIDATION.md)：以"Agent 操作地图"为载体验证人与 Agent 交互方式的方案论证，含 Felt 产品调研、验证维度与最小工具面设计，可作为后续地图操作工具面扩展与交互验证 Issue 的参考。

## 使用原则

当研究资料中的某个方向准备进入产品主线时：

1. 先基于真实场景重新验证假设；
2. 明确它解决的当前问题；
3. 与当前 `docs/ARCHITECTURE.md` 对齐；
4. 如涉及重大架构阶段变化，新增 ADR；
5. 再进入实现。
