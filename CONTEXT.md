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

**Workbench 开发验证产品化**:
以 Generative UI Workbench 为对象的下一阶段建设。
它把开发验证环境完善为可独立部署、可诊断、可回放和可验收的产品，而非正式业务运营前端。
_Avoid_: 正式指挥系统、生产业务前端

**验收案例**:
描述一个场景、用户输入、期望语义结果和一次实际运行结果的可重放验证单元。
它用于验证平台链路，而不是保存任意用户会话。
_Avoid_: 聊天记录、端到端脚本

**语义断言**:
针对展示模式、关键组件、受控 Action、错误阶段、稳定错误码或降级原因的验收预期。
它不比较 A2UI 原始结构、页面文案或截图。
_Avoid_: 快照断言、字节级比较

**本地案例库**:
由代码随版本发布的内置验收案例与浏览器本地保存的用户案例组成的案例集合。
它可通过 JSON 导入导出交换案例，但不提供服务端共享或协作存储。
_Avoid_: 生产数据库、共享案例中心

**内置验收矩阵**:
随 Workbench 版本发布、用于覆盖成功、交互、校验失败和安全降级路径的一组最低验收案例。
当前最低矩阵包含十个 SRS 指定案例，后端工具失败作为额外案例。
_Avoid_: 任意快捷输入、非确定性演示

**Workbench 公开视图**:
由 Agent Runtime Host 向浏览器提供的只读、脱敏的 Catalog、场景、运行配置或诊断数据。
它不暴露内部包、Business Agent 私有协议、模型供应商配置或密钥。
_Avoid_: 前端直连服务、内部状态转储

**本地调试可见性**:
在本地调试模式下，参考场景的用户输入和业务结果可完整显示以支持问题定位。
密钥、令牌、设备凭证和 Provider 原始响应永不传送至浏览器。
_Avoid_: 无边界原始响应查看、生产审计日志

**Workbench 工作区路由**:
将 Playground、Inspect、Cases、Catalog、Scenarios 和 Settings 划分为独立稳定 URL 的导航结构。
Playground 是默认入口，Cases 是验收案例运行与比较的中心。
_Avoid_: 单页堆叠面板、无状态临时页面

**连续参考链路**:
用于端到端验收的固定业务流程：设备查询、巡防方案比较、地图协同、任务确认、Action 回传与结果展示。
它使用进程内测试替身或 Reference Business Agent 验证平台行为，不连接真实设备控制。
_Avoid_: 孤立组件演示、真实设备调度

**Catalog 受控预览**:
使用 Catalog 或场景包登记的示例数据，通过同一 Component Registry 渲染实际组件的只读预览。
它不接受任意 Props，不动态加载任意组件。
_Avoid_: 自由 Props 编辑器、动态模块执行

**Workbench Runtime 查询契约**:
由 Agent Runtime Host 提供的、经过 Schema 校验的 Catalog 摘要和已加载场景元数据只读接口。
它是 Workbench 获取运行时查询数据的唯一后端边界。
_Avoid_: 前端读取内部 Package、私有服务直连

**CopilotKit Headless 集成**:
Workbench 通过 Runtime Host 的 CopilotKit Headless 端点接入 Agent Runtime 的前端集成方式。
它与 HTTP 和 WebSocket 共用 RunOrchestrator，不绕过 Presentation Pipeline。
_Avoid_: 前端直连 Business Agent、独立展示编译客户端

**Runtime 传输适配入口**:
HTTP、WebSocket 和 CopilotKit Headless 将各自传输协议映射为同一 Runtime Contract 的薄入口。
它们共用 RunOrchestrator 与 Action 编排，不包含独立业务、展示编译或状态逻辑。
_Avoid_: 每种传输各自编排、协议专属业务链路

**WebSocket Business Agent Adapter**:
将 Runtime Contract 的 Run 和 Resume Action 请求映射为公司 Business Agent WebSocket 协议的 Runtime Host 适配层。
它与非流式 HTTP Adapter 一同属于当前 Goal 的 Business Agent 传输实现范围。
_Avoid_: Workbench 直连 Business Agent、RunOrchestrator 感知私有协议

**HTTP + SSE Business Agent Adapter**:
将 Runtime Contract 的 Run 和 Resume Action 请求映射为 HTTP 请求和 SSE 事件流响应的 Runtime Host 适配层。
它与 WebSocket Adapter 一同属于当前 Goal 的 Business Agent 传输实现范围，并支持一次请求中的离散完整业务事件。
_Avoid_: 普通 HTTP 轮询、将 SSE 误解为仅 token 流式、RunOrchestrator 感知 Agent 事件协议

**进程内测试替身**:
由测试代码直接构造或注入的固定契约对象和内存 Stub。
它只用于确定性验证，不作为 Workbench、Runtime Host 或模型供应商的可运行部署模式。
_Avoid_: Fixture Provider、Fixture 服务、默认离线运行模式

**开发模型联调**:
开发人员在本地 Workbench 环境中调用真实 Business Model 和 Presentation Model 的验证活动。
它不属于 CI、合并门槛或独立 Smoke Test。
_Avoid_: Provider 可用性门禁、自动化模型验收

**双模型开发联调**:
开发环境中由 Business Agent 私有调用的真实 Business Model 与由 Presentation Pipeline 私有调用的真实 Presentation Model 的组合验证。
前者只输出业务内容，后者只输出不可信展示决策候选。
_Avoid_: 浏览器直连模型、一个模型兼任业务与展示边界

**确认型 Action**:
带有 Runtime Contract 风险元数据且必须在用户批准后才允许 Runtime Host 恢复业务流程的 Action。
Workbench 展示确认信息并回传批准或取消，低风险前端 Action 不属于此类。
_Avoid_: 所有 Action 一律确认、浏览器自行判断业务风险

**自然语言确认**:
用户以“同意”“取消”等普通文本继续当前 Business Agent 会话的对话式确认方式。
它允许 Business Agent 依据会话上下文解释意图，但不替代必须由 Runtime Host 校验的确认型 Action。
_Avoid_: 将所有高风险审批降格为文本、无上下文的确认文本

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

**Conversation Surface**:
Workbench 中承载用户消息、已验证 Markdown 和会话内 Business Surface 的交互区域。
它不拥有 Business Agent 业务状态，也不生成 PresentationResult。
_Avoid_: Business Agent、Presentation Pipeline

**Business Surface**:
由 Frontend Runtime 根据已验证 A2UI 渲染的可视化业务结果和可操作区域。
它产生的 Action 必须继续经 Agent Runtime Host 校验。
_Avoid_: CopilotKit Tool、任意前端代码

**Debug Conversation**:
由 Agent Runtime Host 管理、可在 Workbench 中切换和诊断的用户可见会话记录。
Business Agent 的工作流状态由独立 Checkpoint Store 持有，两者通过同一个 threadId 关联。
_Avoid_: 浏览器聊天缓存、Business Agent checkpoint

**Presentation Snapshot**:
为调试复现保存的已验证 PresentationResult 及其版本和安全关联信息。
历史加载只读回放该快照，不重新调用模型或 UI Compiler Core。
_Avoid_: 结果缓存、重新生成的历史界面

**Shared Thread Identity**:
Runtime Host 的 Debug Conversation 与 Business Agent checkpoint 共用的 threadId。
它只关联两个权威数据源，不合并二者的数据所有权。
_Avoid_: 共享数据库、分布式事务
