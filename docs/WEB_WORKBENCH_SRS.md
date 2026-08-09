# Generative UI Workbench Specification

**文档版本：** 0.4-draft  
**项目阶段：** MVP 规格收敛  
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

# 0. 文档边界与权威来源

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
| Runtime Truth Model 与安全 Command Admission | `docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md` |
| 当前平台架构 | `docs/platform/ARCHITECTURE.md` |
| 平台级 MUST / MUST NOT | `docs/platform/REQUIREMENTS.md` |
| 旧 Runtime 模型迁移 | `docs/platform/RUNTIME_TRUTH_MIGRATION.md` |
| Runtime / Diagnostic 数据结构与 Schema | `packages/runtime-contract` 及对应 Contract |
| UI Compiler 内部设计 | `docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md` |
| 实施顺序、优先级与任务拆分 | Goal / Task / Issue |

当本文与更高层 Runtime / Platform 权威文档冲突时，本文不得自行重新定义 Runtime 语义，应修正 Workbench 行为以符合当前平台规则。

---

# 1. 产品背景、目的与范围

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
- 大型 Artifact 能安全、有界查看。

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
- Conversation 重命名、归档、删除、排序和 Archived 分组等管理体验；
- Diagnostic Bundle Export；
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
- 多租户、计费和细粒度诊断权限；
- Interaction Gateway；
- 多 Business Agent 自动路由。

---

# 2. 产品体验与信息架构

## 2.1 Conversation-first

Workbench 默认采用 Conversation-first 外壳：

