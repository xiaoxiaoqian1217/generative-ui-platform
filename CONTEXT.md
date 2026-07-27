# Generative UI Platform

本上下文定义 Generative UI Platform 及其当前产品的统一领域语言。

## Language

**Generative UI Platform**:
承载生成式 UI 编译能力及未来平台能力的长期产品和仓库边界。
_Avoid_: 使用 Generative UI Compiler 指代完整的长期平台

**Generative UI Compiler MVP**:
当前交付和验收的产品范围，仅包含 UI Compiler Core 和 UI Compiler Service。
_Avoid_: Generative UI Platform MVP、Interaction Gateway MVP

**UI Compiler Core**:
将 Schema 合法但仍不可信的 UI Plan Candidate 确定性地编译为受控 UI 描述的框架无关核心能力。
_Avoid_: Renderer、Business Agent、Gateway

**UI Compiler Service**:
接收 AgentContent，执行展示路由、安全降级和模型 Adapter 组装，并通过网络协议暴露结果的应用服务。
_Avoid_: UI Compiler Agent、Business Agent、Interaction Gateway

**AgentContent**:
业务 Agent 返回的 Markdown 或 JSON 结构化业务内容。
_Avoid_: Presentation Decision、UI Plan Candidate

**Presentation Request**:
调用方提交给 UI Compiler Service 的 AgentContent、Catalog 引用和可选展示上下文。
_Avoid_: UI Compile Request、UI IR、A2UI

**Presentation Router**:
在 UI Compiler Core 之前决定安全 Markdown 表示或 generative UI，并在后者中产生 UI Plan Candidate 的 Service 内部模块。
_Avoid_: Business Agent Router、UI Compiler Core

**Model Adapter**:
Presentation Router 在需要语义分析时调用的可替换模型供应商适配实现。
_Avoid_: UI Compiler Core、Business Agent

**UI Plan Candidate**:
模型或确定性规划器提出的、Schema 合法但仍不可信的框架无关 UI 语义方案。
组件、Props、Action 和结构建议必须由 UI Compiler Core 根据 Catalog 做权威校验。
_Avoid_: UI IR、A2UI、可信编译结果

**UI IR**:
UI Compiler Core 校验并规范化后的可信框架无关中间表示。
_Avoid_: UI Plan Candidate、A2UI

**A2UI**:
Generative UI Compiler 当前默认输出的声明式 UI 协议。
_Avoid_: Presentation Request、UI Plan Candidate、UI IR

**Component Catalog**:
声明 Compiler 可以选择的组件类型、语义、Schema、约束和版本。
_Avoid_: Component Registry、组件实现

**Component Registry**:
外部 Frontend Runtime 中从组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog、Compiler 组件库

**Interaction Gateway**:
未来用于统一连接前端和多个业务 Agent 的平台能力，不属于 Generative UI Compiler MVP。
_Avoid_: UI Compiler Service、MVP Gateway
