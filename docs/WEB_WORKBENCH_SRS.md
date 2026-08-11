# Generative UI Workbench Specification

**文档版本：** 0.7

**项目阶段：** Presentation-first MVP

**所属项目：** Generative UI Platform

**产品名称：** Generative UI Workbench

**中文名称：** 生成式 UI 开发与验证工作台

## 0. 文档规则

本文定义 Workbench 当前产品行为、用户任务和 MVP Release Gate。
当前阶段范围以 ADR-0027 为准。

约束词：

- **MUST / 必须**：MVP 不可缺少；
- **MUST NOT / 禁止**：不得形成的行为或依赖；
- **SHOULD / 应该**：默认应满足，偏离需要明确理由；
- **MAY / 可以**：可选或 Supporting 能力。

Canonical Sources：

| 主题 | 权威来源 |
|---|---|
| 当前阶段范围 | ADR-0027 |
| 平台级 MUST / MUST NOT | `docs/platform/REQUIREMENTS.md` |
| 平台跨子系统架构 | `docs/platform/ARCHITECTURE.md` |
| Router / Model Adapter | ADR-0015 |
| Compiler Trust Boundary | Compiler ADR、`docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md` |
| Presentation / Runtime 两种接入模式 | ADR-0025 |
| Existing Runtime Interaction Safety | ADR-0024 |
| 当前 Workbench ↔ Runtime Host Agent 协议 | ADR-0026 |

本文不得重新定义 Runtime Truth、Compiler Schema 或 Business Agent 私有状态。

## 1. 产品定位

Generative UI Workbench 当前定位为：

> **Generative UI Lab / 真实 Agent 驱动的可视化开发调试工作台。**

Workbench 的首要任务是通过真实自然语言 Conversation 驱动 Business Agent，然后观察平台如何把最终 AgentContent 自动转换成 Presentation。

它需要回答：

> 用户问了什么？Business Agent 最终产生了什么业务内容？Presentation Pipeline 为什么选择这种展示？UI Plan 是否可信地通过 Compiler？最终 UI 是否正确、稳定且受控？

Workbench 是开发者产品，不是最终业务生产前端。

## 2. 第一原则：主输入是自然语言，不是 AgentContent

Workbench MVP 的核心用户流程 MUST 是：

```text
User enters natural language
        ↓
Real / Reference Business Agent runs
        ↓
Final AgentContent is produced
        ↓
Presentation Pipeline runs automatically
        ↓
Markdown or Generative UI is rendered
```

Workbench MUST NOT 把以下流程定义成当前主产品体验：

```text
Developer pastes AgentContent JSON
→ Generate UI
```

AgentContent 是系统边界和可观察对象。
开发者可以在 Inspect 中查看它，但不需要手工制造它。

单元测试、Fixture、专用 Test Harness MAY 直接构造 AgentContent，以保证 Core 可以确定性测试。

## 3. 当前核心用户

Workbench 主要服务：

- Presentation Pipeline 开发者；
- UI Compiler Core 开发者；
- Component Catalog / Renderer 开发者；
- Theme / Design System 开发者；
- Presentation Model / Prompt 调试人员；
- Business Agent 集成人员；
- 测试人员；
- 架构师和产品负责人。

## 4. 核心用户任务

### T1 进行真实 Agent Conversation

用户 MUST 能够：

- 输入自然语言；
- 发送消息到当前 Reference Agent Integration；
- 看到 Business Agent 主动公开的消息、进度、状态或 Tool Activity 摘要；
- 看到 Business Agent 最终业务结果自动进入 Presentation；
- 不需要理解或输入 A2UI、UI Plan 或 AgentContent Contract。

Business Agent 公开过程信息与最终 AgentContent 必须被区分。
过程事件不应被误当成最终 Presentation 输入。

### T2 查看最终 Presentation

Business Agent 产生 Final AgentContent 后，Workbench MUST 自动展示 Presentation Pipeline 的最终结果。

可能结果：

- safe Markdown；
- trusted Generative UI；
- explicit fallback / error。

Workbench MUST NOT 自己重新调用一个模型生成第二份 UI Plan。

### T3 Inspect Final AgentContent

开发者 MUST 能从最终 Presentation 打开 Inspect，并查看 Presentation Pipeline 实际消费的 Final AgentContent。

必须清楚区分：

```text
Business Agent public process events
≠
Final AgentContent
≠
Presentation Decision
≠
UI Plan Candidate
≠
trusted A2UI
```

