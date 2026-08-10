# Generative UI Workbench Specification

**文档版本：** 0.5

**项目阶段：** MVP 规格基线

**所属项目：** Generative UI Platform

**产品名称：** Generative UI Workbench

**中文名称：** 生成式 UI 开发与诊断工作台

> 本文只定义 Workbench 的产品行为、用户体验、外部依赖边界和 MVP 验收条件。
> Runtime Truth、平台架构、迁移策略和精确 Schema 由各自的权威文档定义，本文不重复维护第二份事实。

本文使用以下约束词：

- **MUST / 必须**：MVP 不可缺少的行为或约束；
- **MUST NOT / 禁止**：不得形成的行为或依赖；
- **SHOULD / 应该**：原则上应满足，偏离时需要明确理由；
- **MAY / 可以**：可选或 Supporting 能力。

---

## 0. 文档边界与权威来源

## 0.1 本文负责什么

本文是 Generative UI Workbench 的产品合同，回答五个问题：

1. 为什么需要 Workbench；
2. Workbench 是什么；
3. 用户可以用它做什么；
4. Workbench 必须遵守哪些平台边界；
5. 什么情况下可以认为 MVP 完成。

## 0.2 Canonical Sources

| 主题 | 权威来源 |
|---|---|
| Workbench 产品行为、UX、IA、MVP Acceptance | 本文 |
| Workbench 与 Runtime Host 的前端集成边界 | `docs/adr/0020-workbench-runtime-read-contract-and-copilotkit-headless.md` |
| 受控 Conversation UI 与平台调试会话历史 | `docs/adr/0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md` |
| Runtime Truth Model 与安全 Command Admission | `docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md` |
| 平台外部接入模式与能力保证边界 | `docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md` |
| 当前平台架构 | `docs/platform/ARCHITECTURE.md` |
| 平台级 MUST / MUST NOT | `docs/platform/REQUIREMENTS.md` |
| 旧 Runtime 模型迁移 | `docs/platform/RUNTIME_TRUTH_MIGRATION.md` |
| Runtime / Diagnostic 数据结构与 Schema | `packages/runtime-contract` 及对应 Contract |
| UI Compiler 内部设计 | `docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md` |
| 实施顺序、优先级与任务拆分 | Goal / Task / Issue |

当本文与更高层 Runtime / Platform 权威文档冲突时，本文不得自行重新定义 Runtime 语义，应修正 Workbench 行为以符合当前平台规则。

---

## 1. 产品背景、目的与范围

## 1.1 产品背景：为什么需要 Workbench

Agent 应用的前端已经不只是“输入一句话、显示一段文本”。一个真实交互过程可能同时包含：

- 多轮 Conversation；
- Business Agent 主动公开的消息、进度、状态和工具调用；
- Markdown 与结构化 Generative UI；
- 可操作的 Business Surface；
- Action、人工确认和业务副作用；
- 页面刷新、连接中断和 Runtime Host 重启后的状态恢复；
- 跨 Agent、Runtime、Presentation、Compiler、Renderer 和 Action 边界的问题定位。

如果没有统一的 Reference Frontend，平台开发和联调通常会退化为临时 Demo 页面、接口工具、浏览器状态和分散日志的组合。这样可以验证单个接口，却很难稳定回答：

- 用户实际看到的完整交互是否成立；
- Agent 公开过程与最终 Presentation 是否正确衔接；
- Markdown、Generative UI 和受控 Action 是否能在同一 Conversation 中工作；
- 某个 Action 为什么被允许、拒绝或失效；
- 刷新或 Runtime Host 重启后，当前交互状态是否仍然正确；
- 问题究竟发生在 Agent、Runtime、Presentation、Compiler、Renderer、Action 还是 Diagnostics。

因此平台需要一个统一、可运行、可恢复、可诊断的官方 Web 参考环境，而不是继续依赖临时调试页面。

## 1.2 产品目的

Workbench 的目的不是复制 Runtime Host 或 Business Agent，而是提供一个统一的 Web 产品环境，验证 Generative UI Platform 是否真正形成可用的端到端交互闭环。

它应使开发者能够证明：

- Agent 交互能够在浏览器中连续运行；
- Markdown 和 Generative UI 能够以安全、受控方式呈现；
- 用户 Action 和高风险 Confirmation 不会绕过 Runtime 权威边界；
- Conversation 在刷新和 Runtime Host 重启后仍能恢复到正确状态；
- 当链路异常时，可以从用户看到的问题继续进入逐 Turn / Operation 调查。

一句话目的：

> 让 Generative UI Platform 的完整交互链路在一个官方 Web 环境中可运行、可操作、可恢复、可诊断，并能作为后续应用接入的 Frontend Runtime 参考实现。

## 1.3 Workbench 是什么

Generative UI Workbench 是：

> Generative UI Platform 的官方 Frontend Runtime 参考实现，以及面向 Agent Runtime Host 的开发、联调、运行验证和逐 Turn 诊断工作台。

从产品角色看，它同时承担：

- Runtime Host 的统一 Web 交互入口；
- Conversation-first Agent 客户端；
- Markdown 与受控 Generative UI 的运行环境；
- Interactive Surface 与 Confirmation 的用户交互环境；
- Debug Conversation 与逐 Turn Inspect 的开发调查入口；
- Component、Action 和 Reference Scenario 的验证环境。

Workbench 是面向平台开发与集成验证的开发者产品，不是最终业务生产前端。

Workbench 验证的是 ADR-0025 定义的 Agent Runtime Integration。

在该模式中，Runtime Host 同时提供 Presentation Safety 与 ADR-0024 定义的 Interaction Safety。

Presentation Integration 的公共 API、Catalog 选择与独立部署形态不属于 Workbench 产品范围。

## 1.4 谁使用 Workbench

Workbench 的主要用户包括：

