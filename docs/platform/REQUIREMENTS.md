# Generative UI Platform 平台级需求

**适用范围：** 整个仓库。

**文档关系：** 本文定义平台级范围，不替代或删除现有 Compiler MVP 文档。
`docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 继续作为 Generative UI Compiler 子系统基线。

## 1. 建设背景

仓库当前已不再只验证 UI Compiler Core 和独立 UI Compiler Service 的历史 MVP。
Agent Runtime Host 和 Generative UI Workbench 已进入仓库，当前阶段需要验证 Business Agent 公开事件流、AG-UI 交互、嵌入式 Presentation Pipeline、浏览器 A2UI 渲染、Action 回传和跨重启诊断历史的完整链路。

```text
用户输入
→ Workbench
→ AG-UI
→ Agent Runtime Host（嵌入 CopilotKit Runtime）
→ PlatformRunService
→ Business Agent Adapter
→ Business Agent 公开事件流
   ├── 消息 / 活动 / 工具调用 / 状态 / Interrupt → AG-UI → Workbench
   └── 最终 AgentContent → Embedded Presentation Pipeline
          ├── Markdown → Markdown PresentationResult
          └── Structured Data
                → Presentation Router / Model Adapter
                → UI Plan Candidate
                → UI Compiler Core
                → A2UI PresentationResult
