# 平台系统架构

本文描述 ADR-0027 下的当前系统主线。

## 当前主链路

```text
Business Agent / Existing Agent Runtime
        │
        │ Final AgentContent / Business Data
        ▼
┌──────────────────────────────────────────────┐
│ Generative UI Presentation Core              │
│                                              │
│ Presentation Router                          │
│   ├── Markdown                               │
│   │     └── safe Markdown PresentationResult │
│   │                                          │
│   └── Structured Business Data               │
│           ↓                                  │
│    Presentation Model                        │
│           ↓                                  │
│    untrusted UI Plan Candidate               │
│           ↓                                  │
│    UI Compiler Core                          │
│           ↓                                  │
│    trusted A2UI PresentationResult           │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
              Controlled Renderer
```

## Workbench

```text
AgentContent / Scenario
        ↓
┌────────────────────────────────────┐
│ Generative UI Workbench            │
│                                    │
│ Input                              │
│ Presentation Decision              │
│ UI Plan Candidate                  │
│ Validation / Compiler Result       │
│ trusted A2UI                       │
│ Rendered UI                        │
│ Theme / Catalog / Viewport         │
│ Compare / Reliability              │
└────────────────────────────────────┘
```

Workbench 当前是 Generative UI Lab。
它用于验证 Presentation 质量和可靠性，而不是当前阶段的 Agent Runtime 管理产品。

## 当前 Reference Integration

现有代码仍提供一条完整参考链路：

```text
Reference Business Agent
        │ private HTTP+SSE / WebSocket / ...
        ▼
Business Agent Adapter
        ▼
Agent Runtime Host
├── current CopilotKit / AG-UI integration
├── server-side Presentation Model credentials
└── Embedded Presentation Pipeline
        ▼
Workbench
```

这条链路属于 Supporting Integration。

Business Agent 不需要实现 AG-UI。
CopilotKit / AG-UI 不属于 Generative UI Core 的强制协议。

如果未来替换 CopilotKit，只需要替换对应 Integration Adapter 和接入层。
Presentation Pipeline、UI Compiler Core、Component Catalog 和 Theme Contract 不应因此改变。

## Core / Supporting / Deferred

```text
Core
├── Presentation Contract
├── Presentation Router
├── Presentation Model Adapter
├── UI Plan Candidate
├── UI Compiler Core
├── Component Catalog
├── Theme / Presentation Context
├── Controlled Renderer contracts
└── Reliability Evaluation

Supporting
├── Generative UI Workbench
├── Agent Runtime Host
├── CopilotKit / AG-UI
├── Business Agent Adapter
├── Reference Business Agent
└── Development / E2E tooling

Deferred Runtime Platform
├── Runtime Thread / Turn / Operation
├── Runtime Repository
├── Surface Lifecycle
├── Command Admission
├── Runtime-owned Conversation History
├── Recovery / Reconcile
└── Runtime Truth Diagnostics
```

## 信任边界

```text
Business Agent
owns Business Truth
        ↓
Final AgentContent
        ↓
Presentation Model
produces untrusted candidate
        ↓
UI Compiler Core
owns trusted A2UI compilation boundary
        ↓
Controlled Renderer
renders only registered capabilities
```

Business Agent 不输出 UI Plan 或 A2UI。
Presentation Model 不修改 Business Truth。
Renderer 不执行模型生成的任意代码。

## Theme / Presentation Context

```text
AgentContent
+ Component Catalog
+ Theme / Presentation Context
+ Viewport Context
        ↓
Presentation Model
        ↓
UI Plan Candidate
        ↓
UI Compiler Core
```

Theme 可以改变视觉表达。
Theme 不得改变业务事实、获得额外 Action Authority 或绕过 Compiler Policy。

## Deferred Agent Runtime Integration

已有 Runtime-first 设计继续由 ADR-0024、ADR-0025 和 ADR-0026 约束。

当平台未来真正拥有用户 Action 的执行权威时，可以重新激活：

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
已有 Runtime 路径继续存在期间，不得放宽其幂等、Surface、历史 Action Authority 和 Command Admission 安全规则。

## 当前范围判断

一个新功能只有在直接提升以下至少一项时才属于当前主线：

- AgentContent → Presentation 语义正确性；
- 生成 UI 视觉质量；
- Theme 一致性；
- UI Plan → trusted A2UI 安全与可靠性；
- Workbench 调试、比较或评测效率；
- Core 必需的最小 Integration。

其他通用 Agent Runtime 能力默认 Deferred。