- 平台开发者：验证 Runtime Host、Presentation、Diagnostics 等平台链路；
- Business Agent 开发者：验证 Agent 主动公开事件、最终内容和恢复交互；
- 前端组件 / Action 开发者：验证受控组件、Action 与业务 Surface；
- 测试人员：执行端到端场景并定位失败位置；
- 架构师和产品负责人：验证平台职责边界与 MVP 是否成立；
- 编码 Agent：读取稳定产品合同并据此拆解实现与测试任务。

## 1.5 用户可以用 Workbench 做什么

从用户任务角度，Workbench 的核心工作是：

1. **进行 Agent Conversation**：创建、继续和打开多轮 Conversation，并查看 Agent 主动公开的运行过程；
2. **查看最终 Presentation**：在同一 Conversation 中查看 Markdown 或受控 Generative UI；
3. **操作受控 Business Surface**：执行允许的前端交互，对高风险操作完成明确确认，并看到平台对 Command 的接纳或拒绝结果；
4. **恢复历史与当前状态**：页面刷新、重新打开 Conversation 或 Runtime Host 重启后，继续查看正确的当前交互状态，而不是依赖浏览器旧状态；
5. **调查某个 Turn 的问题**：进入 Inspect，查看 Operation、阶段、耗时、错误、公开输入输出和 Diagnostic Artifact。

此外，Workbench MAY 提供 Catalog、Scenarios、Settings 等 Supporting Developer Tools，用于提高组件、Action、参考场景和运行环境配置的验证效率；这些工具不决定核心 MVP 是否成立。

这些是 Workbench 的用户任务；其底层 Runtime 状态机、Command Admission 算法和数据 Schema 由对应 Canonical Source 定义。

## 1.6 Workbench 不是什么

Workbench MUST NOT 成为：

- Business Agent；
- Agent Runtime Host；
- Business Agent Router；
- Business Agent 私有工作流状态存储；
- UI Plan 生成器；
- A2UI Compiler；
- 后端业务工具执行器；
- 任意前端代码生成器；
- 完整 Case / Assertion / Regression 平台；
- 正式智慧安防生产系统。

## 1.7 MVP 核心能力

MVP Release Gate 只看以下五类产品能力是否成立。

### G1 Conversation

- Conversation-first 多轮交互；
- Conversation History；
- 页面刷新后恢复；
- 历史浏览不会自行触发新的执行或业务副作用。

### G2 Presentation

- 安全 Markdown；
- 受控 A2UI；
- Inline Business Surface；
- Fallback / degraded 状态可见。

### G3 Safe Interaction

- Action；
- Confirmation；
- Command 提交；
- duplicate / stale / rejected / no-longer-actionable 等结果反馈；
- Workbench 不绕过 Runtime Host 的 Command Admission。

### G4 Recovery

- Runtime Host 重启后恢复正确的当前交互体验；
- Workbench 始终以 Runtime Host 返回的权威状态为准；
- `indeterminate` 能被正确展示并进入 Reconcile / 恢复流程。

### G5 Inspect

- 逐 Turn Inspect；
- 能定位 Operation、阶段、输入输出、错误、降级和诊断缺口；
- 大型 Artifact 能安全、有界查看；
- 能导出脱敏的 Diagnostic Bundle。

## 1.8 Release Invariants

以下不是独立功能模块，而是所有 MVP 能力都必须满足的发布底线：

- 不执行任意模型生成代码；
- 只允许受控组件和受控 Action；
- Markdown 必须安全处理；
- 平台禁止披露的数据不得进入 Workbench；
- Diagnostic failure 不得把已确定的 Runtime / Business 结果伪装成业务失败；
- Workbench 不得从本地缓存、历史 A2UI、Diagnostic Event 或旧 `runId` 推导新的 Runtime Truth；
- Workbench 必须能够独立构建和部署。

## 1.9 Supporting Capability

以下能力允许在 MVP 周边建设，但不阻塞 MVP Release：

- Catalog、Scenarios、Settings 等 Developer Tools；
- 完整 Object Storage / 多后端 Artifact Storage Router；
- JSON Path 搜索；
- 高级流式读取和流式导出；
- 超大型数组高级虚拟化；
- 运行统计和链路性能分析；
- 外部 Trace 系统关联。

## 1.10 Post-MVP

以下能力不属于当前 MVP：

- Case Definition；
- Case Import；
- Rerun；
- 自动语义 Assertion；
- Regression Management；
- Interaction Gateway；
- 多 Business Agent 自动路由；
- Presentation Integration 的公共 API、Catalog 选择和独立部署形态；
- Business Agent Adapter 的最终方法形状、InteractionRequest 完整字段、过程事件完整 taxonomy、SDK 和 Package 形态；
- 真实设备控制和生产业务数据；
- 正式生产会话服务、租户、权限、计费和业务审计。

---

## 2. 产品体验与信息架构

## 2.1 Conversation-first

Workbench 默认采用 Conversation-first 外壳：

```text
Workbench Shell
├── Top Navigation
│   ├── Catalog / Scenarios / Settings
│   └── Environment / Connection Status
├── Conversation Sidebar
│   └── Debug Conversations
└── Conversation Flow
    ├── User Message
    ├── Agent Message / Public Activity
    ├── Markdown Result
    └── Inline Business Surface
```

Conversation 是默认工作上下文。

MVP 不再保留独立 Playground 产品概念。

## 2.2 New Conversation

用户选择 New Conversation 后进入空会话。

首条消息被 Runtime Host 接受后，该 Conversation 成为可恢复的 Debug Conversation。

Workbench MUST NOT 维护一套与 Conversation History 分离的长期 Playground 草稿状态模型。

## 2.3 Conversation Sidebar

Conversation Sidebar MUST 支持：

- 创建；
- 打开；
- 多轮 Conversation 切换；
- 重命名；
- 归档；
- 删除单个 Conversation；
- 清空全部调试历史；
- 最近活跃排序；
- Archived 分组；
- 跨刷新恢复。

