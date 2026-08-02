# UI Compiler 子系统文档

本目录说明原 Compiler MVP 文档在当前平台文档体系中的位置。

原有文档继续保留在原路径：

- [Compiler MVP 需求](../REQUIREMENTS.md)
- [Compiler MVP 架构](../ARCHITECTURE.md)
- [Compiler 系统设计](../Generative_UI_Compiler_Design.md)
- [数据契约](../CONTRACTS.md)

这些文件不删除、不重命名，以保留历史链接、评审记录和阶段基线。

## 当前解释规则

旧文档中的“当前产品”“当前 MVP”“外部 Frontend Runtime”“外部 Agent Runtime Host”和“真实 Business Agent 范围外”等表述，应解释为其形成时的 Generative UI Compiler MVP 范围。

它们不再单独代表整个仓库当前阶段的顶层范围。

## 继续有效的 Compiler 约束

- Presentation Pipeline 接收 `PresentationRequest` 并返回 `PresentationResult`。
- Presentation Router 决定 Markdown 或 generative UI 展示路径。
- Model Adapter 位于 Presentation Pipeline。
- Model Adapter 输出不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate。
- UI Compiler Core 不决定展示模式，也不调用模型。
- UI Compiler Core 保持前端框架、传输协议、Agent 框架和模型供应商无关。
- Component Catalog 定义 Compiler 可选组件和 Action 边界。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- 编译失败时必须保留有效业务内容并安全降级。

## 由平台级规范决定的范围

以下事项应以平台级文档和有效 ADR 为准：

- Runtime Host 的部署和编排职责。
- Reference Business Agent 是否属于当前建设范围。
- Workbench 和 A2UI Renderer 是否属于当前建设范围。
- Action 回传闭环和平台完整 E2E 是否属于当前阶段。

当前入口：

- [平台文档索引](../platform/README.md)
- [平台级需求](../platform/REQUIREMENTS.md)
- [平台级架构](../platform/ARCHITECTURE.md)
- [当前 Goal](../goals/GOAL-DEV-ENV-001.md)
- [ADR 索引](../adr/README.md)

## 修改原则

修改 Compiler 内部契约、路由、模型适配、Catalog、UI IR 或 A2UI 编译时，必须同时阅读原 Compiler 基线和当前平台级规范。

发生冲突时，平台范围以平台文档和有效 ADR 为准；Compiler 内部技术约束仍以 Compiler 文档和相关 ADR 为准。
