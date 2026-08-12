# Generative UI Platform

本上下文定义仓库级平台、Compiler 子系统、Runtime Truth、Agent 交互协议和开发诊断能力的统一领域语言。

## Language

**Generative UI Platform**:
仓库级和长期平台边界。
覆盖 Agent 接入、Agent Runtime Host、Generative UI Compiler、Frontend Runtime、Runtime Truth 和开发诊断能力。
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
正式模式只连接 Agent Runtime Host，通过 AG-UI 参与 Agent 交互，渲染 Markdown 和 A2UI，并查看 Runtime Snapshot、Debug Conversation 与逐 Turn/Operation 诊断。
显式开发配置可以直接连接 AGUIMock，以验证无业务副作用的浏览器本地 Frontend Tool。
_Avoid_: Business Agent、Presentation Pipeline、Runtime Truth 所有者

**AGUIMock**:
可复用的确定性 AG-UI 协议测试替身。
它为本地开发、自动化测试和演示产生标准 AG-UI 事件，但不拥有 Runtime Truth，也不执行真实业务副作用。
_Avoid_: Runtime Host 替代品、Business Agent 私有协议、生产连接目标

**AG-UI Agent 交互协议**:
Workbench 与 Agent Runtime Host 之间唯一的 Agent 交互应用协议。
当前参考实现使用 CopilotKit Runtime 的 HTTP POST + SSE 路径；HTTP、SSE 和 WebSocket 是传输机制，不与 AG-UI 作为同一层级的协议并列。
_Avoid_: 将 AG-UI、HTTP、SSE、WebSocket 并列为四种业务协议

**CopilotKit Runtime 集成**:
CopilotKit Runtime 嵌入 Agent Runtime Host，作为 AG-UI 入口和运行时库。
CopilotKit 是 Adapter / Infrastructure，不拥有 Runtime Thread、Operation、Surface、Command 幂等或 Presentation 决策。
_Avoid_: 独立 CopilotKit Runtime 服务、Runtime Truth 所有者、前端直连 Business Agent

**PlatformRunService**:
Agent Runtime Host 中面向 Transport Adapter 的统一应用级入口。
它将 Run、Action、Resume 和 Reconcile 请求交给 Runtime Kernel，不维护并列状态机。
_Avoid_: 按 HTTP、WebSocket 或 AG-UI 分别实现独立编排、第二套 Runtime Domain

**Runtime Kernel**:
Agent Runtime Host 内部管理 Runtime Truth Model、Operation 生命周期、Surface 生命周期、Command Admission、幂等、并发和 Runtime Repository 事务边界的逻辑层。
它不是独立部署服务，也不自动要求新的 workspace package。
_Avoid_: Interaction Gateway、CopilotKit Runtime、独立微服务

**Runtime Truth Model**:
Agent Runtime Host 对用户可见交互事实的权威模型。
当前包含 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot。
_Avoid_: Business Agent 私有 State、Diagnostic Event Replay、浏览器消息缓存

**Runtime Repository**:
持久化 Runtime Truth 的权威存储边界。
它必须支持 Runtime Host 重启后的 Thread、Turn、Operation、Command 和 Surface 恢复，以及 Command Admission 所需的原子更新。
_Avoid_: Diagnostic Store 别名、Business Agent Checkpoint Store、浏览器存储

**Runtime Thread**:
Runtime Host 管理的用户可见会话容器。
它与 Business Agent Checkpoint 通过 shared threadId 关联，但不复制 Business Agent 私有状态。
_Avoid_: CopilotKit 托管线程、Business Agent Checkpoint

**Turn**:
用户可见会话中的稳定位置。
一个 Turn 可以关联多个 Operation；Turn 不再等价于唯一 Run 或一次 Action Resume。
_Avoid_: Operation、Business Agent Run、完整执行状态机

**Operation**:
Runtime Host 正式接受并执行一次工作的最小权威单位。
Operation 具有 operationId、kind、phase、outcome 和必要关联标识；`agentRunId` 只是可选外部执行关联标识。
_Avoid_: Turn、Diagnostic Event、浏览器 requestId

