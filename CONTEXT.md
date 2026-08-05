# Generative UI Platform

本上下文定义仓库级平台、Compiler 子系统、Agent 交互协议和开发诊断能力的统一领域语言。

## Language

**Generative UI Platform**:
仓库级和长期平台边界。
覆盖 Agent 接入、Agent Runtime Host、Generative UI Compiler、Frontend Runtime 和开发诊断能力。
_Avoid_: 使用 Generative UI Compiler 指代完整平台

**Generative UI Compiler**:
平台核心子系统，包含 Presentation Pipeline、Presentation Router、Model Adapter 和 UI Compiler Core。
原 Compiler MVP 文档继续作为该子系统基线。
_Avoid_: 完整平台、Business Agent、Frontend Runtime

**Platform Development Validation Environment**:
当前阶段建设的全链路研发基础设施，用于开发、联调、诊断和演示。
它不是正式业务前端，也不在当前阶段承担完整测试案例管理平台职责。
_Avoid_: 企业业务系统、完整回归测试平台

**Generative UI Workbench**:
Frontend Runtime 参考实现和开发诊断工作台。
它只连接 Agent Runtime Host，通过 AG-UI 参与 Agent 交互，渲染 Markdown 和 A2UI，并查看 Debug Conversation 与逐 Turn 诊断。
_Avoid_: Business Agent、Presentation Pipeline、Agent 编排器

**Workbench 开发验证产品化**:
以 Generative UI Workbench 为对象的建设阶段。
它把开发验证环境完善为可独立部署、可诊断、可恢复历史和可导出诊断包的产品，而非正式业务运营前端。
_Avoid_: 正式指挥系统、完整案例测试平台

**AG-UI Agent 交互协议**:
Workbench 与 Agent Runtime Host 之间唯一的 Agent 交互应用协议。
当前参考实现使用 CopilotKit Runtime 的 HTTP POST + SSE 路径；HTTP、SSE 和 WebSocket 是传输机制，不与 AG-UI 作为同一层级的协议并列。
_Avoid_: 将 AG-UI、HTTP、SSE、WebSocket 并列为四种业务协议

**CopilotKit Runtime 集成**:
CopilotKit Runtime 嵌入 Agent Runtime Host，作为 AG-UI 入口和运行时库。
Runtime Host 是宿主应用，CopilotKit Runtime 不是并列部署的第二个 Runtime。
自定义 Agent Adapter 必须调用统一应用级执行服务，不得将 Business Agent 直接注册后绕过 Presentation Pipeline。
_Avoid_: 独立 CopilotKit Runtime 服务、前端直连 Business Agent

**PlatformRunService**:
Agent Runtime Host 中统一协调 Business Agent Adapter、Presentation Pipeline、Action/Resume 和平台运行事件的应用级服务。
传输和协议入口只做映射，不复制业务执行逻辑。
_Avoid_: 按 HTTP、WebSocket 或 AG-UI 分别实现独立编排

**Business Agent 公开事件流**:
Business Agent 主动发布给平台的业务事件集合，可以包含消息、活动、进度、状态、后端工具调用与公开结果、Interrupt、确认、业务 Artifact 和最终 AgentContent。
Business Agent 对公开内容和可见范围负责。
_Avoid_: Business Agent 只能返回最终 Markdown 或 JSON

**Business Agent Adapter**:
Agent Runtime Host 中隔离平台契约与具体 Business Agent 协议的适配层。
它只执行契约校验、关联标识补充、事件映射和非法事件拒绝，不总结、改写或重新解释业务内容。
_Avoid_: Model Adapter、业务内容加工器、诊断存储器

**Reference Business Agent**:
用于全链路验证的参考业务 Agent，优先采用 TypeScript LangGraph。
它可以流式发布公开业务事件，并以 Markdown 或结构化数据作为最终 AgentContent。
_Avoid_: UI Compiler Agent、A2UI Agent

