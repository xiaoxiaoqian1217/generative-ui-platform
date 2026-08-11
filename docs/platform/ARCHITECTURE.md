# Generative UI Platform 平台级架构

本文描述 ADR-0027 下的当前跨子系统关系。
Compiler 内部架构继续以 `docs/ARCHITECTURE.md`、`docs/Generative_UI_Compiler_Design.md` 和 Compiler ADR 为准。

## 1. 架构原则

当前架构从最短产品价值链出发：

1. **Business Agent 拥有 Business Truth。**
2. **真实 Agent Conversation 产生 AgentContent。**
3. **Presentation Router 决定展示模式。**
4. **Presentation Model 只负责展示智能，不拥有最终 UI 权威。**
5. **UI Compiler Core 是 trusted A2UI 的唯一生产者。**
6. **Component Catalog 拥有 capability authority。**
7. **Theme 只影响视觉表达，不改变 capability authority。**
8. **Workbench 是真实 Agent 驱动的 Generative UI Lab。**
9. **CopilotKit / AG-UI / Transport 属于 Supporting Integration。**
10. **完整 Runtime Platform 当前 Deferred。**

## 2. 当前端到端主链路

```text
User
 │ natural language
 ▼
Generative UI Workbench
 │ current Agent integration
 ▼
Reference Integration Host
 │
 ├── CopilotKit / AG-UI Adapter
 │
 └── Business Agent Adapter
          │ private protocol
          ▼
     Business Agent
          │
          │ public process events
          └──────────────→ Workbench / Agent UI projection
          │
          │ Final AgentContent
          ▼
  Presentation Pipeline
          │
          ▼
  sanitize / validate
          │
          ▼
  Presentation Router
      ├── deterministic decision
      └── semantic analysis required
                │
                ▼
         Presentation Model
                │
                ▼
       Presentation Decision
          ├── markdown
          │      │
          │      ▼
          │ safe Markdown Result
          │
          └── generative-ui
                   │
                   ▼
            UI Plan Candidate
                   │
                   ▼
            UI Compiler Core
                   │
                   ▼
             trusted A2UI
                   │
                   ▼
         Controlled Renderer
                   │
                   ▼
              Workbench
```

这条链路验证的不是“手工 JSON → UI”，而是：

> **Natural Language → Business Agent → AgentContent → Presentation → UI。**

## 3. 当前产品层次

```text
Core
├── AgentContent / Presentation Contract
├── Presentation Router
├── Presentation Decision
├── Presentation Model Adapter
├── UI Plan Candidate
├── UI Compiler Core
├── Component Catalog
├── Theme / Presentation Context
├── trusted Presentation contracts
├── Controlled Renderer contracts
└── Reliability Validation

Supporting
├── Generative UI Workbench
├── real Agent Conversation reference experience
├── Reference Integration Host
├── CopilotKit / AG-UI Integration
├── Business Agent Adapter
├── Reference Business Agent
├── Reference Scenarios
└── Development / E2E tooling

Deferred Runtime Platform
├── Runtime Thread / Turn / Operation product model
├── Runtime Repository
├── Surface Lifecycle productization
├── Command Admission productization
├── long-term Runtime-owned Conversation History
├── Conversation management
├── Runtime restart recovery
├── Recovery / Reconcile
└── Runtime Truth Diagnostics
```

## 4. Business Agent 边界

Business Agent 负责：

- 用户业务意图理解；
- 业务推理；
- 后端工具；
- 业务 State / Checkpoint；
- 业务副作用；
- 最终业务结果。

Business Agent 最终输出：

```text
Markdown
or
Structured Business Data
```

它不输出：

- UI Plan Candidate；
- A2UI；
- HTML；
- Vue / React；
- Component Catalog 选择；
- 前端布局代码。

Business Agent 可以有自己的 LLM，但其业务模型与 Presentation Model 必须保持职责隔离。

