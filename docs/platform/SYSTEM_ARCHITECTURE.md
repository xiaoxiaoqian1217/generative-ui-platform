# 平台系统架构

> **Status: Historical.**
> This diagram set does not describe the current repository topology.

本文描述 ADR-0027 下的当前系统主线。

## 当前端到端主链路

```text
User
 │ natural language
 ▼
Generative UI Workbench
 │
 │ current Agent Integration
 ▼
Reference Integration Host
 │
 └── Business Agent Adapter
          │ private protocol
          ▼
     Business Agent
          │
          ├── public process events ───────→ Workbench
          │
          └── Final AgentContent
                    │
                    ▼
         ┌────────────────────────────────────┐
         │ Generative UI Presentation Core    │
         │                                    │
         │ sanitize / validate                │
         │          ↓                         │
         │ Presentation Router                │
         │   ├── deterministic decision       │
         │   └── semantic analysis required  │
         │             ↓                      │
         │      Presentation Model            │
         │             ↓                      │
         │    Presentation Decision           │
         │      ├── markdown                  │
         │      └── generative-ui             │
         │              ↓                     │
         │       UI Plan Candidate            │
         │              ↓                     │
         │       UI Compiler Core             │
         │              ↓                     │
         │       trusted A2UI                 │
         └────────────────┬───────────────────┘
                          │
                          ▼
                  Controlled Renderer
                          │
                          ▼
                      Workbench
```

这条链路验证：

> **Natural Language → Business Agent → Final AgentContent → Presentation → UI。**

## Router 规则

ADR-0015 继续有效。

```text
Markdown or Structured AgentContent
        ↓
Presentation Router
        ├── deterministic decision
        └── Presentation Model when needed
        ↓
Presentation Decision
        ├── markdown
        └── generative-ui + UI Plan Candidate
```

输入类型不等于展示模式。

## Workbench

```text
┌─────────────────────────────────────┐
│ Generative UI Workbench             │
│                                     │
│ Conversation                        │
│   ├── User natural language         │
│   ├── Agent public activity         │
│   └── Generated Presentation        │
│          └── Inspect Presentation   │
│                                     │
│ Inspect                             │
│   ├── Final AgentContent            │
│   ├── Presentation Decision         │
│   ├── UI Plan Candidate             │
│   ├── Validation / Compiler Result  │
│   ├── trusted A2UI                  │
│   └── Rendered UI                   │
│                                     │
│ Theme / Catalog / Viewport          │
│ Reliability / Reference Scenarios   │
└─────────────────────────────────────┘
```

Workbench 当前是 **真实 Agent 驱动的 Generative UI Lab**。

AgentContent 是 Inspect 中的可观察边界，不是主输入。

## Current Reference Integration

```text
Workbench
   │ AG-UI
   │ HTTP POST + SSE
   ▼
Reference Integration Host
├── CopilotKit / AG-UI Integration
├── Business Agent Adapter
├── server-side Presentation Model credentials
└── Embedded Presentation Pipeline
```

这条链路属于 Supporting Integration。

Business Agent 不需要实现 AG-UI。
CopilotKit / AG-UI 不属于 Generative UI Core 的强制协议。

## Core / Supporting / Deferred

```text
Core
├── Presentation Contract
├── Presentation Router / Decision
├── Presentation Model Adapter
├── UI Plan Candidate
├── UI Compiler Core
├── Component Catalog
├── Theme / Presentation Context
├── Controlled Renderer contracts
└── Reliability Validation

Supporting
├── Generative UI Workbench
├── real Agent Conversation reference experience
├── Reference Integration Host
├── CopilotKit / AG-UI
├── Business Agent Adapter
├── Reference Business Agent
└── Development / E2E tooling

Deferred Runtime Platform
├── Runtime Thread / Turn / Operation
├── Runtime Repository
├── Surface Lifecycle
├── Command Admission
├── long-term Runtime-owned Conversation History
├── Conversation Management
├── Runtime restart recovery
├── Recovery / Reconcile
└── Runtime Truth Diagnostics
```

真实 Agent Conversation 不属于 Deferred。

## 信任边界

```text
Business Agent
owns Business Truth
        ↓
Final AgentContent
        ↓
Presentation Router / Model
produces Presentation Decision / untrusted candidate
        ↓
UI Compiler Core
owns trusted A2UI compilation boundary
        ↓
Controlled Renderer
renders only registered capabilities
```

Business Agent 不输出 UI Plan 或 A2UI。
Presentation Model 不修改 Business Truth。
Renderer 不执行模型生成任意代码。

## Catalog / Theme

```text
Component Catalog
→ capability authority
→ What may be used?

Theme
→ visual expression
→ How should allowed capabilities look?
```

Theme 可以影响 design tokens、typography、spacing、density、layout preferences 和 Catalog 已授权 variants。

Theme 不得：

- 增加 / 删除 Catalog capability；
- 授权新的 Action；
- 改变 Business Truth；
- 绕过 Compiler Policy。

## Deferred Agent Runtime Integration

已有 Runtime-first 设计继续由 ADR-0024 和 ADR-0025 约束。

未来当平台真正拥有用户 Action 执行权威时，可以重新激活：

```text
Thread
Turn
Operation
Surface
Command Admission
Runtime Repository
Recovery
Reconcile
Diagnostics
```

这些能力解决 Stateful Interaction Runtime 问题。
它们当前不属于 Presentation-first MVP Release Gate。

本次 Scope Reset 不要求删除现有实现。
已有 Runtime 路径继续存在期间不得放宽幂等、Surface、Historical Action Authority 和 Command Admission 安全规则。

## 当前范围判断

一个新功能只有在直接提升以下至少一项时才属于当前主线：

- AgentContent → Presentation 语义正确性；
- Theme / Presentation Context 一致性；
- UI Plan → trusted A2UI 安全与可靠性；
- 真实 Agent 驱动 Generative UI 的调试 / 验证效率；
- Core 必需的最小 Integration。

长期 Conversation Service、Runtime Repository、Recovery 和 Runtime Observability 默认 Deferred。