删除和清空操作必须展示明确确认，并显示 Runtime Host 返回的成功、失败或跨 Store 部分失败结果。

重命名、归档和删除应通过列表项的按需操作入口提供，并为不支持 hover 的设备提供等价入口。

Sidebar 保持单一职责，不承载 Catalog、Scenario 或全局 Inspect 工具。

## 2.4 Conversation Flow

主区域应保持自然对话体验：

- 用户消息使用明确的用户消息视觉；
- Assistant 文本直接进入对话流；
- Business Surface 内联在对应 Turn 中；
- 同一 Turn 可以按 Operation 顺序追加多个不可变 Assistant Presentation；
- 新 Presentation 不得覆盖或改写旧 Presentation；
- 不为每个 Turn 强制添加大型调试卡片；
- completed 默认不增加额外状态噪音；
- running、degraded、failed、indeterminate 等进行中或异常状态必须可见。

## 2.5 Inline Business Surface

Business Surface 是业务展示内容，而不是调试容器。

Workbench MUST：

- 在 Conversation Flow 中内联展示 Surface；
- 通过受控组件集合渲染 A2UI；
- 使用 Runtime Host 返回的 Surface 状态决定当前交互能力；
- 只有 Runtime Host 投影为 `current + actionable` 的 Surface 才能提交 Runtime / Business Action；
- 不依据浏览器本地缓存自行判断某个历史 Action 仍然有效。

### 2.5.1 Historical Surface 的交互规则

必须区分两类行为。

**Local UI Interaction** 不改变 Runtime Truth 或 Business Truth，例如：

- 展开 / 收起；
- 复制；
- 查看详情；
- 查看原始 A2UI / Artifact；
- 打开 Inspect。

这类行为 MAY 在 Historical Presentation 上继续使用。

**Runtime / Business Action** 会向 Runtime Host 提交 Command，可能创建 Operation 或触发业务副作用。

对于 Historical Surface：

- MUST NOT 使用历史授权、历史 revision、历史 run 上下文直接重放旧 Runtime / Business Action；
- MVP 中，旧 Surface 上的状态变更型 Runtime / Business Action 默认禁用；
- 用户若确实需要再次执行，应进入新的、由 Runtime Host 重新校验的当前交互上下文；
- 未来若支持“从历史内容重新执行”，也必须产生新的 Command / 当前 Surface 或等价的新权威上下文，而不是重新激活已经消费的旧 Surface。

因此：

> Historical Presentation 可继续查看；Historical Action Authority 不可被直接重放。

## 2.6 Turn 状态与诊断入口

Turn 状态默认保持克制：

- running：显示进行中；
- degraded：显示降级原因入口；
- failed：显示失败；
- indeterminate：明确显示结果未知并提供后续处理入口；
- completed：默认不留下额外完成标记。

开发诊断入口按需出现，可通过 hover、focus 或适配触屏设备的等价方式访问。

至少提供：

- 耗时；
- Inspect；
- 原始 Presentation / A2UI 入口（适用时）。

## 2.7 Inspect

逐 Turn 深度诊断通过独立路由进入：

```text
/inspect/:turnId
```

Inspect 必须可深链接访问。

Inspect 通过 Turn 诊断入口或直接深链接到达，不占用全局顶级导航入口。

Inspect 不应作为 Conversation Flow 的常驻复杂面板。

Conversation Flow 只展示用户可理解的过程、异常摘要和 Inspect 入口。

Inspect 使用独立的查询与实时诊断状态，不得从 Conversation Store、AG-UI 浏览器缓存或历史 A2UI 推导完整诊断视图。

## 2.8 Supporting Developer Tools

Catalog、Scenarios、Settings MAY 作为顶级 Developer Tools 提供，用于提高扩展验证和环境配置效率。

这些页面不属于 MVP Release Gate；缺失时不得阻止 Conversation、Presentation、Safe Interaction、Recovery 和 Inspect 五类核心能力的验收。

Cases 不属于当前 MVP 信息架构。

---

## 3. Workbench 核心能力与外部契约

## 3.1 C1 - Conversation

Workbench MUST 支持：

- New Conversation；
- 多 Turn 交互；
- Conversation List；
- 打开历史 Conversation；
- 重命名 Conversation；
- 归档 Conversation；
- 删除单个 Conversation；
- 清空全部调试历史；
- 最近活跃排序；
- Archived 分组；
- 页面刷新后的恢复；
- Runtime Host 重启后的恢复体验。

打开历史 Conversation 本身 MUST NOT 创建新的执行、重复原业务副作用或把历史内容静默变成当前交互状态。

历史 Presentation 必须按已验证的不可变 Snapshot 回放，不得为了显示历史而重新调用 Business Agent、Presentation Model 或 UI Compiler Core。

## 3.2 C2 - Agent Interaction

Workbench 的 Agent 交互 MUST 使用 Runtime Host 提供的 AG-UI 入口。

当前参考实现使用 CopilotKit Runtime 的 HTTP POST + SSE。

Workbench MUST：

- 发送用户消息；
- 接收公开实时事件；
- 区分公开过程事件与最终 Presentation；
- 显示连接状态；
- 支持取消；
- 在 Runtime 允许时支持 Resume / Reconcile 相关操作；
- 对网络中断提供明确反馈。

Workbench MUST NOT：

- 直接连接 Business Agent；
- 配置 Business Agent 私有 URL；
- 持有 Business Agent 私有凭据；
- 维护与 AG-UI 并列的自定义 Agent 业务协议。

HTTP、SSE、WebSocket 只是 Transport，不构成并列业务协议。

Business Agent 主动公开的消息、进度、状态、Tool Call、Tool Result 公开部分和 Interrupt 等过程事件由 Runtime Host 直接投影到 AG-UI 与 Diagnostics，不进入 Presentation Pipeline。

