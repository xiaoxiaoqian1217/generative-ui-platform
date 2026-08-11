# Generative UI Platform 同类产品与架构研究

<!-- cspell:ignore Interactables Replit Tambo Thesys -->

## 研究范围

本文基于 2026 年 8 月 10 日可访问的官方产品文档、协议规范和官方开源仓库，研究与本平台相似或相邻的产品与技术。
研究重点不是寻找一个可以直接复制的竞品，而是回答三个问题。

1. 市场上哪些产品分别解决了生成 UI、Agent 前端连接、持久工作流和安全交互问题。
2. 哪些实现模式值得本平台采用，哪些模式会破坏当前信任边界。
3. 结合当前仓库的规范和实现状态，下一步应优先建设什么。

本文以已接受的 ADR、`docs/platform/REQUIREMENTS.md` 和 `docs/platform/ARCHITECTURE.md` 为约束。
本文不授权改变当前架构。

## 执行摘要

市场已经形成四个相邻但不同的技术层。

- A2UI、json-render、OpenUI 和 Adaptive Cards 主要解决受控 UI 描述与渲染。
- AG-UI、CopilotKit、Vercel AI SDK UI 和 assistant-ui 主要解决 Agent 与前端的流式连接和前端开发体验。
- LangGraph 主要解决业务工作流状态、Checkpoint、Interrupt 和恢复。
- MCP Apps 和 OpenAI Apps SDK 主要解决在对话宿主中运行开发者提供的完整交互应用。

没有一个被研究的产品完整覆盖本平台已经定义的 Runtime Truth、可信 UI 编译、Surface 生命周期和安全 Command Admission。
本平台最有价值的差异不是简单的“模型可以生成 UI”。
本平台真正的差异是把业务事实、交互事实和展示投影分开，并对有副作用的用户 Action 提供可恢复、可诊断和 effectively-once 的接纳语义。

因此最重要的建议是保持当前架构方向，不要把平台改造成代码生成器、前端聊天组件库或具体 Agent Framework 的附属插件。
当前最高优先级也不应是增加更多组件或更多协议，而应是把 ADR-0024 和 ADR-0025 已批准的 Runtime Truth Model 真正落到契约、SQLite Repository、Command Admission 和恢复路径中。

## 本平台的准确定位

本平台最适合被定位为：

> 面向 Business Agent 的可信生成式展示与安全交互运行基础设施。

它对外有两个清晰的产品接入面。

1. Presentation Integration 为已有 Runtime 的调用方提供可信 Markdown 和 A2UI 展示编译。
2. Agent Runtime Integration 为只有 Business Agent 的调用方提供 Thread、Operation、Surface、Command、恢复和可信展示。

这个双接入模型优于把 Compiler、Presentation、Runtime 和 Interactive Runtime 暴露成四个产品等级。
内部模块分层是工程结构，对外接入模式应该围绕调用方需要平台承担哪一种事实责任来定义。

## 市场分类总览

| 类别 | 代表产品 | 主要解决的问题 | 与本平台关系 |
| --- | --- | --- | --- |
| 声明式生成 UI 协议 | Google A2UI、Adaptive Cards | 用受控 JSON 描述可渲染 UI | 最接近 UI Compiler 输出层 |
| 生成 UI 框架 | json-render、OpenUI、Tambo、Thesys C1 | Catalog、模型生成、流式渲染和组件注册 | 最接近 Presentation Pipeline 与 Renderer |
| Agent 前端协议与框架 | AG-UI、CopilotKit、Vercel AI SDK UI、assistant-ui | 流式消息、工具、状态和前端组件 | 最接近实时投影和 Workbench |
| 持久 Agent Runtime | LangGraph | Checkpoint、Interrupt、Resume 和工作流恢复 | 最接近 Business Agent 私有 Runtime |
| 对话内完整应用 | MCP Apps、OpenAI Apps SDK | 沙箱 iframe、工具调用和应用级交互 | 未来可选的独立展示模式 |
| 构建期代码生成 | v0、Lovable、Replit Agent | 生成、修改、预览和部署真实代码 | 不是运行时竞品，只能参考开发体验 |

