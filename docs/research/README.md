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

## 使用原则

当研究资料中的某个方向准备进入产品主线时：

1. 先基于真实场景重新验证假设；
2. 明确它解决的当前问题；
3. 与当前 `docs/ARCHITECTURE.md` 对齐；
4. 如涉及重大架构阶段变化，新增 ADR；
5. 再进入实现。