→ Frontend Runtime
→ Action / Confirm / Resume
```

## 2. 平台定位

Generative UI Platform 是面向 Agent 应用的生成式 UI 编译与交互运行基础设施。
平台既承载 Business Agent 主动公开的过程事件，也把最终 Markdown 或结构化业务内容转换为受 Schema、Policy 和 Component Catalog 约束的展示结果。
平台不是任意前端代码生成器，也不要求 Business Agent 理解 A2UI 或前端组件。

## 3. 当前阶段目标

当前平台开发验证阶段必须支持：

- Web 只连接 Agent Runtime Host；
- Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 交互协议；
- 当前参考实现使用 CopilotKit Runtime 的 HTTP POST + SSE 路径；
- CopilotKit Runtime 嵌入 Runtime Host，不作为并列 Runtime 独立部署；
- Runtime Host 通过可替换 Adapter 调用协议无关的 Business Agent；
- Business Agent 可以流式发布公开消息、活动、进度、工具调用、状态、Interrupt 和最终 AgentContent；
- Business Agent Adapter 只做契约校验、关联标识补充和事件映射，不改写业务内容；
- 过程事件通过 AG-UI 直接进入 Workbench，不进入 Presentation Pipeline；
- 最终 AgentContent 进入 Presentation Pipeline；
- Markdown AgentContent 直接形成 Markdown PresentationResult，不调用 Presentation Model 和 UI Compiler Core；
- 结构化 AgentContent 才进入 Generative UI 编译链路；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- Frontend Runtime 渲染 Markdown 和 A2UI；
- 用户 Action 经 Runtime Host 校验后回传或恢复 Business Agent；
- Runtime Host 内部使用统一 PlatformRuntimeEvent，同时投影到 AG-UI 实时流和诊断持久化；
- Debug Conversation、Diagnostic Event 和 Diagnostic Artifact 支持跨刷新和跨 Runtime Host 重启；
- 单元、集成和浏览器测试在进程内使用确定性替身，不需要模型密钥；
- 开发环境支持统一启动、构建、验证和诊断。

## 4. 当前允许建设

- TypeScript LangGraph Reference Business Agent；
- Business Agent Contract 与 Adapter；
- PlatformRunService、Action 和 Resume 编排；
- 嵌入 Agent Runtime Host 的 CopilotKit Runtime；
- AG-UI 标准事件和平台扩展事件映射；
- Presentation Pipeline Package；
- Presentation Model Adapter 多供应商验证；
- Generative UI Workbench；
- Markdown Renderer 和 Vue A2UI Renderer；
- Component Registry 和 Frontend Action Registry；
- Debug Conversation 和逐 Turn Inspect；
- Diagnostic Recorder 应用内模块；
- Diagnostic Event、Diagnostic Artifact、TurnDetailsResponse；
- SQLite 诊断元数据与中小 Artifact 存储；
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
- 将 Diagnostic Recorder 立即拆成独立服务或 workspace package；
- 为 HTTP、WebSocket 和 AG-UI 分别维护独立 Agent 业务协议；
- 任意 HTML、JavaScript、Vue 或 React 代码生成；
- 完整 A2UI 全规范；
- 正式业务产品前端。

## 6. 强制边界

### 6.1 Web

只允许 `Web → Agent Runtime Host`。
Web 不得直接调用 Business Agent、Presentation Pipeline、UI Compiler Core 或模型供应商。

Workbench 的 Agent 交互必须使用 AG-UI。
普通 REST 只用于 Catalog、Scenarios、Settings、Health、Debug Conversation、Turn Details、Artifact 查询和 Diagnostic Bundle 等非 Agent 交互能力。
业务设备实时 WebSocket 可以独立存在，但不得与 Agent 交互协议混合。

### 6.2 Business Agent

Business Agent 负责业务推理、后端工具、权威业务状态和工作流恢复。
Business Agent 对主动公开事件的业务内容和可见范围负责。
Business Agent 不得输出 UI Plan Candidate、A2UI、HTML、Vue 或组件选择结果。

未被 Business Agent 主动公开的内部工具调用、私有 State 和 Checkpoint 不进入平台事件流和 Workbench 历史。

### 6.3 Business Agent Adapter

Adapter 只允许：

- 校验公共契约；
- 补充 eventId、threadId、runId、turnId、toolCallId 等关联标识；
- 将 Agent 私有事件映射为 PlatformRuntimeEvent 和 AG-UI 事件；
- 拒绝不合法事件。

Adapter 禁止总结、改写、重新解释或重新判断业务内容，也不负责诊断持久化。

### 6.4 Presentation Pipeline

Presentation Pipeline 同时负责 Markdown 和 Generative UI 两条最终展示路径。

- Markdown AgentContent 直接形成 Markdown PresentationResult；
- 结构化 AgentContent 才可进入 Presentation Router、Presentation Model 和 UI Compiler Core；
- 消息、工具调用、状态、进度和 Interrupt 等过程事件不得进入 Presentation Pipeline。

### 6.5 Compiler Core

UI Compiler Core 必须保持框架、传输、Agent 框架和模型供应商中立。
UI Compiler Core 是唯一可信 A2UI 生产者。

### 6.6 诊断边界

“完整诊断数据”仅指正式公开契约边界上的完整可序列化输入输出，包括：

- Business Agent 主动公开的 Tool Call 和 Tool Result；
- AgentContent；
- Presentation Request 和 Presentation Decision；
- UI Plan Candidate；
- Validation Result；
- UI IR；
- A2UI；
- PresentationResult；
- Renderer 和 Action 结果；
- 阶段错误、耗时和关联标识。

以下内容不得进入浏览器或平台诊断历史：

- API Key、Token、密码、Cookie 和设备控制凭据；
- Runtime Host 环境变量和数据库连接信息；
- Business Agent 或 Presentation Model 系统提示词；
- 模型 Provider 原始请求和响应；
- Business Agent 私有 State 和 Checkpoint；
- 未主动公开的内部工具调用；
- 模块局部变量、运行时实例和任意内存转储。

## 7. 诊断持久化要求

平台只持久化两类权威诊断数据：

1. `DiagnosticEvent`：规范化完整事件流水；
2. `DiagnosticArtifact`：正式契约边界上的完整输入输出对象。

平台不得把原始 SSE 文本、WebSocket Frame 或 CopilotKit 内部对象作为诊断事实保存。
平台不得单独持久化 TurnTrace 或其他第二份聚合事实。
Workbench 打开 Turn 时，由 Runtime Host 临时聚合并返回 `TurnDetailsResponse`。

每个事件必须具备唯一 `eventId` 和 Turn 内单调递增的 `sequence`。
事件传递采用至少一次投递和幂等写入；Recorder 按 `eventId` 去重。
Workbench 必须按 `sequence` 还原时间线，并在发现序号缺口时标记诊断可能不完整。
断线恢复后可以从最后 sequence 补齐历史事件。

## 8. Artifact 存储要求

正式契约边界上的 Artifact 原则上完整保留。

- 小型和中型 Artifact 可以存入诊断数据库；
- 大型 Artifact 自动转为本地文件或对象存储；
- 诊断数据库只保存元数据、哈希、状态和 storageRef；
- Workbench 对大型对象采用延迟加载、JSON 节点按需展开、数组分页、文本分段或流式读取；
- 用于业务渲染的 Tool Result、Markdown 或 A2UI 继续通过正常业务链路传递，诊断系统不得制造第二份权威副本。

部署可以配置单文件、总容量、磁盘空间和对象存储超时等保护阈值。
超过阈值只影响诊断持久化，必须记录 persistence-failed 或 skipped-by-protection-limit，不得影响 Agent、Presentation Pipeline、UI Compiler Core 和最终展示主链路。

## 9. Diagnostic Recorder 要求

Diagnostic Recorder 是逻辑应用模块，MVP 可以位于 `apps/agent-runtime-host/src/diagnostics` 或等价应用内部目录。
它不是 Runtime Host 核心业务职责，也不应自动拆成 `packages/diagnostic-recorder`。
公共事件 Schema 和类型可以放入已有 `packages/runtime-contract`。
只有在多应用复用、独立版本化或独立部署时，才考虑提取为 Package 或服务。

AG-UI 实时投影和诊断持久化必须相互独立。
Workbench 实时事件不得等待数据库、文件或对象存储完成。
诊断保存失败不得导致业务 Turn 失败。

## 10. 历史与导出要求

- Workbench 必须支持跨刷新、跨 Runtime Host 重启的多轮 Debug Conversation；
- 历史加载读取已持久化 Event 和 Artifact，不默认重新运行 Agent、Pipeline 或 Compiler；
- 当前不实现 Debug Conversation 的用户、角色、租户或资源级细粒度权限控制；
- 共享开发环境的访问边界由部署环境负责；
- 当前只建设 Diagnostic Bundle Export，不建设完整案例管理与自动断言平台。

## 11. 文档优先级

- 跨子系统关系和平台范围以本文及 `docs/platform/ARCHITECTURE.md` 为准；
- Workbench 产品要求以 `docs/WEB_WORKBENCH_SRS.md` 为准；
- Compiler 子系统内部行为继续以原 Compiler MVP 文档为准；
- 当前阶段执行范围以已批准的 Goal 或 Decision Issue 为准；
- Roadmap 不自动授权实现。

## 12. 完成标准

- 新克隆仓库可冻结安装；
- 一个命令启动 Workbench、Runtime Host 和 Reference Business Agent；
- CopilotKit Runtime 在 Runtime Host 内提供 AG-UI 入口；
- Workbench 不再维护自定义 HTTP/WebSocket Agent 交互协议；
- Business Agent 的公开消息、工具调用、状态和进度可实时展示；
- Markdown 和 A2UI 均可在浏览器展示；
- Action 可回传并恢复业务流程；
- Debug Conversation 支持跨刷新和跨 Runtime Host 重启；
- Inspect 可以查看逐 Turn 时间线、阶段、工具调用、输入输出引用、错误和耗时；
- 正式契约 Artifact 原则上完整持久化，大型 Artifact 可延迟、分页或流式查看；
- 诊断持久化失败不影响主业务执行；
- Diagnostic Bundle 可以导出所选公开诊断；
- 自动化测试使用进程内确定性替身，不需要模型密钥；
- Playwright E2E 在 CI 稳定通过；
- 敏感配置和私有 Agent 状态不进入浏览器或平台诊断历史。