**Operation Phase**:
描述 Operation 当前执行到哪里，例如 accepted、validating、running-agent、presenting、finished。
它与最终 Outcome 正交。
_Avoid_: 用 completed/failed 同时表示阶段和结果

**Operation Outcome**:
描述 Runtime Host 最终知道的执行结果。
至少包含 completed、failed、cancelled、rejected 和 indeterminate。
_Avoid_: Presentation fallback、history-write-failed、Renderer 状态

**Indeterminate Outcome**:
Runtime Host 无法证明业务副作用是否已发生时的正式 Operation Outcome。
必须通过 Reconcile、业务幂等键或 Business Agent 恢复能力关闭，不得简单重试并假设此前失败。
_Avoid_: 普通 failed、自动 retry 信号

**Command**:
Frontend Runtime 向 Runtime Host 提出的受控交互请求。
推荐包含 commandId、surfaceId、actionId、expectedRevision 和 input；客户端不提供权威 Run 上下文。
_Avoid_: 浏览器指定内部 runId、直接 Business Agent Tool Call

**Command Admission**:
Runtime Host 决定一个 Command 是否被正式接受并创建 Operation 的权威过程。
它包含幂等检查、Surface 状态与 revision 校验、并发控制、CAS 和 Runtime Repository 原子提交。
_Avoid_: Business Agent 执行成功、前端按钮 disable、分布式 Exactly Once

**Effectively-once Command Admission**:
平台对 Command 接纳的目标保证：at-least-once transport + idempotent persistence + exactly-one command admission。
它不承诺整个分布式业务链路 Exactly Once。
_Avoid_: 所有外部副作用 Exactly Once

**Surface**:
Runtime Domain 的权威交互对象。
Surface 关联 threadId、turnId、presentationId、revision、Presentation Role、Interaction State 和可信 Presentation Snapshot。
A2UI 或 Markdown 是展示 Payload，不是 Surface 生命周期本身。
_Avoid_: 单纯 A2UI JSON、Vue 组件实例、浏览器 DOM

**Surface Interaction State**:
描述 Surface 是否还能接受 Command。
至少包含 actionable、claimed、consumed 和 disabled。
_Avoid_: Presentation Role、业务 Operation Outcome

**Presentation Role**:
描述一个 Presentation/Surface 是 current 还是 historical。
它与 Surface Interaction State 分离。
_Avoid_: current 等价 actionable、historical 等价 failed

**Presentation Snapshot**:
Runtime Host 保存的、已通过当前可信链路验证并带有契约/Catalog/Compiler 身份的展示快照。
历史加载默认只读回放，不重新调用模型、Presentation Pipeline 或 UI Compiler Core。
_Avoid_: 未验证 UI Plan、重新编译历史、Diagnostic Artifact 的权威副本

**Business Agent 公开事件流**:
Business Agent 主动发布给平台的业务事件集合，可以包含消息、活动、进度、状态、后端工具调用与公开结果、Interrupt、确认、业务 Artifact 和最终 AgentContent。
Business Agent 对公开内容和可见范围负责。
_Avoid_: Business Agent 只能返回最终 Markdown 或 JSON

**Business Agent Adapter**:
Agent Runtime Host 中隔离平台契约与具体 Business Agent 协议的适配层。
它只执行契约校验、关联标识补充、事件映射和非法事件拒绝，不总结、改写或重新解释业务内容。
_Avoid_: Model Adapter、业务内容加工器、Runtime Repository、诊断存储器

**Reference Business Agent**:
用于全链路验证的参考业务 Agent，优先采用 TypeScript LangGraph。
它可以流式发布公开业务事件，并以 Markdown 或结构化数据作为最终 AgentContent。
_Avoid_: UI Compiler Agent、A2UI Agent

**Agent Runtime Host**:
平台前端统一入口、CopilotKit Runtime 宿主和 Runtime 交互事实权威。
它组装 Runtime Kernel、Business Agent Adapter、Presentation Pipeline、Runtime Repository 和诊断投影。
_Avoid_: Business Agent 私有状态所有者、UI Compiler Core、Frontend Runtime