**Agent Runtime Host**:
平台前端统一入口和 CopilotKit Runtime 宿主应用。
它调用 Business Agent，协调公开过程事件，将最终 AgentContent 提交给嵌入式 Presentation Pipeline，校验 Action，并提供 Debug Conversation 与诊断查询接口。
_Avoid_: Presentation Pipeline 本身、Frontend Runtime、Business Agent 私有状态所有者

**PlatformRuntimeEvent**:
Runtime Host 内部对已经进入平台公开边界的运行事件的统一类型化表达。
同一事件投影为 AG-UI 实时事件和持久化 DiagnosticEvent，并共享 eventId、sequence、threadId、runId、turnId、toolCallId 等标识。
_Avoid_: 为实时流和历史分别生成互不关联的事件

**Diagnostic Event**:
持久化的规范化事件流水，记录事件顺序、阶段、状态、关联标识、摘要和 Artifact 引用。
它是诊断过程事实，不保存原始 SSE 文本、WebSocket Frame 或 CopilotKit 内部实例。
_Avoid_: 原始传输帧、第二套业务事件

**Diagnostic Artifact**:
正式公开契约边界上的完整可序列化输入、输出或结果对象，例如 Tool Result、AgentContent、Presentation Request、UI Plan Candidate、Validation Result、UI IR、A2UI 和 PresentationResult。
小中型对象可以内联存储，大型对象转入文件或对象存储，诊断数据库仅保存元数据和引用。
_Avoid_: Provider 原始请求、私有 Checkpoint、任意内存转储

**Diagnostic Recorder**:
订阅平台诊断投影、规范化并持久化 Diagnostic Event 和 Diagnostic Artifact 的逻辑应用模块。
MVP 位于 Agent Runtime Host 应用内部，不自动拆成 workspace package 或独立服务；诊断失败不得阻断主业务。
_Avoid_: Runtime Host 核心业务职责、packages/diagnostic-recorder 默认拆包

**TurnDetailsResponse**:
Workbench 打开某个 Turn 时，由 Runtime Host 根据 Diagnostic Event 临时聚合出的 API 响应。
它用于展示状态、耗时、时间线、阶段、工具调用、错误和 Artifact 引用，不是数据库实体或第二份权威事实。
_Avoid_: 持久化 TurnTrace、不可重建快照

**Debug Conversation**:
由 Agent Runtime Host 管理、可在 Workbench 中切换和诊断的持久会话记录。
它保存平台公开事件与展示诊断；Business Agent 私有工作流状态由独立 Checkpoint Store 持有，两者通过 shared threadId 关联。
_Avoid_: 浏览器聊天缓存、Business Agent checkpoint 副本

**Shared Thread Identity**:
Runtime Host 的 Debug Conversation 与 Business Agent checkpoint 共用的 threadId。
它只关联两个权威数据源，不合并二者的数据所有权。
_Avoid_: 共享数据库、分布式事务

**Diagnostic Bundle**:
由用户主动导出的 Conversation 或 Turn 诊断包，包含所选公开事件、Artifact、错误、耗时和版本信息，用于故障分析与分享。
它不是可重跑的 Case Definition，也不包含凭据、私有 Checkpoint、Provider 原始响应或未公开 Agent 内部事件。
_Avoid_: 完整案例管理、自动断言、业务数据库导出

**正式公开契约边界**:
模块之间允许进入平台事件和诊断历史的类型化、可序列化输入输出边界。
完整诊断只覆盖该边界，不覆盖系统提示词、Provider 原始请求响应、私有状态、局部变量或运行时实例。
_Avoid_: 将“完整诊断”解释为进程内所有数据

**Conversation Surface**:
Workbench 中承载用户消息、公开工具活动、已验证 Markdown 和会话内 Business Surface 的交互区域。
它不拥有 Business Agent 业务状态，也不生成 PresentationResult。
_Avoid_: Business Agent、Presentation Pipeline

**Business Surface**:
由 Frontend Runtime 根据已验证 A2UI 渲染的可视化业务结果和可操作区域。
它产生的 Action 必须继续经 Agent Runtime Host 校验。
_Avoid_: 任意前端代码、绕过 Runtime Host 的工具调用

