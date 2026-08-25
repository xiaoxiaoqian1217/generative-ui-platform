# 研究资料

`docs/research/` 用于保存对 Generative UI、Agent 交互、HITL、Approval、Runtime safety 等方向仍有思想参考价值的研究资料。

这些研究文档属于**非规范性输入**。

它们：

- 不是当前架构事实；
- 不是当前 Release Gate；
- 不代表仓库已经实现其中方案；
- 不授权直接恢复已经删除的 Runtime / Compiler / Presentation 实现；
- 在真正进入产品阶段前，必须结合当时的真实 Agent、框架版本和业务需求重新验证。

## Agent–User Interaction 研究主线

地图交互验证现在采用“研究协议 → 具体场景设计 → 单次实验 → 阶段报告”的分层方式：

```text
Research Protocol
  ↓
Map Scenario / Validation Design
  ↓
Experiment Records
  ↓
Validation Report
```

- [Agent–User Interaction 地图场景验证研究设计](./AGENT-USER-INTERACTION-MAP-RESEARCH-PROTOCOL.md)：**上位 Research Protocol**。定义研究目标、stateful GUI 问题空间、DSRM + Research Question / Hypothesis + Evidence-driven Evaluation 方法、RQ1–RQ7、可证伪假设、证据等级、Experiment Card 与 Stop Rules。后续地图 Demo 应先回答“它在验证哪个 Research Question、需要获得什么证据”，再进入实现。
- [地图场景人机交互验证方向](./MAP-AGENT-INTERACTION-VALIDATION.md)：Research Protocol 下的地图具体母场景与实验设计，包含 A-D 核心场景、E-H 横切维度、A0-A2 呈现变体和实施顺序。
- [Agent 交互泛化方向讨论记录](./AGENT-INTERACTION-GENERALIZATION.md)：泛化交互方式而非 UI 界面的第一性原理推演，作为研究问题与交互模式抽象的思想输入。
- [地图实验记录](../experiments/map/README.md)：按 Experiment Card 执行的单次实验与证据记录。
- [验证报告](../reports/README.md)：由多次实验汇总形成的阶段性结论与适用边界。

## 其他当前资料

- [Agent Approval Patterns](./ISSUE-175-AGENT-APPROVAL-PATTERNS.md)：Approval / Human-in-the-loop 方案研究，可作为未来交互安全能力的参考。
- [委托执行与 Artifact 语义讨论记录](./DELEGATED-EXECUTION-ARTIFACT-SEMANTICS.md)：委托执行的判别标准与任务一等对象深度结构（生命周期 / 进度 / 交付物，Task / Run / Artifact 三层生命周期嵌套）、五种交互模式的事件流对照、RUN_FINISHED 检查点角色、Artifact 语义与契约族、身份三轴、schemaVersion 随数据走的论证、呈现生成的确定性边界与事件合成三条纪律，可作为 Issue #200 互操作验证与未来 Artifact 通道演进的参考。
- [Felt 地图域意图参考](./FELT-MAP-INTENT-REFERENCE.md)：Felt 官方地图能力、可核验 API 原语与当前地图域意图的边界对照。

## 使用原则

当研究资料中的某个方向准备进入产品主线时：

1. 先基于真实场景重新验证假设；
2. 明确它解决的当前问题；
3. 与当前 `docs/ARCHITECTURE.md` 对齐；
4. 如涉及重大架构阶段变化，新增 ADR；
5. 再进入实现。

对 Agent–User Interaction 实验还额外要求：

1. 没有明确 Research Question 和可证伪假设，不进入实验开发；
2. 工程链路通过只计为 E1 工程证据，不替代用户证据；
3. 单个地图场景的结果不直接宣称为跨领域通用模式；
4. 量化记录只作为首轮形成性研究的辅助证据，不默认设置 KPI 或硬阈值；
5. 稳定结论进入 `docs/reports/`，单次实验事实保留在 `docs/experiments/`。
