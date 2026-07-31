# Generative UI Platform

本上下文定义 Generative UI Platform 当前统一领域语言。

## Language

**Generative UI Platform**:
整个仓库和长期平台边界。
平台组合 Business Agent 接入、Runtime 编排、UI Compiler、Frontend Runtime、A2UI Renderer 和开发验证能力。
_Avoid_: 使用 Generative UI Compiler 指代完整平台

**Generative UI Compiler**:
平台核心子系统。
负责把 AgentContent 路由为安全 Markdown 或受控 generative UI，并通过 UI Compiler Core 生成 A2UI。
_Avoid_: Agent Runtime Host、Business Agent、Frontend Runtime、完整平台

**Generative UI Compiler MVP Baseline**:
原 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和设计文档定义的历史交付基线。
当前继续作为 UI Compiler 子系统规范，不再代表整个仓库当前范围。
_Avoid_: 当前平台完整范围

**Platform Development Validation Environment**:
当前阶段建设的全链路开发、联调、诊断、回归和演示环境。
它是平台研发基础设施，不是独立产品或正式业务系统。
_Avoid_: 企业产品、生产业务系统

**Generative UI Workbench**:
平台的 Frontend Runtime 参考实现和开发验收工作台。
它只连接 Agent Runtime Host，展示 Markdown 和 A2UI，并发送 Action Event。
_Avoid_: Business Agent、UI Compiler、独立企业业务产品

**Reference Business Agent**:
用于平台完整链路验证的简易业务 Agent。
当前推荐使用 TypeScript LangGraph，实现 Fixture 业务工具、任务草稿、暂停和恢复。
它不是平台核心编译能力，也不代表正式业务 Agent。
_Avoid_: UI Compiler Agent、Model Adapter、生产业务系统

**Business Agent**:
负责业务推理、业务工具、权威业务状态和工作流的外部或参考业务能力。
它输出 Markdown 或 JSON 结构化业务内容。
_Avoid_: UI Compiler、A2UI Producer、Frontend Runtime

**AgentContent**:
Business Agent 返回的 Markdown 或 JSON 结构化业务内容。
_Avoid_: Presentation Decision、UI Plan Candidate、A2UI

**Business Agent Contract**:
Runtime Host 与 Business Agent 之间的协议无关公共调用和结果契约。
_Avoid_: Presentation Contract、AG-UI、A2UI

**Business Agent Adapter**:
Agent Runtime Host 中用于适配具体 Business Agent 原生协议的边界。
它负责请求转换、结果规范化、超时、取消和错误映射。
它不负责 UI 规划或 A2UI 编译。
_Avoid_: Model Adapter、UI Compiler Service、Interaction Gateway

**Business Agent Run**:
Business Agent 从开始处理一次调用到完成、失败、中断或取消的完整执行生命周期。
一次 Business Agent Run 可以产生多个业务步骤和 Presentation Request。
_Avoid_: Presentation Request、UI Compiler Run

**Agent Runtime Host**:
平台中面向 Web 的统一接入和编排层。
它管理 Run 和 Action，调用 Business Agent Adapter 和 UI Compiler Service，并把 PresentationResult 返回 Web。
_Avoid_: UI Compiler Service、Frontend Runtime、Business Agent

**Runtime Orchestrator**:
Agent Runtime Host 内串联 Business Agent、UI Compiler 和返回结果的应用层能力。
HTTP 和 WebSocket Transport 应复用同一个 Orchestrator。
_Avoid_: Business Agent Router、Presentation Router

**Presentation Request**:
调用方提交给 UI Compiler Service 的 AgentContent、Catalog 引用和可选展示上下文。
_Avoid_: Business Agent Run、UI Plan Candidate、A2UI

**Presentation Router**:
UI Compiler Service 内决定安全 Markdown 表示或 generative UI 的模块。
它可以通过 Model Adapter 产生 UI Plan Candidate。
_Avoid_: Business Agent Router、Runtime Orchestrator、UI Compiler Core

**Model Adapter**:
UI Compiler Service 中可替换的模型供应商适配实现。
它处理 AgentContent 和展示上下文，并产生受 Schema 约束但仍不可信的 UI Plan Candidate。
它不用于 Business Agent 业务推理。
_Avoid_: Business Agent Adapter、UI Compiler Core、Business Agent Model Client

**UI Plan Candidate**:
模型或确定性规划器提出的、Schema 合法但仍不可信的框架无关 UI 语义方案。
组件、Props、Action 和结构必须由 UI Compiler Core 根据 Catalog 权威校验。
_Avoid_: UI IR、A2UI、可信编译结果

**UI Compiler Core**:
将 UI Plan Candidate 校验并 Lowering 为可信 UI IR，再确定性编译为 A2UI 的框架无关核心能力。
它不决定展示模式，也不调用模型。
_Avoid_: Renderer、Business Agent、Runtime Host

**UI IR**:
UI Compiler Core 校验并规范化后的可信框架无关中间表示。
_Avoid_: UI Plan Candidate、A2UI

**Presentation Result**:
UI Compiler Service 返回的协议无关展示结果。
它区分 Markdown、generative-ui、降级和失败结果。
_Avoid_: AG-UI Run、Business Agent Result

**A2UI**:
UI Compiler Core 当前默认输出的声明式 UI 协议。
_Avoid_: Presentation Request、UI Plan Candidate、UI IR、AG-UI

**A2UI Renderer**:
Frontend Runtime 中应用 A2UI Operations、维护 Surface，并通过 Component Registry 渲染真实组件的能力。
_Avoid_: UI Compiler Core、Component Catalog

**Component Catalog**:
声明 Compiler 可以选择的组件类型、语义、Schema、Action、约束和版本。
_Avoid_: Component Registry、组件实现

**Component Registry**:
Frontend Runtime 中从组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog、Compiler 组件库

**Action Event**:
用户在受控 A2UI 组件上触发的结构化交互事件。
Action Event 是不可信输入，必须由 Runtime Host 根据 Surface、Run、Catalog 和权限上下文校验。
_Avoid_: 任意后端工具调用、模型生成代码

**AG-UI Run**:
Business Agent Run 在 AG-UI 事件协议中的一种运行表示。
AG-UI 是可选传输适配，不是 Business Agent 的强制协议，也不是 UI Compiler Service 的规范输出。
_Avoid_: A2UI、Presentation Result、Business Agent Contract

**Interaction Gateway**:
未来用于多个 Business Agent 路由、上下文编排和结果聚合的平台扩展能力。
当前阶段不实现。
_Avoid_: Agent Runtime Host 当前基础编排、UI Compiler Service

**外部系统**:
不在当前仓库交付和实现范围内，但可与平台交互的真实业务系统、正式 Business Agent、模型供应商、数据库或设备平台。
Reference Business Agent 和 Workbench 属于当前开发验证环境，不再统称为外部系统。
_Avoid_: 使用外部系统指代所有 Runtime 或前端能力