```text
Conversation Sidebar
└── Debug Conversations

Conversation Flow
├── User Message
├── Agent Message / Public Activity
├── Markdown Result
└── Inline Business Surface

Supporting Developer Tools（可选）
├── Catalog
├── Scenarios
└── Settings
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
- 跨刷新恢复。

Conversation Sidebar SHOULD 支持：

- 重命名；
- 归档；
- 删除入口；
- 最近活跃排序；
- Archived 分组。

Sidebar 保持单一职责，不承载 Catalog、Scenario 或全局 Inspect 工具。

## 2.4 Conversation Flow

主区域应保持自然对话体验：

- 用户消息使用明确的用户消息视觉；
- Assistant 文本直接进入对话流；
- Business Surface 内联在对应 Turn 中；
- 不为每个 Turn 强制添加大型调试卡片；
- completed 默认不增加额外状态噪音；
- running、degraded、failed、indeterminate 等进行中或异常状态必须可见。

## 2.5 Inline Business Surface

Business Surface 是业务展示内容，而不是调试容器。

Workbench MUST：

- 在 Conversation Flow 中内联展示 Surface；
- 通过受控组件集合渲染 A2UI；
- 使用 Runtime Host 返回的 Surface 状态决定当前交互能力；
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

Inspect 不应作为 Conversation Flow 的常驻复杂面板。

## 2.8 Supporting Developer Tools

Catalog、Scenarios、Settings MAY 作为顶级 Developer Tools 提供，用于提高扩展验证和环境配置效率。

这些页面不属于 MVP Release Gate；缺失时不得阻止 Conversation、Presentation、Safe Interaction、Recovery 和 Inspect 五类核心能力的验收。

Cases 不属于当前 MVP 信息架构。

---

# 3. Workbench 核心能力与外部契约

## 3.1 C1 — Conversation

Workbench MUST 支持：

- New Conversation；
- 多 Turn 交互；
- Conversation List；
- 打开历史 Conversation；
- 页面刷新后的恢复；
- Runtime Host 重启后的恢复体验。

Workbench SHOULD 支持：

- 重命名；
- 归档；
- 删除入口；
- 最近活跃排序；
- Archived 分组。

打开历史 Conversation 本身 MUST NOT 创建新的执行、重复原业务副作用或把历史内容静默变成当前交互状态。

## 3.2 C2 — Agent Interaction

Workbench 的 Agent 交互 MUST 使用 Runtime Host 提供的 AG-UI 入口。

当前参考实现使用 CopilotKit Runtime 的 HTTP POST + SSE。

Workbench MUST：

- 发送用户消息；
- 接收公开实时事件；
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

## 3.3 C3 — Presentation

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

具体 Presentation Pipeline 与 UI Compiler Core 语义见平台架构和 Compiler 文档。

## 3.4 C4 — User Interaction

Workbench 负责表达用户意图，不拥有 Command Admission 权威。

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

## 3.5 C5 — Inspect & Artifact

Inspect 的目标是：

> 让开发者快速回答“问题发生在哪一层、哪一步、输入输出是什么、是否存在诊断缺口”。

Inspect 应围绕以下稳定职责边界组织：

- Workbench；
- Agent Runtime Host；
- Business Agent Adapter；
- Business Agent；
- Presentation Pipeline；
- UI Compiler Core。

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

对于正式公开契约边界上的输入输出，Workbench SHOULD 优先展示平台实际提供的原始结构化 Artifact，而不是把它重新解释成另一份业务事实。

只有在 Artifact 不可披露、超过保护限制、尚未加载或只能以 storage reference 提供时，才使用摘要或占位信息作为兜底。

具体 Event / Artifact 字段由 Runtime / Diagnostic Contract 定义，本文不复制 Schema。

### 大型 Artifact

MVP Release Gate 要求：

- 先显示 metadata；
- 至少能看到大小、hash、persistence status 等必要信息；
- 大对象不默认一次性加载和渲染；
- 超保护限制或保存失败必须有明确状态；
- Artifact / Diagnostic failure 不得导致已成功的业务结果在 UI 中被伪装成业务失败。

完整多后端 Object Storage、高级搜索和流式导出属于 Supporting Capability。

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

# 4. Cross-cutting Constraints

## 4.1 Authority Consistency

Workbench MUST 以 Runtime Host 返回的当前交互状态为准。

Workbench MUST NOT 从以下信息反推出新的 Runtime Truth：

- 浏览器内存；
- 历史 A2UI；
- 单独 Diagnostic Event；
- 旧 `runId`；
- 本地 optimistic state。

Runtime Truth 与 Diagnostic Projection 的完整语义由平台权威文档定义。

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
- 对 stale / duplicate / rejected Command 给出可理解反馈。

## 4.5 Performance Principles

MVP 不在本文规定脱离测试环境的固定“3 秒 / 500ms”硬指标。

必须满足以下架构级原则：

- 实时 UI 不等待 Diagnostic Persistence；
- 大型 Artifact 不默认完整加载；
- Inspect 不阻塞 Conversation 主流程；
- 大列表使用分页、虚拟化或其他有界策略；
- 大文本 / 文件使用范围读取、分段或流式策略。

具体 P95 / P99 指标由独立 Performance Goal 在明确测试环境后定义。

## 4.6 Compatibility

MVP 优先验证：

- Chrome 最新稳定版本；
- Edge 最新稳定版本；
- Windows 11 开发测试环境。

---

# 5. MVP Acceptance

MVP 验收采用少量黑盒场景验证产品结果，不在本文验证 Runtime Kernel 的具体内部算法。

## A1 — Conversation & Presentation

**Given** Workbench 已连接 Runtime Host。  
**When** 用户连续发送多轮消息，并分别得到 Markdown 与 Generative UI 结果。  
**Then**：

- Conversation 正常形成多轮历史；
- 公开过程信息可见；
- Markdown 安全渲染；
- 合法 Generative UI 正常渲染；
- Inline Surface 位于 Conversation Flow；
- 页面刷新后 Conversation 可重新打开；
- 仅打开历史 Conversation 不会产生新的执行或业务副作用。

## A2 — Interactive Surface Safety

**Given** 当前存在一个可执行 Surface。  
**When** 分别发生正常提交、重复提交、stale revision，以及对 Historical Surface 尝试执行旧业务 Action。  
**Then**：

- 正常提交得到明确的接纳或拒绝结果；
- duplicate 不产生重复业务执行或副作用；
- stale 被明确拒绝或要求刷新；
- Historical Surface 仍可查看和执行纯 Local UI Interaction；
- Historical Surface 的旧 Runtime / Business Action 不得直接重放；
- 若需要再次执行，必须进入新的、经 Runtime Host 重新校验的当前交互上下文。

## A3 — Confirmation & Side-effect Boundary

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

## A4 — Restart Recovery

**Given** 已存在多 Turn Conversation、Presentation 与交互状态。  
**When** Runtime Host 完全停止后重新启动。  
**Then**：

- Workbench 能重新打开 Conversation；
- 当前交互状态与 Runtime Host 恢复结果一致；
- 不重新执行历史业务请求；
- 即使部分诊断历史不可用，也只显示诊断不完整，不改变当前交互状态。

## A5 — Indeterminate & Reconcile

**Given** 某次操作可能已经触发业务副作用。  
**When** 因连接或协议中断无法确认最终结果。  
**Then**：

- Workbench 明确显示 `indeterminate` 或等价“结果未知”状态；
- 不将其伪装成普通 failed；
- 不提供盲目重复执行旧业务 Action 的路径；
- 用户可以进入平台定义的 Reconcile / 恢复流程；
- Reconcile 完成后展示确定结果。

## A6 — Inspect, Failure Isolation & Security

**Given** 一个 Turn 同时存在诊断缺口、大型 Artifact、Artifact 保存失败和不安全内容。  
**When** 用户进入 Inspect。  
**Then**：

- 能定位主要职责边界与 Operation；
- 能看到顺序、阶段、耗时、错误和可披露 Artifact；
- 诊断缺口被明确标识；
- 大型 Artifact 不默认完整加载；
- Artifact 保存失败被明确显示；
- 诊断故障不把正常业务结果改写成失败；
- 未允许的 Component / Action 不执行；
- 危险 Markdown 被安全处理；
- 平台禁止披露的数据不出现在 Workbench。

---

# Appendix A — Reference Scenario（非规范性）

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

# MVP 完成条件

仅当以下条件全部满足时，才能认为 Workbench MVP 达到本规格：

1. §1.7 五类 MVP 核心能力均已实现；
2. §1.8 Release Invariants 全部满足；
3. §5 六个 Acceptance Scenario 全部通过；
4. 不存在已知的 Workbench 绕过 Runtime Host 权威状态的问题；
5. 不存在会导致重复高风险业务副作用的前端交互缺陷；
6. Runtime Host 重启后 Workbench 能恢复正确的当前交互体验；
7. Diagnostic failure 不会让 Workbench 错误改写 Runtime / Business 结果；
8. Workbench 可以独立构建并部署。