**PlatformRuntimeEvent**:
Runtime Host 对已经提交或进入公开边界的运行事实进行类型化投影的统一事件表达。
事件使用 operationId 作为一等关联标识，并可附带 eventId、sequence、threadId、turnId、agentRunId、surfaceId、actionId 和 toolCallId。
_Avoid_: Runtime Repository 本身、为实时流和历史分别生成互不关联的事件

**Diagnostic Event**:
持久化的规范化观察事件，记录事件顺序、阶段、状态、关联标识、摘要和 Artifact 引用。
它可以因为 best-effort 持久化而不完整，不是 Runtime 当前状态恢复的唯一权威来源。
_Avoid_: Runtime Truth、原始传输帧、第二套业务状态机

**Diagnostic Artifact**:
正式公开契约边界上的可序列化诊断输入、输出或结果对象，例如 Tool Result、AgentContent、Presentation Request、UI Plan Candidate、Validation Result、UI IR、A2UI 和 PresentationResult。
_Avoid_: Runtime Truth 的第二份权威副本、Provider 原始请求、私有 Checkpoint

**Diagnostic Recorder**:
订阅 Diagnostic Projection 并持久化 Diagnostic Event 和 Diagnostic Artifact 的逻辑应用模块。
MVP 位于 Agent Runtime Host 应用内部；诊断失败不得阻断主业务，也不得改变 Runtime Truth。
_Avoid_: Runtime Kernel、Runtime Repository、独立服务默认拆包

**TurnDetailsResponse**:
Workbench 打开某个 Turn 时，由 Runtime Host 根据 Runtime Snapshot、Diagnostic Event 和 Artifact Metadata 临时聚合出的 API 响应。
它用于展示状态、耗时、时间线、Operation、工具调用、错误和 Artifact 引用，不是数据库实体或第二份权威事实。
_Avoid_: 持久化 TurnTrace、Runtime Repository 的替代品

**Debug Conversation**:
由 Agent Runtime Host 管理、可在 Workbench 中切换和诊断的持久会话视图。
Runtime Repository 保存交互权威状态；Diagnostic Store 保存观察历史；Business Agent 私有工作流状态由独立 Checkpoint Store 持有。
_Avoid_: 浏览器聊天缓存、单纯 Diagnostic Event 集合、Business Agent checkpoint 副本

**Shared Thread Identity**:
Runtime Host Runtime Repository 与 Business Agent Checkpoint Store 共用的 threadId。
它只关联两个不同领域的权威数据源，不合并二者的数据所有权，也不要求分布式事务。
_Avoid_: 共享数据库、单一全局状态对象

**Diagnostic Bundle**:
由用户主动导出的 Conversation、Turn 或 Operation 诊断包，包含所选公开事件、Artifact、错误、耗时和版本信息，用于故障分析与分享。
它不是可重跑的 Case Definition，也不包含凭据、私有 Checkpoint、Provider 原始响应或未公开 Agent 内部事件。
_Avoid_: Runtime Repository 备份、完整案例管理、业务数据库导出

**正式公开契约边界**:
模块之间允许进入平台事件和诊断历史的类型化、可序列化输入输出边界。
完整诊断只覆盖该边界，不覆盖系统提示词、Provider 原始请求响应、私有状态、局部变量或运行时实例。
_Avoid_: 将“完整诊断”解释为进程内所有数据

**Conversation Surface**:
Workbench 中承载用户消息、公开工具活动、已验证 Markdown 和会话内 Surface 的交互区域。
它是 Runtime Truth 的前端投影，不拥有 Business Agent 或 Runtime Kernel 状态。
_Avoid_: Runtime Repository、Business Agent、Presentation Pipeline

**Business Surface**:
Frontend Runtime 根据已验证 A2UI 或其他受控 Presentation 渲染出的业务可视区域。
其可操作性由 Runtime Host 的 Surface Lifecycle 决定，Action 必须继续经 Runtime Host Command Admission。
_Avoid_: 任意前端代码、浏览器自主管理 actionability、绕过 Runtime Host 的工具调用

