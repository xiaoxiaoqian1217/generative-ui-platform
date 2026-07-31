# UI Compiler 子系统文档

本目录用于说明旧 Compiler MVP 文档在新平台文档体系中的位置。

旧文档继续保留在原路径：

- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/Generative_UI_Compiler_Design.md`

不删除、不重命名这些文件，以保留历史链接、评审记录和阶段基线。

## 当前解释规则

旧文档中的：

```text
当前产品
当前 MVP
外部 Frontend Runtime
外部 Agent Runtime Host
真实 Business Agent 范围外
```

应解释为其形成时的 Generative UI Compiler MVP 范围。

它们不再代表整个仓库当前阶段的顶层范围。

## 继续有效的 Compiler 约束

- UI Compiler Service 接收 AgentContent 并返回 PresentationResult。
- Presentation Router 决定 Markdown 或 generative-ui。
- Model Adapter 位于 UI Compiler Service。
- UI Plan Candidate 仍是不可信输入。
- UI Compiler Core 不决定展示模式。
- UI Compiler Core 不调用模型。
- UI Compiler Core 保持框架、协议、Agent 框架和供应商无关。
- Component Catalog 是 Compiler 可选组件边界。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- 编译失败时必须保留有效业务内容并安全降级。

## 已由平台级规范替代的范围判断

以下内容应以平台级文档为准：

- Runtime Host 是否属于当前仓库建设范围。
- Reference Business Agent 是否允许实现。
- Web Workbench 和 A2UI Renderer 是否允许实现。
- Action 回传闭环是否属于当前阶段。
- 平台完整 E2E 是否属于当前阶段。

当前平台级规范：

- `docs/platform/REQUIREMENTS.md`
- `docs/platform/ARCHITECTURE.md`
- `docs/goals/GOAL-DEV-ENV-001.md`

## 修改原则

修改 Compiler 内部契约、路由、模型适配、Catalog、UI IR 或 A2UI 编译时，必须同时阅读旧 Compiler 文档和当前平台级文档。

若两者冲突，平台范围以平台文档为准，Compiler 内部技术约束仍以 Compiler 文档和相关 ADR 为准。
