# Generative UI Platform 平台级架构

本文描述整个仓库在 ADR-0027 下的当前跨子系统关系。
Compiler 内部架构继续以 `docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 为准。

## 1. 当前架构原则

当前架构从最短产品价值链出发，而不是从 Agent Framework 或 Runtime 功能数量出发。

1. **Business Agent 拥有业务事实。**
   业务推理、后端工具、业务状态、Checkpoint 和业务副作用语义由 Business Agent 或调用方 Runtime 决定。
2. **Presentation Pipeline 拥有展示转换。**
   它只处理最终 AgentContent / Business Data，不重新解释业务执行过程。
3. **Presentation Model 负责展示智能，但没有最终 UI 权威。**
   模型可以理解业务内容并生成 UI Plan Candidate，但候选始终不可信。
4. **UI Compiler Core 拥有可信编译边界。**
   只有经过 Schema、Catalog、Policy、Props、Binding 和 Action Descriptor 验证的结果才能成为 trusted A2UI。
5. **Workbench 是 Generative UI Lab。**
   它用于观察、调试、比较和评测生成式 UI，而不是当前阶段的 Agent Runtime 管理产品。
6. **Framework 属于 Integration。**
   CopilotKit、AG-UI、HTTP、SSE、WebSocket、LangGraph 或未来其他 Runtime 不得定义 Generative UI Core 语义。
7. **Runtime Platform 当前 Deferred。**
   Thread、Turn、Operation、Surface、Command Admission、Recovery 和 Runtime Diagnostics 只继续约束已有 Runtime Integration 路径，不驱动当前 MVP。

## 2. 当前主链路

```text
Business Agent / Existing Agent Runtime
        │
        │ Final AgentContent / Business Data
        ▼
┌─────────────────────────────────────────────┐
│ Presentation Pipeline                       │
│                                             │
│  Presentation Router                        │
│      ├── Markdown                           │
│      │     └── safe Markdown Result         │
│      │                                      │
│      └── Structured Business Data           │
│              ↓                              │
│       Presentation Model Adapter            │
│              ↓                              │
│       untrusted UI Plan Candidate           │
│              ↓                              │
│       UI Compiler Core                      │
│              ↓                              │
│       trusted A2UI PresentationResult       │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
              Controlled Renderer
```

这条链路必须能够在不依赖 CopilotKit、AG-UI 或平台 Runtime Truth Model 的情况下成立。

## 3. 当前产品层次

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
├── CopilotKit / AG-UI Integration
├── Business Agent Adapter
├── Reference Business Agent
├── Reference Scenarios
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

Core 定义产品价值。
Supporting 让 Core 可运行、可接入、可调试和可演示。
Deferred Runtime Platform 保留未来能力和已有实现，但当前停止扩张。

## 4. Business Agent 边界

Business Agent 或调用方 Runtime 负责：

- 用户业务意图；
- 业务推理；
- 后端工具；
- 业务 State / Checkpoint；
- 业务副作用；
- 最终业务结果。

最终 AgentContent 只能是：

```text
Markdown
or
Structured Business Data
```

Business Agent 不输出：

- UI Plan Candidate；
- A2UI；
- HTML；
- Vue / React；
- Component Catalog 选择；
- 前端布局实现。

这保证 Business Agent 与用户界面表达解耦。

## 5. Presentation Pipeline

Presentation Pipeline 是当前平台的主要应用能力层。

它接收已经确定的最终业务内容，并输出 PresentationResult。

### 5.1 Markdown 路径

```text
Markdown AgentContent
→ sanitize / validate
→ Markdown PresentationResult
```

Markdown 路径不为了“更漂亮”而自动调用模型改写业务内容。

### 5.2 Generative UI 路径

```text
Structured AgentContent
        ↓
Presentation Router
        ↓
Presentation Model Adapter
        ↓
untrusted UI Plan Candidate
        ↓
UI Compiler Core
        ↓
trusted A2UI PresentationResult
```

Presentation Model 可以做：

- 内容语义理解；
- 信息层级规划；
- 组件能力选择建议；
- 布局结构规划；
- Theme / Presentation Context 下的展示适配。

Presentation Model 不可以：

- 修改 Business Truth；
- 调用业务工具；
- 绕过 Catalog；
- 直接成为 trusted A2UI 生产者；
- 输出任意前端可执行代码。

## 6. UI Compiler Core

UI Compiler Core 是当前最重要的信任边界。

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

Core 必须保持：

- framework-neutral；
- transport-neutral；
- agent-framework-neutral；
- model-vendor-neutral；
- deterministic validation；
- explicit failure / fallback；
- no model-generated code execution。

## 7. Theme / Presentation Context

Theme 属于 Presentation 的受控上下文。

推荐抽象关系为：

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

Theme 可以改变视觉表达，但不得改变业务事实。

Theme 应优先通过：

- design tokens；
- component variants；
- density；
- layout preferences；
- typography constraints；
- spacing constraints；

影响展示。

Theme 不得授权新的业务 Action 或绕过 Compiler Policy。

## 8. Generative UI Workbench

Workbench 当前是 **Generative UI Lab / 可视化开发调试工作台**。

主要链路为：

```text
AgentContent / Scenario
        ↓
