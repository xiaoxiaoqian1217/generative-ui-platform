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

本文是 Generative UI Workbench 的产品合同，只回答四个问题：

1. Workbench 是什么；
2. 用户可以用它做什么；
3. Workbench 必须遵守哪些平台边界；
4. 什么情况下可以认为 MVP 完成。

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

# 1. 产品定位与 MVP 范围

## 1.1 产品定位

Generative UI Workbench 是：

> Generative UI Platform 的官方 Frontend Runtime 参考实现，以及面向 Agent Runtime Host 的开发、联调、运行验证和逐 Turn 诊断工作台。

Workbench 的价值不是复制 Runtime 或 Business Agent，而是让开发者能够在一个统一 Web 环境中完成：

- 与 Business Agent 进行多轮交互；
- 查看 Business Agent 主动公开的运行过程；
- 查看 Markdown 或 Generative UI Presentation；
- 操作受控 Interactive Surface；
- 在刷新或 Runtime Host 重启后恢复 Conversation；
- 定位某个 Turn / Operation 的问题；
- 判断问题属于 Agent、Presentation、Compiler、Renderer、Action 还是 Diagnostic 层。

## 1.2 Workbench 不是什么

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

## 1.3 MVP 核心能力

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

## 1.4 Release Invariants

以下不是独立功能模块，而是所有 MVP 能力都必须满足的发布底线：

- 不执行任意模型生成代码；
- 只允许受控组件和受控 Action；
- Markdown 必须安全处理；
- 平台禁止披露的数据不得进入 Workbench；
- Diagnostic failure 不得把已确定的 Runtime / Business 结果伪装成业务失败；
- Workbench 不得从本地缓存、历史 A2UI、Diagnostic Event 或旧 `runId` 推导新的 Runtime Truth；
- Workbench 必须能够独立构建和部署。

## 1.5 Supporting Capability

以下能力允许在 MVP 周边建设，但不阻塞 MVP Release：

- Diagnostic Bundle Export；
- 完整 Object Storage / 多后端 Artifact Storage Router；
- JSON Path 搜索；
- 高级流式读取和流式导出；
- 超大型数组高级虚拟化；
- 运行统计和链路性能分析；
- 外部 Trace 系统关联。

## 1.6 Post-MVP

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
Top Navigation
├── Catalog
├── Scenarios
└── Settings

Conversation Sidebar
└── Debug Conversations

Conversation Flow
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

Conversation Sidebar 至少支持：

- 创建；
- 打开；
- 重命名；
- 归档；
- 删除入口；
- 最近活跃排序；
- Archived 分组；
- 跨刷新恢复。

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

## 2.8 Tool Pages

MVP 顶级工具页：

- Catalog；
- Scenarios；
- Settings。

Cases 不属于当前 MVP 信息架构。

---

# 3. Workbench 核心能力与外部契约

## 3.1 C1 — Conversation

Workbench MUST 支持：

- New Conversation；
- 多 Turn 交互；
- Conversation List；
- 打开历史 Conversation；
- 重命名；
- 归档；
- 删除入口；
- 页面刷新后的恢复；
- Runtime Host 重启后的恢复体验。

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

## 3.6 C6 — Tools & Deployment

### Catalog

Catalog 应至少提供：

- Component Name；
- Version；
- Props Schema；
- Action Definition；
- Example Data；
- Render Preview；
- Availability。

### Scenarios

Scenario 页面用于浏览和启动通用或领域 Reference Scenario。

领域能力通过 Scenario Package 扩展，不进入 Workbench Core 或 UI Compiler Core 的业务判断。

### Settings

Settings 至少可以配置：

- Runtime Host 地址；
- Scenario；
- 请求相关前端配置；
- Debug / Artifact 查看相关非敏感配置。

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

1. §1.3 五类 MVP 核心能力均已实现；
2. §1.4 Release Invariants 全部满足；
3. §5 六个 Acceptance Scenario 全部通过；
4. 不存在已知的 Workbench 绕过 Runtime Host 权威状态的问题；
5. 不存在会导致重复高风险业务副作用的前端交互缺陷；
6. Runtime Host 重启后 Workbench 能恢复正确的当前交互体验；
7. Diagnostic failure 不会让 Workbench 错误改写 Runtime / Business 结果；
8. Workbench 可以独立构建并部署。