AgentContent Viewer 应只读、有长度保护，并遵守平台敏感数据边界。

### T4 Inspect Presentation Decision

Workbench MUST 展示：

- `markdown | generative-ui` Decision；
- decision reason 或等价安全开发摘要；
- 是否经过 deterministic Router path；
- 是否调用 Presentation Model；
- Theme / Catalog / Viewport 等受控 Presentation Context 标识。

Workbench 不得假设：

```text
Markdown input => Markdown output
Structured input => Generative UI output
```

具体 Router 语义以 ADR-0015 为准。

### T5 Inspect UI Plan Candidate

仅当 Decision 为 `generative-ui` 时，Workbench MUST 能查看 UI Plan Candidate。

UI 必须明确标记：

> **UI Plan Candidate is untrusted.**

至少应能够理解：

- 模型建议的语义区域；
- 组件能力偏好；
- 数据绑定意图；
- 布局约束；
- Action Descriptor 意图（如适用）。

### T6 Inspect Compiler / Validation

Workbench MUST 能查看：

- Schema Validation；
- Catalog Validation；
- Props Validation；
- Binding Validation；
- Action / Policy Validation；
- Compiler rejection / fallback reason；
- 最终可信输出状态。

Compiler rejection 不得被隐藏成普通空白 UI。

### T7 Inspect trusted A2UI

Generative UI 成功时，Workbench MUST 能只读查看最终 trusted A2UI。

Raw Viewer 必须：

- 只读；
- 有长度和性能保护；
- 不执行任意代码；
- 清楚区分 trusted A2UI 与原始 UI Plan Candidate。

### T8 查看最终 Rendered UI

Workbench MUST 使用受控 Renderer 展示 Presentation。

Renderer 只允许 Component Registry 中已注册实现。

Renderer MUST NOT：

- 执行模型生成 JavaScript；
- 执行任意 HTML；
- 动态加载模型指定的未知远程组件；
- 绕过 Component Catalog / Registry。

### T9 Theme / Presentation Context 调试

Workbench SHOULD 支持受控 Theme / Presentation Context 调试。

Theme MAY 影响：

- visual tokens；
- typography；
- spacing；
- density；
- layout preferences；
- Catalog 已授权的 component variants。

Theme MUST NOT：

- 改变 Business Truth；
- 增加或删除 Catalog capability；
- 授权新的业务 Action；
- 绕过 Compiler Policy。

Catalog 与 Theme 必须分别表达。

### T10 基础 Reliability 验证

Workbench SHOULD 能复现至少以下场景：

- 合法 Presentation Decision；
- 非法 Component；
- 非法 Props；
- 无效 Binding；
- 不允许的 Action；
- Model timeout / invalid candidate；
- Compiler rejection；
- Markdown fallback；
- Renderer failure boundary；
- 同一输入的基础重复生成验证。

当前不要求 Presentation Quality 自动评分或完整实验平台。

## 5. 当前信息架构

推荐产品心智：

```text
Workbench
├── Conversation
│   ├── User Message
│   ├── Agent Public Activity
│   ├── Final Markdown Result
│   └── Generated UI
│         └── Inspect Presentation
│
├── Presentation Inspect
│   ├── AgentContent
│   ├── Presentation Decision
│   ├── UI Plan Candidate
│   ├── Validation / Compiler Result
│   ├── trusted A2UI
│   └── Rendered UI
│
├── Theme / Context
├── Catalog
└── Reliability / Reference Scenarios
```

真实 Conversation 是主体验。
Presentation Inspect 是开发调试体验。

## 6. Conversation 当前边界

### 6.1 当前必须保留

真实 Agent Conversation 属于当前 Supporting Core Experience。

Workbench MUST 支持足以完成以下主链路的 Conversation：

```text
Natural Language
→ Agent
→ AgentContent
→ Presentation
```

这意味着至少包括：

- 用户输入；
- Assistant / Agent 公开输出；
- 公开过程 Activity；
- 最终 Presentation；
- 基本 running / failed / cancelled 等当前交互反馈。

### 6.2 当前 Deferred

以下属于完整 Conversation / Runtime Platform，不是当前 MVP Release Gate：

- Runtime-owned long-term Conversation History；
- Rename；
- Archive；
- Delete；
- Clear all history；
- Runtime Host restart recovery；
- Thread / Turn / Operation 产品浏览；
- Historical Surface Action Authority；
- Recovery / Reconcile 产品化；
- 完整 Conversation Service。