**AgentContent**:
Business Agent 最终提交给 Presentation Pipeline 的 Markdown 或 JSON 结构化业务内容。
过程消息、工具调用、进度和状态事件不属于 AgentContent，直接通过 AG-UI 传递。
_Avoid_: UI Plan Candidate、A2UI、全部 Agent 事件流

**Presentation Request**:
提交给 Presentation Pipeline 的 AgentContent、Catalog 引用和可选展示上下文。
_Avoid_: Business Agent Request、A2UI

**Presentation Pipeline**:
同时负责 Markdown 和 Generative UI 两条最终展示路径。
Markdown AgentContent 直接形成 Markdown PresentationResult；结构化 AgentContent 才可能进入 Presentation Router、Presentation Model 和 UI Compiler Core。
_Avoid_: 处理所有过程事件、改写 Business Agent Markdown

**Presentation Router**:
在 UI Compiler Core 之前决定 Markdown 或 generative UI 的 Pipeline 内部模块。
_Avoid_: Business Agent Router、UI Compiler Core

**Model Adapter**:
Presentation Pipeline 中供 Presentation Router 调用的模型供应商适配实现。
它用于生成不可信的 PresentationDecision Candidate；仅 generative-ui 分支包含 UI Plan Candidate，不用于 Business Agent 业务推理。
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
_Avoid_: AG-UI、Presentation Request、UI Plan Candidate、UI IR

**Component Catalog**:
声明 Compiler 可选择的组件类型、语义、Schema、约束和版本。
_Avoid_: Component Registry、组件实现

**Frontend Runtime**:
消费 PresentationResult，并通过 Markdown Renderer、A2UI Renderer 和 Component Registry 转换为真实界面。
_Avoid_: Agent Runtime Host、Presentation Pipeline

**Component Registry**:
Frontend Runtime 中从组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog

**Workbench Runtime 查询契约**:
由 Agent Runtime Host 提供的 Catalog、场景、设置、健康检查、Debug Conversation、Turn Details 和 Artifact 查询接口。
这些普通 REST 接口不构成第二套 Agent 交互协议。
_Avoid_: 前端读取内部 Package、用 REST 重建自定义 Agent 协议

**确认型 Action**:
带有 Runtime Contract 风险元数据且必须在用户批准后才允许 Runtime Host 恢复业务流程的 Action。
Workbench 展示确认信息并回传批准或取消，低风险前端 Action 不属于此类。
_Avoid_: 所有 Action 一律确认、浏览器自行判断业务风险

**自然语言确认**:
用户以“同意”“取消”等普通文本继续当前 Business Agent 会话的对话式确认方式。
它允许 Business Agent 依据会话上下文解释意图，但不替代必须由 Runtime Host 校验的确认型 Action。
_Avoid_: 将所有高风险审批降格为文本、无上下文的确认文本

**连续参考链路**:
用于端到端验证的固定业务流程：设备查询、巡防方案比较、地图协同、任务确认、Action 回传与结果展示。
它使用进程内测试替身或 Reference Business Agent 验证平台行为，不连接真实设备控制。
_Avoid_: 孤立组件演示、真实设备调度

**Catalog 受控预览**:
使用 Catalog 或场景包登记的示例数据，通过同一 Component Registry 渲染实际组件的只读预览。
它不接受任意 Props，不动态加载任意组件。
_Avoid_: 自由 Props 编辑器、动态模块执行

**进程内测试替身**:
由测试代码直接构造或注入的固定契约对象和内存 Stub。
它只用于确定性验证，不作为 Workbench、Runtime Host 或模型供应商的可运行部署模式。
_Avoid_: Fixture 服务、默认离线运行模式

**开发模型联调**:
开发人员在本地 Workbench 环境中调用真实 Business Model 和 Presentation Model 的验证活动。
它不属于 CI、合并门槛或独立 Smoke Test。
_Avoid_: Provider 可用性门禁、自动化模型验收

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