公开过程事件不得改变最终业务结果、Operation Outcome 或 Runtime Truth。

Business Agent Adapter 只负责公共契约校验、协议映射和关联标识补充，不得总结、改写或重新解释业务内容。

## 3.3 C3 - Presentation

### Markdown

Workbench MUST：

- 安全渲染 Markdown Presentation；
- 阻止危险 HTML、脚本、危险 URL 协议和未授权嵌入；
- 显示 fallback / degraded 状态。

### A2UI

Workbench MUST：

- 只允许平台注册的组件类型；
- 校验组件类型和 Props；
- 对未知组件显示明确错误或安全降级；
- MUST NOT 执行模型生成的任意 JavaScript、Vue、React 或动态模块代码。

### Presentation Authority

Workbench 只消费平台返回的 Presentation，不生成 UI Plan，也不编译 A2UI。

只有 Business Agent 主动提交的最终 AgentContent 才进入 Presentation Pipeline。

Markdown AgentContent 直接形成 Markdown PresentationResult。

完成的结构化业务结果一次性进入 Generative UI 编译链路，Workbench 不消费增量生成或增量编译的 A2UI。

具体 Presentation Pipeline 与 UI Compiler Core 语义见平台架构和 Compiler 文档。

## 3.4 C4 - User Interaction

Workbench 负责表达用户意图，不拥有 Command Admission 权威。

需要用户批准、拒绝、选择或补充输入的业务交互必须来自 Business Agent 的显式结构化 InteractionRequest 或等价公共契约。

Presentation Pipeline 和 Workbench MUST NOT 从 Markdown 或自然语言推断可执行 Runtime / Business Action。

Runtime Host 负责把 InteractionRequest 绑定为受 Surface revision、Command Admission、幂等和恢复语义保护的当前交互。

对于需要提交 Runtime Command 的 Action，Workbench 应根据当前 Runtime Contract 提交必要字段，并展示 Runtime Host 返回的结果。

Workbench MUST 正确处理至少以下反馈：

- accepted；
- rejected；
- duplicate；
- stale；
- consumed / no-longer-actionable；
- indeterminate；
- reconcile-required。

### Frontend Action Safety

Workbench 只允许已注册的 Frontend Action。

每个可执行 Action 至少应有：

- 明确的 Action 标识；
- 参数约束；
- 风险 / Confirmation 要求；
- 受控执行入口。

### Confirmation

对于高风险业务行为，Workbench 必须在用户确认前展示足够的决策上下文，至少包括适用的：

- 操作名称；
- 目标对象；
- 关键参数；
- 影响范围；
- 风险提示。

用户明确确认后，Workbench 才允许继续提交受控意图。

Workbench MUST NOT：

- 直接调用任务创建、设备控制等后端业务工具；
- 根据客户端 `runId` 决定某个 Action 是否仍可执行；
- 在 Runtime Host 已拒绝后通过前端重试绕过 Admission；
- 因下游失败自动把已经消费的旧 Surface 恢复为可执行。

Command Admission、幂等、Surface revision 与 Operation 的完整语义以 ADR-0024 和平台 Runtime Contract 为准。

## 3.5 C5 - Inspect & Artifact

Inspect 的目标是：

> 让开发者快速回答“问题发生在哪一层、哪一步、输入输出是什么、是否存在诊断缺口”。

Inspect 应围绕以下稳定职责边界组织：

- Workbench；
- Agent Runtime Host；
- Business Agent Adapter；
- Business Agent；
- Presentation Pipeline；
- UI Compiler Core。

Runtime Host 必须基于 Runtime Repository 中的权威交互事实与 Diagnostic Store 中的观察投影，临时聚合 TurnDetailsResponse 或等价只读查询视图。

该查询视图不是数据库实体，也不得成为与 Runtime Repository 竞争的第二份权威来源。

活动 Turn 的完整视图与实时增量必须由同一个服务端 Turn Diagnostic Projector 或等价聚合边界产生。

Workbench 只应用服务端完整视图和增量，不根据原始 Diagnostic Event 自行计算 Turn、Operation、Surface、阶段或最终状态。

Inspect 至少应能够展示：

- Turn 内 Operation 分段；
- 事件顺序；
- 阶段归属；
- 状态；
- 耗时；
- skipped / degraded；
- Tool Call / Tool Result；
- Presentation / Compiler 相关 Artifact；
- Error Code；
- Field Path；
- Diagnostic completeness。

Inspect 必须区分诊断事件 `sequence` 与聚合视图 `revision`。

Inspect 必须显示已持久化 sequence、当前观察到的 sequence、尚未持久化的实时尾部和已知缺口。

未持久化实时事件可以显示，但不得伪装成完整历史事实。

诊断实时流重连时应先补齐缺失增量；无法安全补齐时必须重新获取完整查询视图。

### Execution Map 与 Node Detail

逐 Turn 定位视图采用六职责边界泳道时间线作为参考方向。

定位层 MUST：

- 按 Diagnostic Event sequence 排列事件；
- 将事件归入稳定职责边界；
- 展示状态、耗时、Error Code 和 sequence 缺口；
- 区分 Operation 分段、skipped、degraded、并行和 Reconcile / Resume 关联；
- 不把业务 Payload 映射成另一套摘要事实。

详情层 MUST：

- 以 Artifact 为粒度打开当前事件对应的公开契约输入或输出；
- 对已披露的结构化 Artifact 直接提供原始 JSON 树或等价无业务重解释视图；
- 按需展开大型 JSON 节点；
- 只在请求与返回确实成对时展示配对关系；
- 对不产生契约边界 Artifact 的过程事件明确显示“无 Artifact”，不得将其伪装成尚未加载；
- 对不可披露、超过保护限制、已清理或持久化失败的 Artifact 显示明确原因。

