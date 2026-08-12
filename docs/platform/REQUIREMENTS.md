# Generative UI Platform 平台级需求

**适用范围：** 整个仓库。

**文档关系：** 本文定义平台级范围，不替代或删除现有 Compiler MVP 文档。
`docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 继续作为 Generative UI Compiler 子系统基线。
Runtime 状态所有权和安全 Action 语义以 ADR-0024 为准。

## 1. 建设背景

仓库当前已不再只验证 UI Compiler Core 和独立 UI Compiler Service 的历史 MVP。
Agent Runtime Host 和 Generative UI Workbench 已进入仓库，当前阶段需要验证 Business Agent 公开事件流、AG-UI 交互、嵌入式 Presentation Pipeline、浏览器 A2UI 渲染、Action 回传、跨重启 Runtime 状态和诊断历史的完整链路。

平台必须解决的不只是“把 Agent 结果显示出来”，还包括：

- 谁拥有业务事实；
- 谁拥有交互事实；
- Action 是否被正式接受过；
- 超时后业务副作用是否确定；
- Surface 是否仍允许操作；
- 诊断持久化失败是否会污染业务状态；
- 断线和重启后如何恢复当前真相。

## 2. 平台定位

Generative UI Platform 是面向 Agent 应用的生成式 UI 编译与受控交互运行基础设施。
平台承载 Business Agent 主动公开的过程事件，并把最终 Markdown 或结构化业务内容转换为受 Schema、Policy 和 Component Catalog 约束的展示结果。
平台不是任意前端代码生成器，也不要求 Business Agent 理解 A2UI 或前端组件。

平台遵循三类事实所有权：

1. Business Agent 是业务状态和业务副作用语义的权威；
2. Agent Runtime Host 是 Thread、Turn、Operation、Command 和 Surface 交互事实的权威；
3. AG-UI、A2UI、Markdown 和 Diagnostics 都是事实投影，不得反向成为唯一状态源。

## 3. 当前阶段目标

当前平台开发验证阶段必须支持：

- 正式模式下 Web 只连接 Agent Runtime Host；
- 开发、自动化测试和演示环境可以通过显式配置让 Workbench 直接连接 AGUIMock，以验证无业务副作用的浏览器本地 Frontend Tool；
- Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 交互应用协议；
- 当前参考实现使用 CopilotKit Runtime 的 HTTP POST + SSE 路径；
- CopilotKit Runtime 嵌入 Runtime Host，不作为并列 Runtime 独立部署；
- Runtime Host 内建立逻辑 Runtime Kernel，不新增独立服务；
- Runtime Host 持久化 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot；
- Turn 与 Operation 分离，一个 Turn 可以关联多个 Operation；
- Operation Phase 与 Outcome 分离；
- Operation Outcome 支持 `indeterminate`；
- Presentation、History Persistence 和 Surface Interaction 使用独立状态维度；
- Runtime Host 通过可替换 Adapter 调用协议无关的 Business Agent；
- Business Agent 可以流式发布公开消息、活动、进度、工具调用、状态、Interrupt 和最终 AgentContent；
- Business Agent Adapter 只做契约校验、关联标识补充和事件映射，不改写业务内容；
- 过程事件通过 AG-UI 直接进入 Workbench，不进入 Presentation Pipeline；
- 最终 AgentContent 进入 Presentation Pipeline；
- Markdown AgentContent 直接形成 Markdown PresentationResult，不调用 Presentation Model 和 UI Compiler Core；
- 结构化 AgentContent 才进入 Generative UI 编译链路；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- Frontend Runtime 渲染 Markdown 和 A2UI；
- 用户 Action 以 Command 形式提交，经 Runtime Host 安全接纳后回传或恢复 Business Agent；
- 同一 Command 或同一 Surface Revision 不得因为双击、重发或重连产生多个被正式接受的 Operation；
- Runtime Host 内部使用统一 PlatformRuntimeEvent，同时投影到 AG-UI 实时流和诊断持久化；
- Runtime 状态恢复以 Runtime Repository 为权威，Diagnostic Event Replay 仅作为时间线优化；
- Debug Conversation、Runtime Repository 和 Diagnostic Store 支持跨刷新和跨 Runtime Host 重启；
- 单元、集成和浏览器测试在进程内使用确定性替身，不需要模型密钥；
- 开发环境支持统一启动、构建、验证和诊断。

## 4. 当前允许建设

- TypeScript LangGraph Reference Business Agent；
- Business Agent Contract 与 Adapter；
- PlatformRunService；
- Runtime Kernel 应用内逻辑层；
- Runtime Repository 接口和 SQLite 开发实现；
- Thread / Turn / Operation / Command / Surface Contract；
- Action Command Admission、CAS、幂等和 Reconcile；
- 嵌入 Agent Runtime Host 的 CopilotKit Runtime；
- AG-UI 标准事件和平台扩展事件映射；
- Presentation Pipeline Package；
- Presentation Model Adapter 多供应商验证；
- Generative UI Workbench；
- Markdown Renderer 和 Vue A2UI Renderer；
- Component Registry 和 Frontend Action Registry；
- Debug Conversation、Runtime Snapshot 和逐 Turn Inspect；
- Diagnostic Recorder 应用内模块；
- Diagnostic Event、Diagnostic Artifact、TurnDetailsResponse；
- SQLite 诊断数据与中小 Artifact 存储；
- 大型 Artifact 的文件或对象存储适配；
- Diagnostic Bundle Export；
- Playwright 全链路 E2E；
- 平台级诊断和一键开发环境。

## 5. 当前非目标

- Interaction Gateway；
- 多 Business Agent 自动路由；
- 多 Agent 自主协同；
- 真实设备控制；
- 生产级多租户、细粒度权限、审计和计费；
- 保存 Business Agent 私有 State、Checkpoint 或完整内部推理轨迹；
- 暴露模型 Provider 原始请求、响应或系统提示词；
- 完整 Case Definition、导入、重跑、语义断言和回归测试管理平台；
- 将 Runtime Kernel 自动拆成独立 workspace package 或服务；
- 将 Diagnostic Recorder 立即拆成独立服务或 workspace package；
- 为 HTTP、WebSocket 和 AG-UI 分别维护独立 Agent 业务协议或状态机；
- 分布式 Exactly Once；
- 任意 HTML、JavaScript、Vue 或 React 代码生成；
- 完整 A2UI 全规范或 A2UI v1 迁移；
- Markdown 自动增强为 Generative UI；
- 正式业务产品前端。

## 6. 强制边界

### 6.1 Web

正式模式只允许 `Web -> Agent Runtime Host`。
Web 不得直接调用 Business Agent、Presentation Pipeline、UI Compiler Core 或模型供应商。

Workbench 的 Agent 交互必须使用 AG-UI。
显式开发配置可以增加 `Web -> AGUIMock`，但 AGUIMock 只允许产生确定性的 AG-UI 事件并调用无业务副作用的浏览器本地 Frontend Tool。
该路径不得拥有 Runtime Truth、执行 Command 或真实业务副作用，也不得配置到生产环境。
普通 REST 只用于 Catalog、Scenarios、Settings、Health、Runtime Snapshot、Debug Conversation、Turn Details、Artifact 查询和 Diagnostic Bundle 等非 Agent 交互能力。
业务设备实时 WebSocket 可以独立存在，但不得与 Agent 交互协议混合。

### 6.2 Runtime Host

Runtime Host 必须是平台交互事实权威。
至少保存：

- Runtime Thread；
- Turn；
- Operation；
- Command Admission / Idempotency Record；
- Surface Lifecycle；
- 已验证 Presentation Snapshot；
- 恢复所需的安全关联元数据。

Runtime Host 不得把 CopilotKit 内部状态、浏览器消息状态或 Diagnostic Event 当作这些事实的唯一来源。

### 6.3 Turn 与 Operation

Turn 表示用户可见会话位置。
Operation 表示系统正式接受并执行一次工作。

一个 Turn 可以有多个 Operation。
Turn 不得继续作为唯一 Run、Action Resume 和执行结果状态机。

Operation 必须区分：

- `phase`：执行到哪里；
- `outcome`：最终知道什么。

Operation Outcome 至少支持：

```text
completed
failed
cancelled
rejected
indeterminate
```

当业务副作用是否已发生无法确定时，必须使用 `indeterminate`，不得简单映射为 `failed`。

### 6.4 正交状态

以下事实必须独立表达：

- Operation Outcome；
- Presentation Outcome；
- History Persistence Status；
- Surface Interaction State；
- Presentation Role。

`history-write-failed` 不得作为业务 Turn 执行状态。
Presentation fallback 不得覆盖已经确定的业务 Operation Outcome。

### 6.5 Surface

Runtime Host 必须拥有 Surface 生命周期。
Surface 至少具有：

- `surfaceId`；
- `threadId`；
- `turnId`；
- `presentationId`；
- `revision`；
- `presentationRole`；
- `interactionState`。

Historical Presentation 可以继续展示；平台不得把“historical”解释为禁止展开、复制、查看详情等纯本地 UI 行为。
Historical Surface 不得携带可直接重放的旧 Action Authority：只有 `current + actionable` 的 Surface 才能通过 Runtime Command Admission。
如果用户需要基于历史内容再次发起 Runtime / Business Action，必须创建新的 Command，并由 Runtime Host 在新的当前权威上下文中重新校验；不得重新激活已经消费的旧 Surface。

已经 `consumed` 的 Surface 不得因为下游失败自动恢复为 `actionable`。

### 6.6 Command Admission

Frontend Action 请求应逐步收敛为：

```text
commandId
surfaceId
actionId
expectedRevision
input
```

浏览器携带的 `runId` 不得作为 Action 权威上下文。
Runtime Host 必须根据 `surfaceId` 解析内部关联关系。

Action Admission 必须具备：

- commandId 幂等；
- Surface revision 校验；
- `current + actionable` 状态校验；
- CAS 或等价并发控制；
- Runtime Repository 本地事务；
- 事务提交后再调用 Business Agent。

平台要求 effectively-once Command Admission，不要求整个分布式系统 Exactly Once。
真实业务副作用必须由 Business Agent 或下游系统使用 operationId、commandId 或业务幂等键进一步保护。

### 6.7 Business Agent

Business Agent 负责业务推理、后端工具、权威业务状态、Checkpoint、工作流恢复和业务副作用语义。
Business Agent 对主动公开事件的业务内容和可见范围负责。
Business Agent 不得输出 UI Plan Candidate、A2UI、HTML、Vue 或组件选择结果。

未被 Business Agent 主动公开的内部工具调用、私有 State 和 Checkpoint 不进入平台事件流和 Workbench 历史。

### 6.8 Business Agent Adapter

Adapter 只允许：

- 校验公共契约；
- 补充和传递 operationId、commandId、eventId、threadId、turnId、agentRunId、toolCallId 等关联标识；
- 将 Agent 私有事件映射为 PlatformRuntimeEvent 和 AG-UI 事件；
- 拒绝不合法事件。

Adapter 禁止总结、改写、重新解释或重新判断业务内容。
Adapter 不负责 Runtime Repository 或诊断持久化。

### 6.9 Presentation Pipeline

Presentation Pipeline 同时负责 Markdown 和 Generative UI 两条最终展示路径。

- Markdown AgentContent 直接形成 Markdown PresentationResult；
- 结构化 AgentContent 才可进入 Presentation Router、Presentation Model 和 UI Compiler Core；
- 消息、工具调用、状态、进度和 Interrupt 等过程事件不得进入 Presentation Pipeline；
- Presentation fallback 或失败只影响 Presentation Outcome，不得反向覆盖 Operation Outcome。

### 6.10 Compiler Core

UI Compiler Core 必须保持框架、传输、Agent 框架和模型供应商中立。
UI Compiler Core 是唯一可信 A2UI 生产者。

## 7. Runtime Repository 要求

Runtime Repository 是交互权威状态存储，不是诊断数据库别名。

它必须支持：

- Thread / Turn / Operation / Surface 查询；
- Command 幂等记录；
- 同一数据库范围内的原子状态更新；
- Runtime Host 重启后的状态恢复；
- 与 Business Agent Checkpoint 通过 threadId 的受控关联；
- 跨 Store 部分失败的显式表达与 Reconcile。

当前不要求 Runtime Repository 与 Business Agent Checkpoint Store 使用分布式事务。

## 8. Runtime Event 与诊断要求

PlatformRuntimeEvent 是 Runtime Truth 的事件投影，不是 Thread、Operation 或 Surface 的唯一事实数据库。
事件必须新增或保留 `operationId` 关联能力。
`runId` 只作为外部执行或兼容关联标识，不作为 Runtime Domain 主键。

Diagnostic Recorder 只保存观察和诊断投影：

1. `DiagnosticEvent`：规范化事件流水；
2. `DiagnosticArtifact`：正式契约边界上的诊断输入输出对象。

平台不得把原始 SSE 文本、WebSocket Frame 或 CopilotKit 内部对象作为诊断事实保存。
平台不得单独持久化 TurnTrace 或其他第二份聚合事实。
Workbench 打开 Turn 时，由 Runtime Host 临时聚合并返回 `TurnDetailsResponse`。

Diagnostic Store 可以 best-effort，并允许因为容量保护或故障出现缺口。
诊断保存失败不得导致业务 Operation 失败，也不得改变 Surface 的权威生命周期。

## 9. 恢复要求

Workbench 重连、刷新或 Runtime Host 重启后：

1. 必须先从 Runtime Repository 恢复 Thread / Turn / Operation / Surface 的当前真相；
2. Diagnostic Event 连续可用时可以根据 sequence 补齐时间线；
3. Diagnostic Event 存在缺口时必须标记诊断可能不完整；
4. 不得通过 Diagnostic Event Replay 猜测并覆盖 Runtime Repository 中的权威状态。

历史 Presentation Snapshot 默认只读回放，不重新调用 Presentation Pipeline、模型或 UI Compiler Core。

## 10. Artifact 与数据披露要求

正式公开契约边界上的 Diagnostic Artifact 原则上完整保留。

- 小型和中型 Artifact 可以存入诊断数据库；
- 大型 Artifact 自动转为本地文件或对象存储；
- 诊断数据库只保存元数据、哈希、状态和 storageRef；
- Workbench 对大型对象采用延迟加载、JSON 节点按需展开、数组分页、文本分段或流式读取；
- 诊断系统不得制造可与 Runtime Repository 竞争的第二份权威交互状态。

以下内容不得进入浏览器或平台诊断历史：

- API Key、Token、密码、Cookie 和设备控制凭据；
- Runtime Host 环境变量和数据库连接信息；
- Business Agent 或 Presentation Model 系统提示词；
- 模型 Provider 原始请求和响应；
- Business Agent 私有 State 和 Checkpoint；
- 未主动公开的内部工具调用；
- 模块局部变量、运行时实例和任意内存转储。

## 11. 文档和架构冲突规则

规范优先级继续遵守仓库 `docs/README.md` 和 `AGENTS.md`。

任何后续文档、Goal、Issue、PR 或实现如果与当前已接受 ADR、平台需求或平台架构发生实质冲突：

1. 必须先明确指出冲突位置和影响；
2. 不得通过代码或文档静默覆盖当前架构；
3. 必须等待用户/架构决策者确认继续沿用当前架构、修改当前架构或新增 ADR；
4. 获得确认后，必须同步更新受影响的 ADR、需求、架构、Goal 和 Agent 规则；
5. 未确认前允许做只读分析、冲突清单和迁移方案，不允许提交改变架构语义的实现。

如果任务本身已经明确要求修改某项已指出的架构冲突，则该明确指令视为本次冲突的确认，但不得外推为其他未讨论冲突的授权。

## 12. 完成标准

- 新克隆仓库可冻结安装；
- 一个命令启动 Workbench、Runtime Host 和 Reference Business Agent；
- CopilotKit Runtime 在 Runtime Host 内提供 AG-UI 入口；
- CopilotKit 不拥有 Runtime Truth；
- Runtime Contract 可以表达 Thread / Turn / Operation / Command / Surface；
- Operation 支持 `indeterminate`；
- Action 具备 commandId 幂等、Surface revision、CAS 和 exactly-one admission；
- Workbench 不再把浏览器 runId 当作 Action 权威上下文；
- Business Agent 的公开消息、工具调用、状态和进度可实时展示；
- Markdown 和 A2UI 均可在浏览器展示；
- Action 可安全回传并恢复业务流程；
- Runtime 状态支持跨刷新和跨 Runtime Host 重启；
- Diagnostic Event 缺失不阻止当前 Runtime 状态恢复；
- Inspect 可以查看逐 Turn 和逐 Operation 时间线、阶段、工具调用、输入输出引用、错误和耗时；
- Presentation fallback 和诊断持久化失败不会污染业务 Operation Outcome；
- 已 consumed Surface 不会因为业务失败被静默重新激活；
- 敏感配置和私有 Agent 状态不进入浏览器或平台诊断历史；
- 自动化测试覆盖重复 Command、并发 Action、断线、重试、indeterminate 和恢复路径。
