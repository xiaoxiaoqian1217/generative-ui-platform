# ADR-0023：采用受控 CopilotKit 会话 UI 与平台调试会话历史

- **状态：** 部分被 ADR-0024 取代
- **日期：** 2026-08-04

## 背景

ADR-0020 已决定 Workbench 通过 CopilotKit Headless 连接 Agent Runtime Host，并继续从 Runtime Contract 获取平台只读数据。
现有 Workbench 自行实现单轮输入、运行状态和展示区域，尚未使用 CopilotKit Vue 会话 UI，也不支持长期调试会话的切换和恢复。
Workbench 如果只替换输入框和消息样式，而把 A2UI 固定放在独立结果区域，就无法验证 CopilotKit 会话体验与平台受控 A2UI Renderer 的真实组合。
Workbench 如果只把历史保存在浏览器中，浏览器消息、Runtime Run 和 Business Agent checkpoint 会形成相互独立且不可校验的状态源。
CopilotKit 托管线程能力还会引入额外的平台服务、许可和同步契约，并使调试历史的数据所有权离开 Agent Runtime Host。

## 决策

Workbench 使用 `@copilotkit/vue` 的受控 `CopilotChatView` 和会话原子组件构建 Conversation Surface。
Workbench 继续作为前端会话状态的所有者，并显式提供消息、运行状态和提交处理器。
Workbench 不使用自动拥有 Agent、线程和消息状态的高级 `CopilotChat` 作为主集成边界。
现有 CopilotKit Headless Client 继续通过 Agent Runtime Host 运行同一个 RunOrchestrator。

Workbench 按会话轮次保存用户消息与已验证的 `PresentationResult`。
Markdown 结果使用 CopilotKit 助手消息组件显示。
A2UI 结果通过 `CopilotChatView` 的消息视图插槽，在对应助手区域内使用现有受控 A2UI Renderer 显示。
A2UI 不转换为 CopilotKit Tool，不进入 Business Agent 输出，也不绕过 UI Compiler Core、Component Catalog 或 Runtime Action Contract。
Workbench 不为只有 A2UI 的结果生成助手文本、状态消息或展示占位内容。

历史 A2UI 保留在原会话轮次中，但只有 Active Business Surface 可以产生 Action。
新的 `PresentationResult` 取代旧结果后，旧 Surface 变为 Historical Business Surface 并保持只读。
Action Resume 更新原来的会话轮次，不在会话末尾复制新的可操作 Surface。
同一会话同一时间只允许一个活动 Run 或 Action。
运行期间只显示运行状态与停止控制，不模拟尚未验证的内容流式输出。
失败和取消显示为对应轮次的 Workbench 状态，而不是 Assistant Message。

持久调试会话由平台自己的 Runtime Thread Contract 管理。
Runtime Host 是用户可见会话轮次、已验证 `PresentationResult`、Surface 生命周期和安全关联元数据的权威所有者。
Business Agent 是 LangGraph 工作流状态、工具状态、暂停点和恢复点的权威所有者。
Runtime Host 的 Thread Repository 与 Business Agent 的 Business State Checkpoint Store 使用同一个 `threadId` 关联，但不共享数据所有权。

开发环境为 Thread Repository 和 Business State Checkpoint Store 分别提供 SQLite 持久化实现。
Runtime Host 保存带契约、Catalog 和 Compiler 身份的已验证 Presentation Snapshot。
加载历史时原样只读回放 Presentation Snapshot，不重新调用 Presentation Pipeline、模型或 UI Compiler Core。
当前 Workbench 只在支持快照契约版本和 Catalog 身份时回放历史 A2UI。
不兼容的 Presentation Snapshot 只显示受限诊断和显式展开的只读原始数据，不自动迁移、重新编译或部分渲染。
平台不依赖 CopilotKit 托管 `useThreads` 作为线程权威来源。
Workbench 通过 Runtime Thread Contract 实现会话列表、创建、切换、重命名、归档和删除。

调试历史默认保留三十天，并对线程、消息和 Presentation Snapshot 设置资源上限。
Workbench 支持删除单个线程和清空全部调试历史。
删除操作必须协调 Runtime Host Thread Repository 与 Business Agent Checkpoint Store，并显式报告部分失败。
Provider 原始响应、模型密钥、未验证 UI Plan、UI IR 和未清理业务数据不得进入调试历史。

## 考虑的方案

### 仅使用自定义 Workbench 会话 UI

该方案不引入 CopilotKit Vue UI，但会继续维护聊天布局、消息组件、输入控制和滚动等通用基础设施。
该方案无法满足验证 CopilotKit 会话 UI 集成的目标。

### 使用高级 CopilotChat 管理 Agent 和消息

该方案集成较少，但会与现有 Headless Client、Runtime Contract、A2UI Action 和诊断状态形成双重状态所有权。
因此不采用该方案。

### A2UI 仅在独立结果面板显示

该方案足以验证 Renderer，但不能验证 A2UI 在真实会话轮次中的展示和生命周期。
因此 A2UI 的权威交互副本内嵌在助手区域，诊断区只提供只读信息。

### 只由 Business Agent 保存全部历史

Business Agent 无法保存其输出经过 Presentation Pipeline 后才产生的可信 Markdown、A2UI 和展示诊断信息，也不得理解组件或 A2UI。
因此 Business Agent 只保存业务工作流状态。

### 使用浏览器存储或 CopilotKit 托管线程

浏览器存储无法与服务端 checkpoint 建立可靠一致性，也不适合作为敏感调试历史的权威来源。
CopilotKit 托管线程会引入平台外的数据所有权、许可和同步依赖。
因此线程权威来源保持在 Agent Runtime Host。

## 后果

- Workbench 获得 CopilotKit 会话体验，同时保留平台 A2UI Renderer 和 Action 安全边界。
- Runtime Host 需要新增稳定、Schema 校验的 Thread Contract 和可替换 Thread Repository。
- Business Agent 需要把当前内存 Checkpoint Store 替换为可持久化实现，并提供受控的 checkpoint 删除能力。
- 会话历史包含用户消息和已验证 Presentation Snapshot，必须建立独立的数据分类、保留、删除、资源限制和泄漏回归测试。
- Runtime Host 历史与 Business Agent checkpoint 无法组成单一数据库事务，因此创建、运行、删除和部分失败必须具有显式状态和可恢复语义。
- 持久会话与切换应作为独立 Goal 实现，不得无意扩大当前 Workbench UI 改造的交付范围。

## 与既有决策的关系

本 ADR 扩展 ADR-0020，但不取代 CopilotKit Headless、Workbench 只连接 Agent Runtime Host、以及只读 Runtime Contract 的既有决定。
本 ADR 不改变 ADR-0019 对 Presentation Pipeline 和 UI Compiler Core 的职责划分。
本 ADR 将长期调试会话引入未来独立 Goal，当前 Goal 的非目标在该 Goal 获批前继续有效。

ADR-0024 保留本 ADR 关于受控 CopilotKit UI、Runtime Host 的 Thread/Presentation/Surface 所有权、Business Agent Checkpoint 所有权、Historical Surface 只读回放和 shared `threadId` 的核心决定。
ADR-0024 取代并细化本 ADR 中把一次交互主要表达为 Run、把 Surface 生命周期依附于 Run、以及由旧 Turn/Run 状态承载完整运行事实的语义。
迁移后应使用 Thread、Turn、Operation、Surface 和 Command Admission 作为 Runtime Host 的交互事实模型。