对于正式公开契约边界上的输入输出，Workbench SHOULD 优先展示平台实际提供的原始结构化 Artifact，而不是把它重新解释成另一份业务事实。

只有在 Artifact 不可披露、超过保护限制、尚未加载或只能以 storage reference 提供时，才使用摘要或占位信息作为兜底。

具体 Event / Artifact 字段由 Runtime / Diagnostic Contract 定义，本文不复制 Schema。

原始 Diagnostic Event MAY 在高级 Raw Events 视图中查看。

Raw Events 不参与 Workbench 对 Runtime Truth 或聚合诊断状态的前端计算。

### 大型 Artifact

MVP Release Gate 要求：

- 先显示 metadata；
- 至少能看到大小、hash、persistence status 等必要信息；
- 明确总量、已加载范围、完整内容可用性和来源阶段；
- 大对象不默认一次性加载和渲染；
- 所有成功持久化且允许披露的 Artifact 最终必须可完整访问；
- Artifact 不得被静默截断，也不得把部分内容标记为完整；
- 超保护限制或保存失败必须有明确状态；
- 大内容加载必须可取消，切换 Turn 后必须停止不再需要的读取；
- 单个 Artifact Viewer 失败不得导致整个 Inspect 不可用；
- Artifact / Diagnostic failure 不得导致已成功的业务结果在 UI 中被伪装成业务失败。

Artifact 成功保存后必须保持不可变。

同一 artifactId 必须始终引用相同内容和内容 hash。

Artifact 内容因保留策略被清理后，Inspect 必须保留可解释的墓碑元数据与引用关系。

部署可以配置单 Artifact、单 Turn、总存储容量和最低剩余空间等保护阈值。

触发保护阈值只能记录 `skipped-by-protection-limit` 或等价诊断状态，不得使业务 Operation 失败。

公共产品契约不固化脱离真实测试数据的字节上限、分页大小或浏览器最大查看数量。

### Diagnostic Bundle Export

Workbench MUST 支持导出用户选择的 Conversation 或 Turn 的脱敏 Diagnostic Bundle。

Diagnostic Bundle 至少包含适用的：

- 公开 Diagnostic Event；
- 可披露 Diagnostic Artifact 或其明确的不可用元数据；
- 错误、耗时和关联标识；
- Runtime、Contract、Catalog、Presentation 和 Compiler 版本信息；
- Diagnostic completeness 与 sequence 缺口信息。

Diagnostic Bundle MUST NOT 包含凭据、私有 Checkpoint、系统提示词、Provider 原始请求或响应，以及未公开的 Business Agent 内部事件。

完整多后端 Object Storage、高级搜索和流式导出体验属于 Supporting Capability。

## 3.6 Supporting Developer Tools & Deployment

### Catalog

Catalog MAY 提供：

- Component Name；
- Version；
- Props Schema；
- Action Definition；
- Example Data；
- Render Preview；
- Availability。

### Scenarios

Scenarios MAY 用于浏览和启动通用或领域 Reference Scenario。

领域能力通过 Scenario Package 扩展，不进入 Workbench Core 或 UI Compiler Core 的业务判断。

### Settings

Settings MAY 提供以下非敏感配置：

- Runtime Host 地址；
- Scenario；
- 请求相关前端配置；
- Debug / Artifact 查看相关配置。

敏感密钥 MUST NOT 进入浏览器构建产物。

### Deployment

Workbench MUST：

- 独立构建；
- 支持 Nginx 或容器托管；
- 支持外部环境配置；
- 支持 Health Check；
- 支持开发、测试和发布环境隔离。

---

## 4. Cross-cutting Constraints

## 4.1 Authority Consistency

Workbench MUST 以 Runtime Host 返回的当前交互状态为准。

Workbench MUST NOT 从以下信息反推出新的 Runtime Truth：

- 浏览器内存；
- 历史 A2UI；
- 单独 Diagnostic Event；
- 旧 `runId`；
- 本地 optimistic state。

Runtime Truth 与 Diagnostic Projection 的完整语义由平台权威文档定义。

Business Agent Checkpoint 只决定后续 Resume、Action 或 Reconcile 是否可继续，不得重建、覆盖或重新生成用户已经看到的历史 Presentation。

## 4.2 Diagnostic Failure Isolation

Diagnostic Event / Artifact 缺失或保存失败时：

- Conversation 主交互必须继续；
- Workbench 必须明确显示 diagnostics incomplete / persistence failure；
- 已确定的业务结果不得因为诊断故障被 UI 改写成业务失败；
- Diagnostic Replay 只能补充观察时间线，不能覆盖 Runtime Host 返回的权威状态。

## 4.3 Security

Workbench MUST：

- 将模型和 Agent 输出视为不可信输入；
- 只渲染受控组件；
- 只执行受控 Frontend Action；
- 校验 Props 和 Action 参数；
- 安全处理 Markdown；
- 不执行任意模型生成代码；
- 不持有后端敏感密钥；
- 不展示平台明确禁止披露的私有信息。

禁止披露数据的完整边界以平台 Requirements / Security Contract 为准。

## 4.4 Resilience

Workbench MUST：

- 清楚表达实时连接中断；
- 重连或刷新后重新获取 Runtime Host 当前权威状态；
- 不把本地旧状态静默当作当前状态；
- 在 `indeterminate` 时明确提示结果未知，而不是伪装成普通失败；
- 对 stale / duplicate / rejected Command 给出可理解反馈；
- Runtime Host 重启后不自动重放未完成 Operation、Agent 调用、工具调用、业务 Command 或 Presentation 阶段；
- 将 Presentation、Diagnostic Event、Diagnostic Artifact 和 Business Agent continuation capability 的缺失分别表达，不因局部缺失把整个 Conversation 判定为损坏。

无副作用或明确未派发的工作只能由用户显式重试。

可能已产生业务副作用但无法确认结果的工作必须保持 `indeterminate` 并进入 Reconcile，不得自动重试。