## 5. Business Agent Adapter

Business Agent Adapter 负责隔离具体 Agent 私有协议。

允许：

- Contract validation；
- protocol mapping；
- correlation mapping；
- public process event mapping；
- final AgentContent forwarding。

禁止：

- 总结、改写或重决定业务结果；
- 生成 UI Plan；
- 调用 UI Compiler；
- 让 Agent 私有 State / Checkpoint 泄漏到 Presentation Core。

Business Agent 不要求实现 AG-UI。

## 6. Presentation Pipeline

Presentation Pipeline 是当前产品核心应用层。

### 6.1 输入规范化

```text
Final AgentContent
      ↓
Markdown sanitize
or
Structured data validation / serialization
      ↓
RoutableAgentContent
```

### 6.2 Presentation Router

Router 语义以 ADR-0015 为准。

关键点：

- Markdown 与 structured data 均可进入 Router；
- Router 可以在不调用模型时做确定性判断；
- 需要展示语义分析时才调用 Model Adapter；
- 最终结果是 `markdown | generative-ui` Presentation Decision；
- 只有 `generative-ui` Decision 包含完整 UI Plan Candidate。

因此：

```text
content type != presentation mode
```

### 6.3 Presentation Model

Presentation Model 输入：

```text
sanitized / validated AgentContent
+ Catalog Capability Summary
+ Presentation Context
```

它可以：

- 理解业务内容；
- 规划信息层级；
- 建议 Catalog 允许范围内的组件能力；
- 规划布局；
- 考虑 Theme / Viewport。

它不能：

- 修改 Business Truth；
- 执行业务工具；
- 绕过 Catalog；
- 直接产生 trusted A2UI；
- 输出任意可执行前端代码。

Model Adapter 输出始终是 untrusted candidate。

## 7. UI Compiler Core

UI Compiler Core 是最重要的 Trust Boundary。

```text
untrusted UI Plan Candidate
        ↓
Schema Validation
        ↓
Catalog / Component Validation
        ↓
Props / Binding Validation
        ↓
Action Descriptor / Policy Validation
        ↓
UI IR
        ↓
A2UI Encoder
        ↓
trusted A2UI
```

必须保持：

- framework-neutral；
- transport-neutral；
- agent-framework-neutral；
- model-vendor-neutral；
- deterministic validation；
- explicit failure / fallback；
- no model-generated code execution。

## 8. Catalog、Theme 与 Presentation Context

### 8.1 Component Catalog

Catalog 是 capability authority：

```text
What may be used?
```

它定义：

- component types；
- props schemas；
- nesting；
- action descriptors；
- capability/version identity。

### 8.2 Theme

Theme 是 visual expression：

```text
How should allowed capabilities look?
```

Theme 可以影响：

- design tokens；
- typography；
- spacing；
- density；
- layout preferences；
- Catalog 已授权的 component variants。

Theme 不可以：

- 增加 / 删除 Catalog capability；
- 授权 Action；
- 绕过 Compiler Policy；
- 改变 Business Truth。

### 8.3 Presentation Context / Profile

如果一次 Presentation 同时需要 Catalog、Theme 和 Viewport，应使用组合上下文：

```text
Presentation Context / Profile
├── catalogRef
├── themeRef
├── viewport
└── other controlled presentation constraints
```

Catalog authority 与 Theme visual styling 必须保持分离。

## 9. Generative UI Workbench

Workbench 当前是：

> **真实 Agent 驱动的 Generative UI Lab。**

### 9.1 主体验

```text
Conversation
  ↓
Business Agent
  ↓
Generated Presentation
```

Workbench 主界面以自然语言对话驱动 Agent，不要求开发者手工输入 AgentContent。

### 9.2 Presentation Inspect

从生成结果进入 Inspect 后，开发者可以观察：

```text
Final AgentContent
        ↓
Presentation Decision
        ↓
UI Plan Candidate (when generative-ui)
        ↓
Validation / Compiler Result
        ↓
trusted A2UI
        ↓
Rendered UI
```