**AgentContent**:
Business Agent 最终提交给 Presentation Pipeline 的 Markdown 或 JSON 结构化业务内容。
过程消息、工具调用、进度和状态事件不属于 AgentContent，直接通过 AG-UI 投影传递。
_Avoid_: UI Plan Candidate、A2UI、全部 Agent 事件流

**Presentation Request**:
提交给 Presentation Pipeline 的 AgentContent、Catalog 引用和可选展示上下文。
_Avoid_: Business Agent Request、A2UI

**Presentation Pipeline**:
同时负责 Markdown 和 Generative UI 两条最终展示路径。
Markdown AgentContent 直接形成 Markdown PresentationResult；结构化 AgentContent 才可能进入 Presentation Router、Presentation Model 和 UI Compiler Core。
Presentation fallback 或失败只影响 Presentation Outcome，不覆盖 Operation Outcome。
_Avoid_: 处理所有过程事件、改写 Business Agent Markdown、Runtime 状态机

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
它是唯一可信 A2UI 生产者。
_Avoid_: Renderer、Business Agent、Gateway、Runtime Kernel

**UI IR**:
UI Compiler Core 校验并规范化后的可信框架无关中间表示。
_Avoid_: UI Plan Candidate、A2UI

**A2UI**:
Generative UI Compiler 当前默认输出的声明式 UI 协议。
它表达受控展示 Payload，不表达 Runtime Surface 的权威生命周期。
_Avoid_: AG-UI、Runtime Surface、Presentation Request、UI Plan Candidate、UI IR

**Component Catalog**:
声明 Compiler 可选择的组件类型、语义、Schema、约束和版本。
_Avoid_: Component Registry、组件实现

**Frontend Runtime**:
消费 Runtime Host 投影的 Presentation 和 Surface 状态，并通过 Markdown Renderer、A2UI Renderer 和 Component Registry 转换为真实界面。
_Avoid_: Agent Runtime Host、Presentation Pipeline、Runtime Truth 所有者

**Component Registry**:
Frontend Runtime 中从组件类型映射到真实组件实现的能力。
_Avoid_: Component Catalog

**Workbench Runtime 查询契约**:
由 Agent Runtime Host 提供的 Catalog、场景、设置、健康检查、Runtime Snapshot、Debug Conversation、Turn Details 和 Artifact 查询接口。
这些普通 REST 接口不构成第二套 Agent 交互协议。
_Avoid_: 前端读取内部 Package、用 REST 重建自定义 Agent 协议

**确认型 Action**:
带有 Runtime Contract 风险元数据且必须在用户批准后才允许 Runtime Host 接纳对应 Command 的 Action。
Workbench 展示确认信息并回传批准或取消，最终是否接纳仍由 Runtime Host 决定。
_Avoid_: 所有 Action 一律确认、浏览器自行判断业务风险

**自然语言确认**:
用户以“同意”“取消”等普通文本继续当前 Business Agent 会话的对话式确认方式。
它允许 Business Agent 依据会话上下文解释意图，但不替代必须由 Runtime Host 校验的确认型 Action。
_Avoid_: 将所有高风险审批降格为文本、无上下文的确认文本

**连续参考链路**:
用于端到端验证的固定业务流程：设备查询、巡防方案比较、地图协同、任务确认、Command 回传与结果展示。
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
_Avoid_: Agent Runtime Host、当前 Goal、Runtime Kernel

**Compiler MVP 文档基线**:
原 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和设计文档定义的 Compiler 子系统规范。
这些文档继续保留，但不再代表整个仓库范围。
_Avoid_: 仓库级平台规范

**平台级规范**:
`docs/platform/` 中描述跨子系统范围、Runtime Truth、架构和开发环境的文档。
_Avoid_: Compiler 内部详细设计

**Architecture Conflict Gate**:
任何后续文档、Goal、Issue、PR 或实现与当前有效 ADR、平台需求或平台架构发生实质冲突时，必须先报告冲突并获得用户/架构决策者确认后才能改变架构语义。
_Avoid_: 静默覆盖、以实现事实反向修改架构、一次确认外推全部冲突