## 4.5 Performance Principles

MVP 不在本文规定脱离测试环境的固定“3 秒 / 500ms”硬指标。

必须满足以下架构级原则：

- 实时 UI 不等待 Diagnostic Persistence；
- 大型 Artifact 不默认完整加载；
- Inspect 不阻塞 Conversation 主流程；
- 大列表使用分页、虚拟化或其他有界策略；
- 大文本 / 文件使用范围读取、分段或流式策略。

具体 P95 / P99 指标由独立 Performance Goal 在明确测试环境后定义。

## 4.6 Contract 与 Snapshot Compatibility

Runtime Thread Contract、Diagnostic Contract 与 Presentation Snapshot 必须携带可判定的版本或身份信息。

Workbench MUST NOT 静默转换不兼容数据，也不得把不兼容 Snapshot 伪装成当前版本。

对于不兼容的历史 Presentation Snapshot，Workbench 必须：

- 显示明确的不兼容状态；
- 保留仍可用的元数据、诊断信息和受限 Raw Viewer；
- 不重新调用 Business Agent；
- 不重新调用 Presentation Pipeline 或 Presentation Model；
- 不重新编译或部分渲染不兼容 A2UI。

旧诊断页面、旧聚合对象或浏览器旧状态不得作为当前 Workbench 的并行权威来源。

具体旧实现删除、数据迁移与 Contract Adapter 计划属于迁移实施范围，不在本 SRS 中维护。

## 4.7 Browser Compatibility

MVP 优先验证：

- Chrome 最新稳定版本；
- Edge 最新稳定版本；
- Windows 11 开发测试环境。

---

## 5. MVP Acceptance

MVP 验收采用少量黑盒场景验证产品结果，不在本文验证 Runtime Kernel 的具体内部算法。

## A1 - Conversation & Presentation

**Given** Workbench 已连接 Runtime Host。  
**When** 用户连续发送多轮消息，并分别得到 Markdown 与 Generative UI 结果。  
**Then**：

- Conversation 正常形成多轮历史；
- 公开过程信息可见；
- 公开过程事件不被伪装成最终 Assistant Presentation；
- Markdown 安全渲染；
- 合法 Generative UI 正常渲染；
- Inline Surface 位于 Conversation Flow；
- 同一 Turn 后续 Operation 产生的新 Presentation 被追加，旧 Presentation 保持不可变；
- 页面刷新后 Conversation 可重新打开；
- 仅打开历史 Conversation 不会产生新的执行或业务副作用。

## A2 - Interactive Surface Safety

**Given** 当前存在一个可执行 Surface。  
**When** 分别发生正常提交、重复提交、stale revision，以及对 Historical Surface 尝试执行旧业务 Action。  
**Then**：

- 正常提交得到明确的接纳或拒绝结果；
- duplicate 不产生重复业务执行或副作用；
- stale 被明确拒绝或要求刷新；
- Historical Surface 仍可查看和执行纯 Local UI Interaction；
- Historical Surface 的旧 Runtime / Business Action 不得直接重放；
- 若需要再次执行，必须进入新的、经 Runtime Host 重新校验的当前交互上下文。

## A3 - Confirmation & Side-effect Boundary

**Given** Surface 中存在一个高风险业务操作。  
**When** 用户进入确认步骤。  
**Then**：

- 用户能看到操作名称、目标对象、关键参数以及适用的影响范围 / 风险提示；
- 用户确认前，该高风险意图不会进入正式执行；
- 用户取消后，不会产生该业务副作用。

**When** 用户明确确认并提交。  
**Then**：

- Workbench 显示平台返回的接纳或拒绝结果；
- 同一确认意图不会因双击或重试产生重复业务副作用；
- 下游失败不会使旧 Surface 自动恢复为可再次执行状态。

## A4 - Restart Recovery

**Given** 已存在多 Turn Conversation、Presentation 与交互状态。  
**When** Runtime Host 完全停止后重新启动。  
**Then**：

- Workbench 能重新打开 Conversation；
- 当前交互状态与 Runtime Host 恢复结果一致；
- 不重新执行历史业务请求；
- 未完成 Operation 不会因 Runtime Host 启动而自动重放；
- 即使部分诊断历史不可用，也只显示诊断不完整，不改变当前交互状态；
- Checkpoint 缺失只影响后续继续执行能力，不覆盖已经保存的历史结果；
- 不兼容 Presentation Snapshot 显示只读降级与明确原因，不触发 Agent、Presentation 或 Compiler 重跑。

## A5 - Indeterminate & Reconcile

**Given** 某次操作可能已经触发业务副作用。  
**When** 因连接或协议中断无法确认最终结果。  
**Then**：

- Workbench 明确显示 `indeterminate` 或等价“结果未知”状态；
- 不将其伪装成普通 failed；
- 不提供盲目重复执行旧业务 Action 的路径；
- 用户可以进入平台定义的 Reconcile / 恢复流程；
- Reconcile 完成后展示确定结果。

## A6 - Inspect, Failure Isolation & Security

**Given** 一个 Turn 同时存在诊断缺口、大型 Artifact、Artifact 保存失败和不安全内容。  
**When** 用户进入 Inspect。  
**Then**：

- 能定位主要职责边界与 Operation；
- 六职责边界泳道能看到顺序、阶段、耗时、错误和 sequence 缺口；
- 事件详情直接显示对应可披露 Artifact，且不把业务 Payload 重解释为另一份事实；
- 诊断缺口被明确标识；
- 大型 Artifact 不默认完整加载；
- Artifact 保存失败被明确显示；
- 诊断故障不把正常业务结果改写成失败；
- 未允许的 Component / Action 不执行；
- 危险 Markdown 被安全处理；
- 平台禁止披露的数据不出现在 Workbench；
- 所选 Turn 可以导出 Diagnostic Bundle；
- Diagnostic Bundle 包含公开事件、可披露 Artifact、错误、耗时、版本和完整性信息；
- Diagnostic Bundle 不包含凭据、私有 Checkpoint、系统提示词、Provider 原始请求或响应，以及未公开的 Business Agent 内部事件。