Presentation
        ↓
┌────────────────────────────────────┐
│ Workbench                          │
│                                    │
│ Input                              │
│ Presentation Decision              │
│ UI Plan Candidate                  │
│ Validation / Compiler Result       │
│ A2UI                               │
│ Rendered UI                        │
│ Theme / Catalog / Viewport         │
│ Compare / Reliability              │
└────────────────────────────────────┘
```

Workbench 的核心价值是让生成式 UI 的问题可以被观察和复现。

Workbench 不再以以下能力作为当前产品主线：

- Conversation-first；
- Runtime-owned Conversation History；
- Thread / Turn / Operation 浏览；
- Command Admission；
- Runtime Recovery；
- Reconcile；
- 完整 Diagnostic Platform。

现有实现可以暂时保留这些页面和代码。
后续是否删除由独立代码收缩任务决定。

## 9. Supporting Integration Host

`apps/agent-runtime-host` 当前是参考 Integration Host，而不是 Generative UI Core 本身。

它当前可以承担：

```text
Reference Business Agent
        │ private adapter
        ▼
Agent Runtime Host
├── optional CopilotKit / AG-UI integration
├── Business Agent Adapter
├── server-side Model credentials
└── Embedded Presentation Pipeline
        ↓
PresentationResult
        ↓
Workbench
```

这一参考路径用于证明：

- 不支持 AG-UI 的 Business Agent 可以通过 Adapter 接入；
- Agent Framework 不需要污染 Presentation Core；
- 模型凭据只存在服务端；
- 最终 AgentContent 可以进入统一 Presentation Pipeline。

如果未来不再使用 CopilotKit，可以替换这一 Integration Adapter，而不修改 Presentation Core。

## 10. Framework Integration

当前参考 Agent 集成路径仍可采用 ADR-0026：

```text
Workbench ↔ Runtime Host
Application protocol: AG-UI
Current transport: HTTP POST + SSE
```

这只是 Supporting Integration 的协议边界。

Generative UI Core 不要求调用方采用 AG-UI。

未来可以支持：

```text
Existing Agent Runtime
├── Package Integration
├── REST Integration
├── AG-UI / CopilotKit Integration
├── LangGraph Integration
└── Custom Runtime Adapter
        ↓
Presentation Pipeline
```

稳定公共 API 需要独立 ADR。

## 11. Deferred Agent Runtime Integration

ADR-0024 和 ADR-0025 的完整 Agent Runtime Integration 设计继续保留。

如果未来平台需要拥有用户 Action 的执行权威，则可以重新激活：

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

这些能力回答的问题是：

> 用户操作是否被正式接受、是否重复、是否过期，以及失败或断线后应该如何恢复。

这些问题具有真实价值。
但它们属于 Stateful Interaction Runtime，而不是当前 Presentation-first MVP 的必要条件。

已有 Runtime 路径继续存在期间：

- Runtime Host 仍必须遵守 ADR-0024；
- consumed Surface 不得被静默重新激活；
- stale historical authority 不得被重放；
- Command 幂等和 revision 校验不得因为 Scope Reset 被放宽。

Scope Reset 改变的是优先级，不降低已有安全边界。

## 12. 依赖方向

当前推荐依赖方向：

```text
apps/*
  ↓
presentation-pipeline
  ↓
ui-compiler-core
  ↓
contracts / catalog / low-level packages
```

Framework Integration 应位于 apps 或专用 Adapter 边界。

`ui-compiler-core` MUST NOT 依赖：

- apps；
- CopilotKit；
- AG-UI；
- LangGraph；
- Business Agent implementation；
- Provider SDK specific runtime semantics。

Presentation Pipeline 可以依赖 Model Adapter contract 和 UI Compiler Core。
它不得依赖具体 Workbench UI。

Workbench 不拥有 Presentation 决策和 Compiler Trust。

## 13. 当前架构验收

当前架构成立需要满足：

1. Final AgentContent 可以独立进入 Presentation Pipeline；
2. Business Agent 不需要理解 Generative UI；
3. Presentation Model 只能产生不可信候选；
4. UI Compiler Core 是唯一 trusted A2UI producer；
5. Theme 不修改 Business Truth；
6. Workbench 可以观察并验证完整 Presentation 过程；
7. Core 不依赖 CopilotKit / AG-UI；
8. Runtime Platform 新功能不会在没有新范围决策时继续扩张。
