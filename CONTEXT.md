# Generative UI Platform

本上下文定义仓库级平台、Compiler 子系统和开发验证环境的统一领域语言。

## Language

**Generative UI Platform**:
仓库级和长期平台边界。
覆盖 Agent 接入、Runtime Host、UI Compiler、Frontend Runtime 和开发验证能力。
_Avoid_: 使用 Generative UI Compiler 指代完整平台

**Generative UI Compiler**:
平台核心子系统，包含 Presentation Pipeline、Presentation Router、Model Adapter 和 UI Compiler Core。
原 Compiler MVP 文档继续作为该子系统基线。
_Avoid_: 完整平台、Business Agent、Frontend Runtime

**Platform Development Validation Environment**:
当前阶段建设的全链路研发基础设施，用于开发、联调、诊断、回归和演示。
它不是独立产品，也不是正式业务前端。
_Avoid_: 企业产品、正式业务系统

**Generative UI Workbench**:
Frontend Runtime 参考实现和开发验证工作台。
它只连接 Agent Runtime Host，渲染 Markdown 和 A2UI。
_Avoid_: Business Agent、Presentation Pipeline

**Reference Business Agent**:
用于全链路验证的参考业务 Agent，优先采用 TypeScript LangGraph。
它只输出 Markdown 或结构化业务数据。
_Avoid_: UI Compiler Agent、A2UI Agent

**Business Agent Adapter**:
Agent Runtime Host 中隔离平台契约与具体 Business Agent 协议的适配层。
_Avoid_: Model Adapter、Business Agent

**Agent Runtime Host**:
平台前端统一入口。
它调用 Business Agent，并将业务结果提交给嵌入式 Presentation Pipeline。
_Avoid_: Presentation Pipeline、Frontend Runtime

**AgentContent**:
Business Agent 返回的 Markdown 或 JSON 结构化业务内容。
_Avoid_: UI Plan Candidate、A2UI

**Presentation Request**:
提交给 Presentation Pipeline 的 AgentContent、Catalog 引用和可选展示上下文。
_Avoid_: Business Agent Request、A2UI

**Presentation Router**:
在 UI Compiler Core 之前决定 Markdown 或 generative UI 的 Service 内部模块。
_Avoid_: Business Agent Router、UI Compiler Core

**Model Adapter**:
Presentation Pipeline 中供 Presentation Router 调用的模型供应商适配实现。
它用于生成不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate，不用于 Business Agent 业务推理。
_Avoid_: Business Agent Adapter、UI Compiler Core

**UI Plan Candidate**:
模型或确定性规划器提出的、Schema 合法但仍不可信的 UI 语义方案。
_Avoid_: UI IR、A2UI、可信结果

**UI Compiler Core**:
校验 UI Plan Candidate 和 Component Catalog，构建 UI IR 并编译 A2UI 的框架无关核心能力。
_Avoid_: Renderer、Business Agent、Gateway

**UI IR**:
UI Compiler Core 校验并规范化后的可信框架无关中间表示。
_Avoid_: UI Plan Candidate、A2UI

**A2UI**:
Generative UI Compiler 当前默认输出的声明式 UI 协议。
_Avoid_: Presentation Request、UI Plan Candidate、UI IR

**Component Catalog**:
声明 Compiler 可选择的组件类型、语义、Schema、约束和版本。
_Avoid_: Component Registry、组件实现

**Frontend Runtime**:
消费 PresentationResult，并通过 Markdown Renderer、A2UI Renderer 和 Component Registry 转换为真实界面。
_Avoid_: Agent Runtime Host、Presentation Pipeline

**Component Registry**:
Frontend Runtime 中从组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog

**Interaction Gateway**:
未来连接多个 Business Agent 的平台扩展能力。
不属于当前全链路开发验证阶段。
_Avoid_: Agent Runtime Host、当前 Goal

**Compiler MVP 文档基线**:
原 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和设计文档定义的 Compiler 子系统规范。
这些文档继续保留，但不再代表整个仓库范围。
_Avoid_: 仓库级平台规范

**平台级规范**:
`docs/platform/` 中描述跨子系统范围、架构和开发环境的文档。
_Avoid_: Compiler 内部详细设计
