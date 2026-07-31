# ADR-0007：将当前交付范围扩展为平台全链路开发验证环境

- 状态：Accepted
- 日期：2026-07-31

## 背景

仓库最初以 Generative UI Compiler MVP 为当前交付重点。

原需求和架构将 Agent Runtime Host、真实 Business Agent、Frontend Runtime、A2UI Renderer 和 Action 闭环视为 Compiler MVP 外部系统或非目标。

随着 Runtime Host、Web Demo 和 Workbench 需求出现，仅验证 Compiler 子系统已经不能证明 Generative UI Platform 的完整架构可行。

团队需要一套可运行的开发环境验证 Business Agent 接入、展示编译、浏览器渲染和 Action 回传。

## 决策

当前仓库的顶层交付范围扩展为：

```text
Generative UI Platform
├── UI Compiler 子系统
├── Agent Runtime Host
├── Business Agent Adapter
├── Reference Business Agent
├── Generative UI Workbench
├── A2UI Renderer
└── 全链路开发验证环境
```

原 Compiler MVP 文档继续保留，并作为 UI Compiler 子系统需求和设计基线。

新增平台级需求、架构和 Goal 作为当前仓库范围的规范来源。

## 强制边界

- Web 只连接 Agent Runtime Host。
- Business Agent 不需要支持 AG-UI、A2UI 或 CopilotKit。
- Business Agent 只输出 Markdown 或结构化业务数据。
- Business Agent Adapter 不承担 UI 编译。
- Model Adapter 位于 UI Compiler Service。
- Model Adapter 输出不可信 UI Plan Candidate。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- Interaction Gateway 和多 Agent 动态路由仍不属于当前阶段。

## 文档处理

- 不删除旧需求、架构和设计文档。
- 不把旧 Compiler MVP 文档静默改写为平台文档。
- 使用 `docs/compiler/README.md` 解释旧文档的当前适用范围。
- 使用 `docs/platform/` 存放当前平台级规范。
- 使用 `docs/goals/` 存放阶段性交付 Goal。

## 影响

正面影响：

- 仓库名称、代码方向和文档边界一致。
- 编码 Agent 不再因旧范围规则拒绝平台链路任务。
- Compiler 子系统原有安全和依赖约束得到保留。
- Workbench、Reference Business Agent 和 E2E 获得明确授权。

代价：

- 需要新增平台级契约和架构边界。
- CI 和依赖边界检查需要覆盖更多应用。
- 平台完成标准高于原 Compiler MVP。

## 未决事项

本 ADR 不决定：

- Interaction Gateway 的产品关系。
- 多 Business Agent 路由。
- 生产级持久化和权限。
- 正式业务系统部署方式。