---

## Appendix A - Reference Scenario（非规范性）

智慧安防与空地多智能体巡防是首个 Reference Scenario，用于证明 Workbench 的通用能力，而不是定义 Workbench 产品边界。

参考流程可以覆盖：

1. 查询可用无人机与无人车；
2. 查看公开 Tool Call / Tool Result；
3. 生成多个巡防候选方案；
4. 使用 Generative UI 比较方案；
5. 使用地图等 Frontend Action 辅助查看；
6. 生成任务草稿；
7. 用户确认高风险操作；
8. Runtime Host 接纳 Command 后恢复 Business Agent；
9. 展示成功、失败或 `indeterminate` 状态；
10. 通过 Inspect 定位完整链路问题。

智慧安防专用组件、Action 和示例数据应通过 Scenario Package 扩展。

Workbench Core、Runtime Kernel 和 UI Compiler Core 不应包含智慧安防专用业务判断。

---

## Appendix B - Decision Provenance

本附录记录本规格对 [Issue #173 决策地图](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/173) 的收敛位置。

这些 Issue 是决策来源和历史记录，不在本规格之外形成第二份并行 SRS。

| 决策来源 | 收敛位置 | 处理结果 |
|---|---|---|
| [#174 Conversation-first 信息架构](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/174) | §2、§3.1 | 顶栏工具导航、纯会话侧栏、纯对话流、Inline Business Surface、异常状态和独立 Inspect 已纳入；Historical Action Authority 按 ADR-0024 澄清。 |
| [#175 Turn、Operation 与 Surface 生命周期](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/175) | §1.7、§2.4、§2.5、§3.4、§4.1、A2-A5 | 保留 Turn 可关联多个 Operation、不可变 Presentation、正交状态与安全交互结果；Run-centric 权威语义由 ADR-0024 取代。 |
| [#176 SRS 验收边界与需求追踪](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/176) | 全文、§1.7、§1.8、§5、Appendix C | 保留五类 MVP Gate、Release Invariants、六个黑盒 Acceptance Scenario 和旧需求追踪。 |
| [#177 Turn Diagnostic Record](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/177) | §2.7、§3.5 | 保留服务端统一聚合、独立 Inspect 状态、完整视图加实时增量、sequence / revision 和分级 Artifact 读取；聚合必须以 Runtime Repository Truth 加 Diagnostic Projection 为源。 |
| [#178 兼容迁移](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/178) | §4.6、Appendix C | 保留显式版本、不兼容数据不静默转换和旧模型不得形成并行权威来源；具体删除和迁移属于实施范围。 |
| [#179 Execution Map 原型](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/179) | §3.5、A6 | 采用六职责边界泳道时间线、Artifact 粒度详情、公开 JSON 直通和 sequence 缺口表达。 |
| [#180 Artifact 资源与性能预算](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/180) | §3.5、§4.5、A6 | 保留完整可访问、禁止静默截断、不可变 Artifact、保护阈值、墓碑元数据、可取消加载和 Viewer 故障隔离。 |
| [#181 历史恢复与兼容语义](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/181) | §3.1、§4.1、§4.4、§4.6、A4 | 恢复顺序收敛为 Runtime Repository first；Checkpoint 只影响继续执行，重启不自动重放，不兼容 Snapshot 只读降级。 |
| [#182 诊断披露与持久化边界](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/182) | §3.2、§3.5、§4.2、§4.3、A6 | 保留公开过程事件、数据披露、Artifact、best-effort Diagnostics 和 Diagnostic Bundle；Diagnostic Store 的恢复权威语义由 ADR-0024 取代。 |
| [#185 Business Agent 接入边界](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/185) 与 ADR-0025 | §1.3、§1.10、§3.2、§3.3、§3.4 | Workbench 明确验证 Agent Runtime Integration；最终 AgentContent、显式 InteractionRequest、过程事件直投影和结构化结果一次性进入 Presentation Pipeline 已纳入。 |

## Appendix C - Legacy Requirement Traceability

本附录把 0.3 规格中的需求编号映射到 0.5 规格。

旧编号仅用于追踪，不重新引入已经被 ADR-0024 或当前范围取代的语义。

| 0.3 需求 | 主题 | 0.5 对应位置 | 状态 |
|---|---|---|---|
| BR-001 | 完整链路验证 | §1.2、§1.7、A1-A6 | 保留并收敛为五类 MVP Gate。 |
| BR-002 | 统一联调入口 | §1.3、§2、§3.1、§3.2、A1 | 保留。 |
| BR-003 | 实时可观察 | §3.2、§3.5、A1、A6 | 保留，诊断权威语义按 ADR-0024 修正。 |
| BR-004 | 历史可恢复 | §3.1、§4.1、§4.4、§4.6、A4 | 保留，恢复改为 Runtime Repository first。 |
| BR-005 | 可定位 | §2.6、§2.7、§3.5、A6 | 保留并具体化为泳道时间线与 Artifact Detail。 |
| BR-006 | 完整 Artifact | §3.5、§4.5、A6 | 保留。 |
| BR-007 | 业务价值验证 | Appendix A | 保留为非规范 Reference Scenario，不作为独立产品边界。 |
| BR-008 | 领域解耦 | §3.3、§3.6、Appendix A、A6 | 保留。 |
| BR-009 | 可发布运行 | §3.6、MVP 完成条件 | 保留。 |
| UR-001 - UR-003 | 平台与 Agent 开发调查 | §1.4、§3.2、§3.3、§3.5、A1、A6 | 保留。 |
| UR-004 | Catalog 验证 | §3.6 | 保留为 Supporting Capability。 |
| UR-005 - UR-006 | 历史问题与大型对象查看 | §3.1、§3.5、§4.4、§4.5、A4、A6 | 保留。 |
| UR-007 | 诊断导出 | §3.5、A6 | 保留为 MVP Diagnostic Bundle。 |
| UR-008 | 架构边界确认 | §0.2、§1.6、§3、§4.1、A6 | 保留。 |
| UR-009 | 参考场景验证 | Appendix A | 保留为非规范场景。 |
| FR-001 - FR-004 | Runtime Host、AG-UI、运行控制与公开事件 | §3.2、A1 | 保留。 |
| FR-005 - FR-008 | Markdown、A2UI 与 Component Registry | §3.3、§4.3、A1、A6 | 保留。 |
| FR-009 - FR-011 | Frontend Action、Command 与 Confirmation | §3.4、A2、A3 | 保留并按 ADR-0024 修正 Command Admission。 |
| FR-012 | 运行状态 | §2.6、§3.4、§4.4、A2-A5 | 保留为正交状态投影。 |
| FR-013 | Debug Conversation | §2.1-§2.4、§3.1、A1、A4 | 保留。 |
| FR-014 - FR-017 | Turn Inspect、Artifact、Renderer 诊断与断线补偿 | §2.7、§3.5、§4.2、§4.4、A6 | 保留，Event Replay 只补充诊断时间线。 |
| FR-018 | Diagnostic Bundle Export | §3.5、A6 | 保留为 MVP。 |
| FR-019 - FR-020 | Catalog 与 Scenario Package | §3.6、Appendix A | 保留为 Supporting Capability。 |
| FR-021 - FR-022 | 环境配置与可部署网站 | §3.6、MVP 完成条件 | 保留。 |
| IR-001 - IR-002 | AG-UI 与普通 REST | §3.2、§3.5、§3.6 | 保留。 |
| IR-003 | Runtime Host 与 Business Agent | §3.2、§3.4、§4.1 | 保留并按 ADR-0025 收敛为 Agent Runtime Integration。 |
| IR-004 | Runtime Host 与 Presentation Pipeline | §3.2、§3.3、§4.2 | 保留，只有最终 AgentContent 进入 Presentation Pipeline。 |
| IR-005 | Renderer 与 Registry | §3.3、§3.4、§4.3 | 保留。 |
| IR-006 | Artifact 读取 | §3.5、§4.5、A6 | 保留。 |
| DR-001 - DR-006 | Contract、事件、Artifact 与披露 | §0.2、§3.5、§4.2、§4.3、§4.5 | 保留，精确 Schema 委托 Runtime / Diagnostic Contract。 |
| DR-007 | 历史权威来源 | §4.1、§4.2、§4.4、A4 | 原 Diagnostic Store 权威语义被 ADR-0024 取代；Runtime Repository 是恢复权威。 |
| DR-008 | 版本信息 | §3.5、§4.6、A6 | 保留。 |
| NFR-SEC-001 | 安全性 | §1.8、§4.3、A6 | 保留。 |
| NFR-REL-001 | 可靠性 | §4.2、§4.4、A2-A5 | 保留。 |
| NFR-OBS-001 | 可观察性 | §3.5、A6 | 保留。 |
| NFR-PERF-001、NFR-STORAGE-001 | 性能与存储保护 | §3.5、§4.5、A6 | 保留，固定阈值留给实测和部署配置。 |
| NFR-EXT-001、NFR-MAINT-001 | 可扩展性与可维护性 | §0.2、§1.6、§3.6、Appendix A | 保留为边界约束。 |
| NFR-TEST-001 | 可测试性 | §5、MVP 完成条件 | 保留为黑盒验收。 |
| NFR-DEPLOY-001 | 可部署性 | §3.6、MVP 完成条件 | 保留。 |
| NFR-USABILITY-001 | 易用性 | §2、A1、A6 | 保留并具体化为 Conversation-first 与按需 Inspect。 |
| NFR-COMP-001 | 兼容性 | §4.6、§4.7、A4 | 保留并区分 Contract / Snapshot 与浏览器兼容。 |
| AC-001 - AC-017 | 架构和实现约束 | §0.2、§1.6、§3、§4 | 产品可观察约束保留；内部算法和 Schema 委托 Canonical Sources。 |
| AR-001 | 可部署 | §3.6、MVP 完成条件 | 由部署完成条件覆盖。 |
| AR-002 - AR-007 | AG-UI、公开事件、Presentation、Action 与 Confirmation | A1-A3 | 合并为端到端黑盒场景。 |
| AR-008 | Debug Conversation | A1、A4 | 保留。 |
| AR-009 - AR-010 | Turn Inspect 与 Artifact | A6 | 保留并加强。 |
| AR-011 | 断线补偿 | A4、A6 | 保留诊断补偿，删除 Event Replay 覆盖 Runtime Truth 的旧语义。 |
| AR-012 | Diagnostic Bundle | A6 | 保留。 |
| AR-013 | 智慧安防闭环 | Appendix A | 降为非规范 Reference Scenario，不单独决定 MVP。 |
| AR-014 | 职责边界 | §1.8、A6 | 保留。 |

---

## MVP 完成条件

仅当以下条件全部满足时，才能认为 Workbench MVP 达到本规格：

1. §1.7 五类 MVP 核心能力均已实现；
2. §1.8 Release Invariants 全部满足；
3. §5 六个 Acceptance Scenario 全部通过；
4. 不存在已知的 Workbench 绕过 Runtime Host 权威状态的问题；
5. 不存在会导致重复高风险业务副作用的前端交互缺陷；
6. Runtime Host 重启后 Workbench 能恢复正确的当前交互体验；
7. Diagnostic failure 不会让 Workbench 错误改写 Runtime / Business 结果；
8. Workbench 可以独立构建并部署。