这使 AgentContent 成为**可观察边界**，而不是主要人工输入。

### 9.3 当前允许的开发能力

- Theme / Context 调试；
- Catalog 浏览；
- Viewport 预览；
- Presentation Inspect；
- fallback / invalid candidate 验证；
- basic repeatability / reliability scenarios；
- Reference Scenarios。

### 9.4 当前 Deferred 的 Conversation 能力

真实 Agent Conversation 不 Deferred。

Deferred 的是完整 Conversation Platform：

- long-term history；
- rename / archive / delete；
- Runtime-owned history；
- Runtime Host restart recovery；
- Thread / Turn / Operation product views；
- 完整 Conversation Service。

## 10. Reference Integration Host

`apps/agent-runtime-host` 当前是 Reference Integration Host。

它可以承担：

```text
Workbench
   │ AG-UI (current reference)
   ▼
Agent Runtime Host
├── CopilotKit / AG-UI Integration
├── Business Agent Adapter
├── server-side Presentation Model credentials
└── Embedded Presentation Pipeline
```

它用于证明：

- Workbench 可以进行真实 Agent Conversation；
- 非 AG-UI Business Agent 可以通过 Adapter 接入；
- Agent Framework 不污染 Presentation Core；
- final AgentContent 可以进入统一 Presentation Pipeline；
- 模型凭据不进入浏览器。

如果未来替换 CopilotKit，应替换 Integration Adapter，不修改 Presentation Core。

## 11. Supporting Protocol / Transport

当前 Reference Path：

```text
Workbench ↔ Runtime Host
Application protocol: AG-UI
Transport: HTTP POST + SSE
```

ADR-0026 继续约束这一 Supporting Path。

HTTP / SSE / WebSocket 只是 Transport。
Business Agent 私有 Transport 位于 Business Agent Adapter 后面。

AG-UI 不成为 Presentation Core 的强制外部协议。

## 12. Deferred Agent Runtime Integration

ADR-0024 和 ADR-0025 的完整 Agent Runtime Integration 继续保留。

未来平台如果需要拥有用户 Action 的执行权威，可以重新激活：

- Thread；
- Turn；
- Operation；
- Surface；
- Command Admission；
- Runtime Repository；
- Recovery / Reconcile；
- Runtime Truth Diagnostics。

这些能力解决：

> 用户操作是否被正式接受、是否重复、是否过期，以及失败或断线后如何恢复。

它们有价值，但当前不是 Presentation-first MVP 的必要条件。

已有 Runtime 路径继续存在期间必须遵守 ADR-0024，不得因为 Scope Reset 放宽安全边界。

## 13. 依赖方向

```text
apps/*
  ↓
presentation-pipeline
  ↓
ui-compiler-core
  ↓
contracts / catalog / low-level packages
```

`ui-compiler-core` MUST NOT 依赖：

- apps；
- CopilotKit；
- AG-UI；
- LangGraph；
- Business Agent implementation；
- Provider SDK runtime semantics。

Presentation Pipeline MUST NOT 依赖具体 Workbench UI 或 Business Agent implementation。

## 14. 当前架构验收

当前架构成立需要满足：

1. 用户可以通过真实自然语言对话驱动 Business Agent；
2. Business Agent 可以在完全不知道 Generative UI 的情况下输出 AgentContent；
3. Router 对 Markdown / structured data 按 ADR-0015 决定 Presentation mode；
4. Presentation Model 只产生不可信候选；
5. UI Compiler Core 是唯一 trusted A2UI producer；
6. Catalog authority 与 Theme styling 分离；
7. Workbench 可以从真实 Conversation 观察完整 Presentation 过程；
8. Core 不依赖 CopilotKit / AG-UI；
9. Deferred Runtime Platform 不在没有新范围决策时继续扩张。