## 重点产品分析

### Google A2UI 与 Flutter GenUI SDK

A2UI 是当前与本平台输出格式最接近的开放协议。
A2UI v0.9 使用 `createSurface`、`updateComponents`、`updateDataModel` 和 `deleteSurface` 等 JSON 消息构建可增量更新的 Surface。
协议把组件结构和 Data Model 分离，并要求客户端通过受支持 Catalog 渲染本地组件。
A2UI v0.9.1 是当前稳定版本系列，v1.0 仍是 Candidate。
[A2UI v0.9 规范](https://a2ui.org/specification/v0.9-a2ui/) 和 [A2UI 概览](https://a2ui.org/concepts/overview/) 描述了这些消息、Catalog、Data Model 和版本状态。

A2UI 的主要优点与本平台一致。

- 它发送数据而不是任意可执行代码。
- 它通过 Catalog 限制可用组件和函数。
- 它与 React、Angular、Lit、Flutter 等具体 Renderer 解耦。
- 它支持流式和增量更新。
- 它支持客户端能力和 Catalog 能力协商。

Google 的 Flutter GenUI SDK 已经把 A2UI 用作内部 UI 表达，并提供 Catalog、SurfaceController、Transport Adapter、Conversation 和 Surface 等客户端抽象。
官方仓库仍把 SDK 标记为高度实验性，因此其 API 形状值得参考，但不适合作为平台权威模型的直接来源。
[Flutter GenUI 官方仓库](https://github.com/flutter/genui) 提供了当前状态、包结构和 A2UI 支持说明。

A2UI 与本平台存在三个关键差异。

1. A2UI 允许 Agent 直接生成 UI，而本平台禁止 Business Agent 选择组件或输出 A2UI。
2. A2UI 的 Surface 主要是渲染对象，而本平台的 Surface 是 Runtime Host 拥有的权威交互对象。
3. A2UI Action 没有内建 `commandId`、`expectedRevision`、CAS、幂等接纳和 `indeterminate` 语义。

A2UI v0.9 可以在 Action 时把完整客户端 Data Model 回传给服务端。
这可以简化表单同步，但也可能扩大敏感数据暴露范围。
[A2UI Actions 文档](https://a2ui.org/concepts/actions/) 明确描述了 `sendDataModel`、Action Context 和能力元数据。
本平台不应默认回传整个 Data Model，而应继续使用 Catalog 和 Action Contract 明确选择允许上传的字段，并在 Runtime Host 边界重新校验。

建议借鉴 A2UI 的能力协商、结构与数据分离、注册函数和标准错误格式。
不建议让 A2UI 自己拥有 Surface 生命周期、Command Admission 或 Runtime 恢复。

### AG-UI 与 CopilotKit

AG-UI 是一个轻量、事件驱动、传输无关的 Agent 与用户界面协议。
它定义 Run、消息、工具调用、状态 Snapshot、JSON Patch Delta、Activity 和自定义事件等投影机制。
[AG-UI 架构](https://docs.ag-ui.com/concepts/architecture) 和 [AG-UI Events](https://docs.ag-ui.com/concepts/events) 描述了事件模型和 Snapshot-Delta 模式。

CopilotKit 提供前端 SDK、嵌入应用服务器的 Runtime 和 Agent Backend 接入。
官方架构把系统分为 Frontend、Runtime 和 Agent 三层，并使用 AG-UI 连接这些层。
[CopilotKit Architecture](https://docs.copilotkit.ai/concepts/architecture) 给出了这一分层。

本平台当前把 CopilotKit 作为嵌入 Runtime Host 的 Adapter 和 Infrastructure 是正确的。
AG-UI 的灵活性适合做实时投影，但它不应自动成为 Runtime Repository。

AG-UI 当前还提供事件流序列化、历史恢复、压缩和 Run lineage。
[AG-UI Serialization](https://docs.ag-ui.com/concepts/serialization) 把序列化事件流描述为恢复聊天和 UI 状态的一种方式。
这对兼容客户端和诊断时间线有价值，但与本平台的 Runtime Truth Model 不是同一层。
本平台仍应从 Runtime Repository 恢复 Thread、Operation、Command 和 Surface 真相，再把 AG-UI Event Replay 用作只读投影增强。

建议继续使用 AG-UI 作为唯一 Agent 交互应用协议，并增加明确的能力协商和平台扩展事件版本。
不建议把 AG-UI 的 `runId`、事件日志或共享状态直接提升为平台 Domain 主键和权威状态。

### Vercel AI SDK UI

Vercel AI SDK 的 Generative UI 主要把模型工具调用结果映射为开发者编写的 React 组件。
模型选择工具，工具执行后返回数据，前端为已知工具渲染对应组件。
[AI SDK Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) 描述了这个模式。

它的优点是低门槛、工具与组件绑定清晰、流式体验成熟。
它更适合应用内已知工具的 UI，而不是跨 Framework、跨 Renderer 的可信 UI 编译平台。
它也没有提供本平台的 Command Admission 和 Runtime Truth 语义。

建议借鉴工具状态 UI、流式 Skeleton、错误边界和取消体验。
不建议把 Business Agent Tool Call 直接等同于最终 Presentation，也不建议用 Tool Call ID 替代平台 Command 或 Operation。

### json-render

json-render 是 Vercel Labs 的生成 UI 框架。
它让开发者用 Schema 定义组件和 Action Catalog，模型只生成允许的 JSON Spec，再由不同 Renderer 映射为本地组件。
官方仓库已经提供 React、Vue、Svelte、Solid、React Native、PDF、Email、Remotion、Three.js 和 Terminal 等 Renderer，以及 Devtools 和状态 Store Adapter。
[json-render 官方仓库](https://github.com/vercel-labs/json-render) 是其能力和包结构的一手来源。

json-render 最值得借鉴的不是另一个 JSON 格式，而是工程工具链。

- Catalog 可以生成模型 Prompt。
- Core Schema 与 Framework Renderer 分包。
- Devtools 可以查看 Spec Tree、State、Action Log、Stream 和 Catalog。
- 同一 Spec 可以通过 Renderer Conformance Test 验证多个目标。
- 状态 Store 通过 Adapter 与 Redux、Zustand、Jotai 和 XState 等实现解耦。

本平台已经拥有独立 Compiler Core、Catalog Schema 和 Vue Renderer，因此不需要换成 json-render。
更值得做的是补齐 Catalog Studio、Renderer Conformance Kit、Presentation Devtools 和跨版本 Fixture Corpus。

### OpenUI 与 Thesys C1

OpenUI 是 Thesys 开源的流式生成 UI 语言和 React Runtime。
它使用紧凑文本语言而不是 JSON，以减少生成 Token 并改善逐 Token 渲染。
[OpenUI 官方仓库](https://github.com/thesysdev/openui) 提供语言、Renderer、Prompt 生成和自有 Benchmark。

OpenUI 报告的 Token 优势来自项目自有 Benchmark。
本平台不应仅根据供应方数据替换 A2UI 或 UI IR。
正确做法是保留内部 UI IR 和独立 Encoder，在真实 Catalog、模型和业务场景上测量首个可用 UI 延迟、总 Token、校验失败率和视觉质量。

Thesys C1 是商业 Generative UI API。
调用方 Backend 把 Prompt、History 和工具数据发送给 C1，C1 返回 C1 DSL，前端通过 React SDK 渲染。
[Thesys How C1 Works](https://docs.thesys.dev/guides/how-c1-works) 描述了这条链路。
C1 还提供 UI State 持久化，但公开架构没有给出与本平台相同的 Surface revision、CAS、Command Admission 和 `indeterminate` 业务语义。

建议把 OpenUI 当作一个可测量的候选 Encoder 思路，而不是新的平台权威格式。
建议把 C1 当作产品体验和 Provider API 竞争者，而不是 Runtime Truth 的参考实现。

### Tambo

Tambo 是面向 React 的全栈 Generative UI Toolkit。
开发者注册带 Zod Schema 的组件，Agent 选择组件并流式生成 Props，Tambo Backend 负责 Conversation State 和 Agent Execution。
它可以使用 Cloud 或自托管 Backend。
[Tambo 官方仓库](https://github.com/tambo-ai/tambo) 和 [Tambo Docs](https://tambo.co/docs) 描述了这些能力。

Tambo 的产品体验很接近“快速把已有组件变成 Agent UI”。
它适合作为本平台 SDK、组件注册和快速开始体验的参考。
它的 Agent 仍直接参与组件选择，因此不应成为本平台 Business Agent Contract 的模板。

建议借鉴五分钟接入、组件 CLI、Schema-first 组件注册、状态 Hook 和 Cloud 或 Self-hosted 的一致体验。
不建议把 Tambo Backend 的 Conversation State 直接替代本平台 Runtime Repository。

### assistant-ui

assistant-ui 提供 React AI Chat 组件、Headless Runtime、协议 Adapter 和可选 Cloud 持久化。
它支持 Tool UI、LangGraph Data UI 和基于组件 Allowlist 的 JSON Generative UI。
[assistant-ui 文档](https://www.assistant-ui.com/docs) 和 [Generative UI 文档](https://www.assistant-ui.com/docs/tools/generative-ui) 描述了这些模式。

assistant-ui 的 Interactables 还支持版本、历史、恢复和可持久化的用户与模型共享 UI State。
[Interactables](https://www.assistant-ui.com/docs/tools/interactables) 展示了历史版本与当前可编辑实例的区别。
这个 UX 与本平台历史 Surface 需求高度相关。

建议借鉴 Headless Primitive、External Store Adapter、局部错误 UI、历史版本查看和显式 Restore UX。
但本平台的 Restore 必须创建新的当前 Command 或新 Surface，不能把历史 Surface 重新标为 actionable。
assistant-ui 的 Allowlist 只解决组件名，平台仍必须在 Compiler 边界校验 Props、URL、Action Target、数据大小和嵌套结构。

### LangGraph 与 Agent Chat UI

LangGraph 的核心价值是业务工作流 Checkpoint、Interrupt、Resume、Time Travel 和 Fault Tolerance。
[LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) 和 [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) 说明 Graph State 会按 Thread 保存为 Checkpoint，并在恢复时重新执行节点。

LangGraph 文档明确要求 Interrupt 前的副作用必须幂等，因为恢复会从节点开始重新执行。
这支持本平台把业务副作用幂等责任留给 Business Agent，同时在 Runtime Host 只保证 Command Admission。

LangGraph Agent Chat UI 可以把 Graph Node Output、Token、Tool、Interrupt 和 UI Message 映射到 React 前端。
[LangGraph Generative UI](https://docs.langchain.com/langsmith/generative-ui-react) 允许 Agent 直接推送组件名称和 Props，并加载开发者编写的外部 React Bundle。

本平台不应复制 LangGraph Checkpoint，也不应让 Workbench 直连 LangGraph Server。
正确的集成方式仍是 Business Agent Adapter 映射公开过程事件和最终 AgentContent，并用 `threadId`、`operationId` 和可选 `agentRunId` 关联两个独立事实域。

建议借鉴 Node Progress、Time Travel Debugging、State Fork 和 Interrupt UI。
不建议采用 `push_ui_message(name, props)` 作为 Business Agent 公共契约。

### Microsoft Adaptive Cards

Adaptive Cards 是成熟的跨宿主声明式 UI 格式。
应用发送 JSON Card，Host 把它转换为符合自身主题和能力的本地 UI。
[Adaptive Cards 官方站点](https://adaptivecards.io/) 把它定义为平台无关的 JSON UI 片段，并强调声明式交互可以降低代码注入风险。

Adaptive Cards 的长期经验说明三件事非常重要。

1. Renderer 必须声明支持的 Schema Version 和 Feature。
2. HostConfig 应拥有主题和本地样式，而不是让 Payload 控制任意视觉细节。
3. Layout Template 和 Data 应分离，以便只更新数据和复用模板。

Adaptive Cards 的 Action 仍由 Host Application 自行处理。
[Adaptive Cards Getting Started](https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/getting-started) 明确说明 `Action.Submit` 只是把输入收集后交给 Host 定义的方法。
它没有平台级 exactly-one Admission、Surface CAS 或不确定副作用模型。

建议借鉴 Host Capability Matrix、HostConfig、版本降级和 Data Binding。
不建议只靠前端禁用按钮处理重复提交。

### MCP Apps 与 OpenAI Apps SDK

MCP Apps 允许 MCP Server 返回一个交互 UI Resource。
Host 通常把开发者提供的 HTML、JavaScript 和 CSS 放入 Sandboxed iframe，并通过 `postMessage` 和 JSON-RPC 代理 Tool Call、消息和上下文更新。
[MCP Apps Overview](https://modelcontextprotocol.io/extensions/apps/overview) 和 [MCP Apps 官方仓库](https://github.com/modelcontextprotocol/ext-apps/) 描述了协议、安全边界和 SDK。

OpenAI Apps SDK 建立在 MCP 之上，让开发者同时定义应用逻辑与对话内 UI。
[OpenAI Apps SDK 产品说明](https://openai.com/index/introducing-apps-in-chatgpt/) 说明应用可以在 ChatGPT 对话中提供交互界面，并连接开发者自己的 Backend。

MCP Apps 与 A2UI 解决的是不同问题。
A2UI 让平台 Renderer 从可信 Catalog 组合本地组件。
MCP Apps 让 Host 隔离运行一个开发者提供的完整 Web App。
后者更适合地图、编辑器、复杂可视化和第三方 App，但也引入 CSP、Permission、App Identity、Tool Proxy 和 iframe 生命周期等新的信任边界。

当前平台不应把 MCP Apps 混入 A2UI Compiler。
如果未来需要第三方插件生态，应通过新 ADR 定义独立的 Sandboxed App Presentation Mode，并继续让 Runtime Host 拥有 Command Admission。

### v0、Lovable 与 Replit Agent

v0、Lovable 和 Replit Agent 是构建期代码生成产品。
它们生成、编辑、预览和部署真实应用代码，而不是在每个 Agent Turn 中编译受控 Presentation Payload。
[v0 Full-stack Apps](https://v0.dev/docs/full-stack-apps)、[Lovable Introduction](https://docs.lovable.dev/introduction/welcome) 和 [Replit Build and Publish](https://docs.replit.com/build/your-first-app) 展示了这种产品模型。

这些产品不是本平台的直接竞品。
它们值得借鉴的是 Plan、Preview、Diff、版本、测试、发布门禁和可回退体验。
它们不适合作为 Runtime Presentation 或安全 Action 架构的参考。

## 能力差异矩阵

| 能力 | A2UI/json-render | CopilotKit/AG-UI | LangGraph | MCP Apps | 本平台目标 |
| --- | --- | --- | --- | --- | --- |
| 受控组件 Catalog | 强 | 可选 | 弱 | 不适用 | 强 |
| 跨 Renderer UI Payload | 强 | 依赖上层 | 弱 | Web iframe | A2UI Profile |
| Agent 流式事件 | 弱到中 | 强 | 强 | Tool 级 | AG-UI Projection |
| Business Checkpoint | 无 | 不拥有 | 强 | App 自有 | Business Agent 拥有 |
| Runtime Thread Truth | 无 | 实现自定 | Agent Thread | Host 自定 | Runtime Host 拥有 |
| Surface 生命周期 | 渲染语义 | 前端语义 | UI State | iframe 生命周期 | 权威 Domain 实体 |
| Command 幂等接纳 | 无 | 实现自定 | 业务自行处理 | Host 自定 | Runtime Repository 事务 |
| 不确定副作用 | 无 | 无统一语义 | 工作流自行处理 | App 自行处理 | `indeterminate` + Reconcile |
| Diagnostic 与 Truth 分离 | 无统一要求 | 无统一要求 | Trace 与 Checkpoint 可分 | Host 自定 | 强制分离 |

## 当前规范与实现的差距

已接受规范已经定义了正确的目标，但当前主分支实现仍保留旧模型。
以下差距来自对当前代码的只读检查。

1. `packages/runtime-contract/src/schemas.ts` 的 Turn Status 仍包含 `history-write-failed`，还没有独立的 Operation Phase、Operation Outcome 和 History Persistence Status。
2. 当前 `runtimeActionRequestSchema` 仍要求浏览器提交 `threadId` 和 `runId`，还没有收敛为 `commandId`、`surfaceId`、`actionId`、`expectedRevision` 和 `input`。
3. `apps/agent-runtime-host/src/surface-context-store.ts` 仍是带 TTL 的内存 Map，并按 `threadId + runId + surfaceId` 查找和消费 Surface。
4. `apps/agent-runtime-host/src/thread-repository.ts` 的 SQLite Schema 只持久化 Thread、Turn 和 Presentation Snapshot，没有 Operation、Command Admission 和权威 Surface 表。
5. Workbench 仍维护 `activeOperation` 和本地 Business Surface 状态，尚未完全迁移为 Runtime Snapshot 的只读投影。

这些不是新的架构问题，而是已经批准的 ADR-0024 和 ADR-0025 尚未完成落地。
继续增加更多 Renderer、更多 Agent Framework 或更多 UI 组件会扩大迁移面，因此应先关闭这一差距。

## 推荐目标架构

```text
Frontend Runtime
  -> AG-UI Command or Run Input
Agent Runtime Host
  -> PlatformRunService
  -> Runtime Kernel
     -> Runtime Repository transaction
        -> Thread
        -> Turn
        -> Operation
        -> Command Admission
        -> Surface + Presentation Snapshot
     -> Business Agent Adapter
        -> Business Agent private State and Checkpoint
     -> Presentation Pipeline
        -> Markdown direct
        -> Structured AgentContent
           -> Presentation Model candidate
           -> UI Compiler Core
           -> trusted UI IR
           -> versioned A2UI Encoder
  -> PlatformRuntimeEvent projection
     -> AG-UI stream
     -> Diagnostic Store
```

UI IR 应继续是平台内部的稳定可信表示。
A2UI 应作为一个版本化 Encoder 输出，而不是把协议细节扩散到 Runtime Domain。
这样可以在未来评估 A2UI v1、OpenUI 或其他 Encoder，而不改变 Business Agent、Runtime Truth 和 Component Catalog 的语义。

## 实施优先级

### P0: 完成 Runtime Truth Migration

- 发布 Runtime Contract 新版本，新增 Operation、Command、Surface 和正交状态类型。
- 为旧 v1 Contract 提供明确的兼容 Adapter 和退役时间，而不是在新类型里继续扩大旧 `runId` 语义。
- 在 SQLite 中增加 `operations`、`commands`、`surfaces` 和必要的 Presentation Snapshot 关系。
- 用单个本地事务完成 Command 幂等检查、Surface revision 校验、CAS、Operation 创建和 consumed 状态提交。
- 事务提交后才调用 Business Agent Resume。
- 把 `indeterminate` 和 Reconcile 建成真实可测试的路径。
- 让 Workbench 从 Runtime Snapshot 重建状态，而不是把浏览器 Store 当成权威来源。
- 增加双击、重发、断线、Runtime 重启和部分失败的 Playwright E2E。

P0 是当前最重要的工作。
它直接形成与现有产品不同的 Interaction Safety Guarantee。

### P1: 完善 Presentation Interoperability

- 增加 Renderer Capability Handshake，至少包含 A2UI Version、Catalog ID、Catalog Version、Catalog Hash 和可用 Client Function。
- 默认关闭完整 Data Model 回传，只允许 Action Schema 显式选择字段。
- 把 UI IR 到 A2UI 的 Encoder 独立版本化，并建立 Golden Fixture 和 Schema Conformance Test。
- 为组件 Props、URL、媒体源、Action Target、数据大小和嵌套深度建立统一 Policy。
- 增加局部 Renderer Error Boundary，让一个组件失败不会摧毁整个 Conversation。
- 保持 Markdown Fallback 只改变 Presentation Outcome。

### P2: 建设开发者产品面

- 围绕 ADR-0025 提供两个独立 Quickstart，而不是暴露内部模块树。
- 为 Presentation Integration 提供 Headless SDK、Catalog CLI 和最小 Renderer Kit。
- 为 Agent Runtime Integration 提供 Business Agent Adapter SDK 和 Runtime Host Starter。
- 建设 Catalog Gallery、Schema Linter、Prompt Preview、A2UI Inspector 和 Action Simulator。
- 借鉴 json-render Devtools 和 v0 Preview，支持查看 AgentContent、Decision、Candidate、Validation、UI IR、A2UI 和 Renderer 结果。
- 提供 LangGraph、Mastra 和自定义 HTTP/SSE Adapter，但 Adapter 只做协议映射。

### P3: 基于证据的后续演进

- 评估渐进式可信编译，但只发布通过完整验证的 Surface Revision。
- 用真实业务 Corpus 比较 JSON、OpenUI 和其他 Encoder 的 Token、延迟、错误率和视觉质量。
- 在 A2UI v1 成为稳定标准且有明确价值时启动独立迁移决策。
- 在出现明确第三方复杂应用需求时评估 MCP Apps 风格的 Sandboxed App Mode。
- 只有满足 ADR-0019 的重新评估触发条件时，才讨论独立 Compiler Service。

## 组件与交互设计建议

Catalog 不应只由 Button、Row、Text 和 Card 等低层组件组成。
低层组件过多会增加模型 Token、布局自由度和无效组合数量。
平台应同时提供受控的高层 Domain Component，例如 ApprovalSummary、OrderReview、DeviceStatus、IncidentTimeline 和 EditableTable。

每个 Action 应显式属于以下一类。

1. Local Presentation Action 只修改浏览器内展示状态，例如展开、筛选和 Tab 切换。
2. Runtime Command 需要 Runtime Host 接纳，但不一定产生外部副作用。
3. Business Side-effect Command 需要 Approval、幂等键、Operation Outcome 和 Reconcile。

Local Presentation Action 不能伪装成业务已完成。
Business Side-effect Command 不能由 Renderer 直接执行。

历史 Surface 应允许展开、复制、查看详情和创建新请求。
历史 Surface 不应恢复旧 Action Authority。
如果用户要基于历史内容重做操作，UI 应创建新的 Command，并在当前权威上下文中重新校验。

## 评估指标

平台应同时测量 Presentation Quality 和 Interaction Safety。

Presentation 指标建议包括：

- Markdown 直出率。
- Generative UI 路由率。
- Candidate Schema 失败率。
- Compiler 拒绝率。
- Markdown Fallback 率。
- 首个可用 UI 延迟。
- 总 Presentation 延迟。
- 输入与输出 Token。
- Renderer Error 率。
- Catalog 覆盖率和未知组件率。

Interaction 指标建议包括：

- Command 重复提交率。
- 幂等命中率。
- Surface revision 冲突率。
- CAS 冲突率。
- consumed 后重复点击拒绝率。
- Operation Outcome 分布。
- `indeterminate` 数量和平均 Reconcile 时间。
- Runtime 重启后的恢复成功率。
- Diagnostic Store 不完整但 Runtime Truth 正确的恢复测试通过率。

## 不建议采用的路线

- 不要让 Business Agent 直接输出 A2UI、OpenUI、React Component Name 或 UI Plan Candidate。
- 不要让 Web 直连 Business Agent、LangGraph Server 或模型 Provider。
- 不要执行模型生成的 HTML、JavaScript、Vue 或 React 代码。
- 不要把 CopilotKit、AG-UI Event Store、浏览器 Store 或 Diagnostic Store 当成 Runtime Truth。
- 不要用浏览器提供的 `runId` 决定 Action 权威上下文。
- 不要把 Tool Call、UI Action 和 Command Admission 合并成一个含糊概念。
- 不要为了追求流式效果把未完整验证的 Candidate 直接发布为 actionable Surface。
- 不要在当前阶段提前建设 Interaction Gateway、多 Agent 路由、分布式锁或独立 Runtime Kernel Service。

## ARCHITECTURE CONFLICT

本研究的 P0、P1 和 P2 建议与当前已接受架构一致，不要求改变 ADR。

以下市场模式与当前架构存在实质冲突，不能静默采用。

| 市场模式 | 冲突规范 | 实际影响 | 允许的下一步 |
| --- | --- | --- | --- |
| Business Agent 直接生成 A2UI 或组件树 | 平台需求、ADR-0019、ADR-0025 | Business Agent 获得展示决策权 | 保持当前架构，或先创建新 ADR |
| Web 直连 Agent 或模型 | 平台需求与平台架构 | 绕过 Runtime Host 权威入口 | 保持当前架构 |
| 执行模型生成代码 | Compiler 安全边界 | 绕过 Catalog 和可信编译 | 保持当前架构 |
| 把 AG-UI Event Replay 当作真相 | ADR-0024 | Diagnostic 或投影覆盖 Runtime Repository | 保持当前架构 |
| 引入 MCP Apps Sandboxed App Mode | 当前 Presentation Mode 和信任边界 | 新增 iframe、CSP、Permission 和 App Identity | 需要新 ADR |
| 迁移到 A2UI v1 Candidate | ADR-0008 与当前 A2UI Profile | 改变 Encoder、Renderer 和兼容矩阵 | 等待稳定并创建迁移决策 |
| 拆出独立 Compiler Service | ADR-0019 | 改变部署、生命周期和故障边界 | 仅在重新评估条件满足后创建新 ADR |
| 建设 Multi-Agent Gateway | 平台 Scope 和 ADR-0025 | 改变路由与事实所有权 | 需要新 ADR |

本文没有获得修改这些架构语义的授权。
因此这些项目只作为未来决策输入，不能进入当前实现范围。

## 最终建议

本平台不应追求成为“另一个 A2UI Renderer”或“另一个 CopilotKit”。
它应把 A2UI 当作可替换的 Presentation Encoding，把 AG-UI 当作实时投影协议，把 CopilotKit 当作 Adapter，把 LangGraph 当作一种 Business Agent Runtime。
平台自身应专注于其他产品普遍没有完整解决的四件事。

1. 可信 UI 编译。
2. 清晰的事实所有权。
3. 安全且可恢复的 Command Admission。
4. Presentation、Runtime Truth 和 Diagnostics 的正交状态。

近期最正确的实现顺序是先完成 Runtime Truth Migration，再做 Catalog Capability、Renderer Conformance 和 Developer Tooling。
如果这个顺序得到坚持，平台会形成一个明确且难以被普通生成 UI 框架替代的产品边界。

## 主要官方来源

- [Google A2UI Specification](https://a2ui.org/specification/v0.9-a2ui/)
- [Google A2UI GitHub](https://github.com/google/A2UI)
- [Flutter GenUI GitHub](https://github.com/flutter/genui)
- [AG-UI Documentation](https://docs.ag-ui.com/)
- [AG-UI GitHub](https://github.com/ag-ui-protocol/ag-ui)
- [CopilotKit Architecture](https://docs.copilotkit.ai/concepts/architecture)
- [Vercel AI SDK Generative UI](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)
- [json-render GitHub](https://github.com/vercel-labs/json-render)
- [OpenUI GitHub](https://github.com/thesysdev/openui)
- [Thesys C1 Documentation](https://docs.thesys.dev/guides/how-c1-works)
- [Tambo Documentation](https://tambo.co/docs)
- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Generative UI](https://docs.langchain.com/langsmith/generative-ui-react)
- [Adaptive Cards](https://adaptivecards.io/)
- [MCP Apps Overview](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP Apps GitHub](https://github.com/modelcontextprotocol/ext-apps/)
- [OpenAI Apps SDK Introduction](https://openai.com/index/introducing-apps-in-chatgpt/)
- [v0 Documentation](https://v0.dev/docs)
- [Lovable Documentation](https://docs.lovable.dev/introduction/welcome)
- [Replit Documentation](https://docs.replit.com/build/your-first-app)