已有实现 MAY 保留，但不得因为已存在就继续扩大产品范围。

## 7. Supporting Agent Integration

当前 Reference Path 可以继续使用：

```text
Workbench
   │ AG-UI
   │ HTTP POST + SSE
   ▼
Reference Integration Host
   │ private Business Agent Adapter
   ▼
Business Agent
```

这条路径用于产生真实 AgentContent。

Workbench MUST NOT：

- 直接连接 Business Agent 私有地址；
- 持有 Business Agent 私有凭据；
- 持有 Presentation Model Provider 密钥；
- 维护与当前 AG-UI reference path 并列的第二套 Agent 业务协议。

CopilotKit / AG-UI 属于 Supporting Integration。
未来替换 CopilotKit 时，Workbench 的 `Conversation → Presentation Inspect` 产品心智不应变化。

## 8. Workbench 与 Core 的职责边界

Workbench 可以：

- 表达用户自然语言意图；
- 显示 Agent public activity；
- 显示最终 Presentation；
- 选择受控 Theme / Context；
- 展示开发诊断信息；
- 渲染 trusted Presentation。

Workbench MUST NOT：

- 重新解释 Business Truth；
- 自己生成第二份 UI Plan；
- 绕过 Presentation Router / Pipeline；
- 绕过 UI Compiler Core；
- 把原始 UI Plan 当作 trusted A2UI；
- 动态执行模型生成代码；
- 把浏览器状态变成 Runtime Truth。

## 9. Supporting Developer Tools

当前方向允许：

- Component Catalog Browser；
- Component Playground；
- Theme Preview / Editor；
- Viewport Preview；
- Reference Scenarios；
- Prompt / Model Config 开发预览；
- Generation timing；
- Token / cost 摘要；
- Compiler error explorer；
- Presentation Result export。

准入标准：

> 直接提高真实 Agent → Generative UI 链路的调试、可靠性或开发效率。

当前不要求完整 A/B Experiment / Regression Management 平台。

## 10. 非目标

Workbench 当前不是：

- AgentContent JSON Playground；
- Business Agent；
- Agent Runtime Platform；
- 多 Agent Gateway；
- Business Agent 私有状态管理器；
- Runtime Repository 管理台；
- 完整 Observability Platform；
- 完整 Conversation Management 产品；
- 正式业务生产前端；
- 任意前端代码生成器；
- Presentation Quality 自动评分系统；
- 完整实验管理系统。

## 11. MVP Release Gate

### G1 Real Conversation

- 用户可以输入自然语言；
- Reference / Real Business Agent 可以执行；
- public process activity 与 Final AgentContent 清楚区分；
- 用户不需要输入 AgentContent / UI Plan / A2UI。

### G2 Presentation Trace

从真实 Conversation 产生的 Presentation 可以追溯：

- AgentContent；
- Presentation Decision；
- UI Plan Candidate（如适用）；
- Validation / Compiler Result；
- trusted A2UI（如适用）。

### G3 Render

- Markdown 安全展示；
- trusted A2UI 使用受控组件稳定渲染；
- fallback / error 状态清楚；
- 不执行任意模型生成代码。

### G4 Router Consistency

- Workbench 不根据 content type 猜测 presentation mode；
- Router / Model 调用情况可以观察；
- Presentation Decision 与 ADR-0015 一致。

### G5 Theme / Catalog Boundary

- Theme 与 Catalog capability authority 分离；
- Theme 不改变 Business Truth；
- Theme 不授权新的 Component / Action 能力。

### G6 Reliability

- 可以复现合法、非法、fallback 和基础重复生成场景；
- 可以定位问题发生在 AgentContent、Router / Model、Compiler 或 Renderer。

### G7 Framework Independence

- Workbench 当前可通过 CopilotKit / AG-UI reference path 获得真实 AgentContent；
- Presentation Core 不因 CopilotKit 替换而改变语义。

## 12. 迁移原则

当前代码已经包含 Conversation History、Inspect、Cases、Runtime 状态和 compatibility paths。

迁移顺序：

1. 保留真实 Agent Conversation；
2. 停止新增长期 Conversation / Runtime Platform 功能；
3. 保持 `Conversation → AgentContent → Presentation` 可运行；
4. 将 Inspect 聚焦到 Presentation Trace；
5. 建设 Theme / Catalog / Reliability 开发能力；
6. 后续通过独立 Issue 判断旧 Runtime 页面保留、隐藏、隔离还是删除。

本 SRS 不要求本次文档 PR 同时完成代码重构。