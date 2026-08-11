# ADR-0027：当前阶段回归 Presentation-first Generative UI 主线

- **状态：** 已接受
- **日期：** 2026-08-10
- **来源决策：** 用户确认执行 Scope Reset，并从第一性原理重新收敛当前产品边界

## 背景

Generative UI Platform 最初要验证的核心问题是：

> Business Agent 完成业务推理并输出最终业务内容后，平台如何通过 Presentation Intelligence 自动生成可靠、主题一致且受控的 UI。

随着 Agent Runtime Host、CopilotKit、AG-UI、Conversation History、Runtime Repository、Thread / Turn / Operation、Surface Lifecycle、Command Admission、Recovery 和 Diagnostics 逐步加入，仓库当前阶段从 Generative UI Presentation 问题扩展成了完整 Agent Runtime Platform 问题。

这些 Runtime 问题真实且有价值，但不是证明 `Business Agent → AgentContent → Generative UI` 主链路成立的必要前提。

ADR-0025 已经区分两种外部接入模式：Presentation Integration 与 Agent Runtime Integration。Presentation Integration 不要求调用方迁移到平台 Runtime Kernel、Runtime Repository、Thread / Turn / Operation、CopilotKit 或平台托管会话。

因此需要重新确定当前阶段主线，并把完整 Runtime Platform 能力从当前 Release Gate 中移出。

## 第一性原理

### 1. 产品价值来自业务结果到可信界面的转换

Business Agent 的职责是理解用户业务意图、执行业务推理和工具，并产生最终业务结果。

Generative UI Platform 的核心职责从最终 AgentContent 开始：理解“如何展示”，而不是重新决定“业务结果是什么”。

当前核心价值链为：

```text
User
  ↓ natural language
Workbench / Business Frontend
  ↓ Agent interaction
Business Agent / Existing Agent Runtime
  ↓ Final AgentContent
Presentation Pipeline
  ↓ Presentation Decision
  ├── markdown
  └── generative-ui
          ↓
     UI Plan Candidate
          ↓
     UI Compiler Core
          ↓
     trusted A2UI
          ↓
     Controlled Renderer
```

其中 `User → Business Agent → AgentContent` 是真实 Agent 应用体验的一部分，但不要求 Generative UI Platform 当前阶段拥有完整的 Conversation Management / Runtime Persistence 产品能力。

### 2. AgentContent 是系统边界，不是 Workbench 的主要人工输入

Workbench 当前用于通过真实自然语言对话驱动 Reference / Real Business Agent，并观察最终 AgentContent 如何被转换为 Presentation。

产品主流程不是：

```text
Developer pastes AgentContent JSON
→ Generate UI
```

而是：

```text
Developer / User enters natural language
→ Business Agent runs
→ Final AgentContent is produced
→ Presentation Pipeline runs automatically
→ Generated UI is rendered
```

AgentContent 可以在 Inspect / Debug 视图中查看，也可以在单元测试、Fixture 或专用测试 Harness 中被直接构造，但手工粘贴 AgentContent 不属于当前 Workbench MVP 的核心用户体验。

### 3. Presentation Router 决定展示模式，输入类型不等于展示模式

ADR-0015 的 Router 语义继续有效。

Markdown 与 structured business data 都属于 `RoutableAgentContent`。Presentation Router 可以：

- 对明确场景进行确定性决策，不调用模型；
- 在需要展示语义理解时调用一次 Presentation Model Adapter；
- 最终只产生 `markdown | generative-ui` 两个互斥 Presentation Decision 分支。

规范链路为：

```text
Final AgentContent
      ↓
sanitize / validate
      ↓
Presentation Router
      ├── deterministic decision
      └── semantic analysis required
                ↓
         Presentation Model
                ↓
      Presentation Decision
          ├── markdown
          │      ↓
          │ safe Markdown PresentationResult
          │
          └── generative-ui
                    ↓
             UI Plan Candidate
                    ↓
             UI Compiler Core
                    ↓
             trusted A2UI
```

不得把以下规则写成平台语义：

```text
Markdown input => always Markdown output
Structured input => always LLM => Generative UI
```

只有 `generative-ui` Decision 才必须携带完整 UI Plan Candidate。

### 4. Agent Framework 和通信协议属于集成手段

CopilotKit、AG-UI、HTTP、SSE、WebSocket、LangGraph 或未来其他 Agent Framework 都属于 Integration。

替换 Agent Framework 不应要求修改 Presentation Router、Presentation Decision、UI Plan Candidate、UI Compiler Core、Component Catalog 或 Theme 的核心语义。

### 5. Workbench 的存在理由是验证真实 Agent 驱动的 Generative UI

Workbench 当前定位为：

> **Generative UI Lab / 真实 Agent 驱动的可视化开发调试工作台。**

Workbench 的核心体验是：

```text
Natural-language Conversation
        ↓
Business Agent execution
        ↓
Final AgentContent
        ↓
Generated Presentation
```

Workbench 应允许开发者从最终 UI 追溯并查看：

- Final AgentContent；
- Presentation Decision；
- UI Plan Candidate（仅 generative-ui）；
- Validation / Compiler Result；
- trusted A2UI；
- Rendered UI；
- Theme / Catalog / Viewport 等 Presentation Context。

真实 Conversation 本身不是 Scope Creep。

当前 Deferred 的是完整 Conversation Platform，例如：

- Runtime-owned long-term Conversation History；
- Rename / Archive / Delete 等会话管理产品能力；
- Runtime Host 重启后的完整会话恢复；
- Thread / Turn / Operation 产品化；
- Runtime Repository；
- 完整 Runtime Diagnostics。

### 6. Runtime Truth 只在平台拥有交互执行权威时成为核心问题

如果平台未来真正托管用户 Action、Resume、业务副作用接纳、重试和恢复，那么 Thread、Turn、Operation、Surface、Command Admission、Idempotency 和 Runtime Repository 都有明确价值。

当前 Presentation-first 阶段首先承诺 Presentation Safety，而不是完整 Interaction Safety。

ADR-0024 继续约束已有或未来 Agent Runtime Integration 路径，但不再是当前 Generative UI MVP 的 Release Gate。

### 7. 已完成的 Runtime 研究冻结而不是立即删除

现有 Runtime Platform 代码和设计不视为错误实现。

本次 Scope Reset 不进行大规模删除或推倒重写。已有路径继续存在期间仍必须遵守既有安全不变量。

只有当后续代码收缩能够显著降低维护成本，并且不会破坏真实 Agent → AgentContent → Presentation 主链路时，才通过独立任务逐步删除或隔离。

## 决策

### 1. 当前 Active Product Track

当前阶段将 ADR-0025 的 **Presentation Integration** 设为唯一 Active Product Track。

当前 North Star：

> 将 Business Agent 或已有 Agent Runtime 产生的最终 AgentContent，转换为可靠、主题一致且受控的 Presentation，并通过真实 Agent Conversation 验证这条链路。

### 2. 当前 Core

当前 Core 包括：

- AgentContent / Presentation Contract；
- Presentation Router；
- Presentation Decision；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Validation / Policy / Binding / Action Descriptor 约束；
- trusted A2UI / PresentationResult；
- Controlled Renderer contract；
- Theme / Presentation Context；
- Generative UI reliability validation。

当前不建设独立 Presentation Quality 自动评分体系。

### 3. Supporting

以下能力保留为 Supporting：

- Generative UI Workbench；
- 真实 Agent Conversation reference experience；
- Reference Business Agent；
- Agent Runtime Host 作为 Reference Integration Host；
- CopilotKit Runtime；
- AG-UI；
- Business Agent Adapter；
- HTTP / SSE / WebSocket Transport；
- Reference Scenarios；
- 开发环境和 E2E。

Supporting 的目标是让 Core 更容易接入、验证和演示，不得反向定义 Core 产品边界。

### 4. Workbench 当前定位

Workbench 必须以自然语言 Conversation 驱动真实 Business Agent / Reference Business Agent。

Workbench 当前 MVP SHOULD 支持：

1. 用户输入自然语言；
2. 通过当前 Agent Integration 驱动 Business Agent；
3. 接收 Business Agent 公开过程信息与最终 AgentContent；
4. 自动触发 Presentation Pipeline；
5. 在主 Conversation 中展示 Markdown 或 trusted Generative UI；
6. 从 Presentation 打开 Inspect，查看 AgentContent、Decision、UI Plan、Validation、A2UI 和 Rendered UI；
7. 调试 Theme / Catalog / Viewport 和可靠性场景。

Workbench 当前 MVP 不要求完整 Conversation Management / Persistence / Recovery 产品能力。

### 5. Agent Runtime Host 当前定位

`apps/agent-runtime-host` 当前保留为 **Reference Integration Host**。

它可以继续：

- 承载当前 CopilotKit Runtime / AG-UI 参考入口；
- 为 Workbench 提供真实 Agent Conversation 接入；
- 隔离 Business Agent 私有协议；
- 在服务端持有 Presentation Model 凭据；
- 组装 Presentation Pipeline；
- 将最终 AgentContent 送入 Presentation Pipeline；
- 为 Workbench 和 E2E 提供可运行参考链路；
- 保持已有 Runtime Integration 路径的兼容和安全行为。

它不再因为当前实现包含 Runtime Kernel、Runtime Repository 或 Diagnostics，就成为当前产品核心。

### 6. Deferred Runtime Platform

以下能力当前停止扩张：

- Runtime Thread / Turn / Operation 产品语义；
- Runtime Repository；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- Runtime-owned long-term Conversation History；
- Conversation Rename / Archive / Delete；
- Runtime Host restart recovery；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

这些能力只有在未来明确需要平台拥有 Stateful Interaction 和 Action Execution Authority 时才恢复为 Active。

### 7. Theme 与 Catalog 权限分离

Component Catalog 回答：

> **允许使用什么能力。**

Theme 回答：

> **允许的能力应该以什么视觉风格表达。**

Theme MAY 影响：

- design tokens；
- typography；
- spacing；
- density；
- layout preferences；
- Catalog 已授权范围内的 component variants。

Theme MUST NOT：

- 增加或删除 Component Catalog capability；
- 授权新的 Action；
- 绕过 Compiler Policy；
- 改变 Business Truth。

如果需要同时选择 Catalog 与 Theme，应由更高层 Presentation Context / Profile 分别携带 `catalogRef` 与 `themeRef`，不得把 capability authority 放进 Theme。

### 8. Framework independence

Generative UI Core 必须能够在不使用 CopilotKit 的情况下成立。

未来可以通过 Package API、REST API、AG-UI / CopilotKit Integration、LangGraph Integration 或自研 Runtime Adapter 接入 Core。

具体稳定公共 API 形态仍需要独立决策。本 ADR 不重新引入独立 UI Compiler Service 作为目标部署结论。

### 9. 当前功能准入标准

当前阶段新增功能必须至少满足以下一项：

1. 直接提升 `AgentContent → Presentation` 的语义正确性；
2. 直接提升 Theme / Presentation Context 一致性；
3. 直接提升模型候选到 trusted A2UI 的安全性和可靠性；
4. 直接提升真实 Agent 驱动 Generative UI 的可调试、可比较、可验证能力；
5. 为 Core 提供必要且最小的 Framework / Runtime Integration。

真实 Agent Conversation 属于第 4 / 5 类。

如果一个功能主要解决通用 Agent Runtime、长期 Conversation Service、Workflow Recovery、Runtime Repository 或 Runtime Observability Platform，则默认 Deferred。

## 与既有 ADR 的关系

### ADR-0015

ADR-0015 继续有效。

本 ADR 不改变其关键语义：

- Router 同时接受 Markdown 与 structured-data；
- Router 可以使用确定性规则；
- 需要语义分析时才调用 Presentation Model Adapter；
- Presentation Decision 为 `markdown | generative-ui` 判别联合；
- 只有 generative-ui 分支包含完整 UI Plan Candidate。

### ADR-0018

本 ADR 部分取代 ADR-0018 中“当前阶段以平台全链路 Runtime 验证环境为主要交付范围”的结论。

ADR-0018 中 Compiler 独立核心能力、Business Agent 不承担 UI 生成职责、模型输出不可信、Interaction Gateway / 多 Agent 路由非当前范围等结论继续有效。

### ADR-0019

本 ADR **部分取代 ADR-0019**。

继续有效：

- Presentation Pipeline 是独立 Package；
- 当前 Reference Integration Host 可以进程内嵌入 Presentation Pipeline；
- Packages 不依赖 Apps；
- UI Compiler Core / Model Adapter / Catalog / Contracts 保持独立边界；
- 当前不同时维护 Embedded / Remote 两套 Compiler 部署模式。

被本 ADR 取代：

- Agent Runtime Host 是 Generative UI Platform 长期统一后端的产品结论；
- Presentation Pipeline 必须绑定完整 Agent Run / Runtime Truth 生命周期的产品结论。

当前“嵌入 Runtime Host”只是 Reference Integration 组合方式，不意味着 Runtime Host 是 Generative UI Core 的产品边界或唯一未来宿主。

### ADR-0024

ADR-0024 继续有效于已有和未来 Agent Runtime Integration。

其安全规则继续约束仍存在的 Runtime Host Action / Surface / Command 路径，但 Thread / Turn / Operation / Surface / Command Admission 不再属于当前 Presentation-first MVP Release Gate。

### ADR-0025

本 ADR细化 ADR-0025 的阶段优先级。

Presentation Integration 当前 Active；Agent Runtime Integration 当前 Deferred。

### ADR-0026

ADR-0026 继续约束当前 CopilotKit / Workbench 参考 Agent 集成路径。

AG-UI 是该 Supporting Reference Path 的 Agent 应用协议，但不成为 Generative UI Core 的强制外部协议。

## 当前 MVP Release Gate

当前 MVP 必须证明：

1. Workbench 可以通过自然语言真实驱动 Reference / Real Business Agent；
2. Business Agent 不需要理解 Generative UI，并能输出稳定 AgentContent；
3. Presentation Router 按 ADR-0015 正确决定 Markdown / Generative UI，必要时才调用 Presentation Model；
4. generative-ui Decision 能产生符合候选契约的 UI Plan Candidate；
5. UI Compiler 能拒绝非法候选并只产生 trusted A2UI；
6. Renderer 能安全、稳定展示 trusted Presentation；
7. Workbench 能从真实 Conversation 查看 AgentContent、Decision、UI Plan、Validation、A2UI 和最终 Renderer；
8. Theme 与 Catalog 权限保持分离，Theme 不改变 Business Truth 或 capability authority；
9. 测试覆盖合法、非法、fallback 和基础稳定性场景；
10. Core 不依赖 CopilotKit、AG-UI 或特定 Agent Framework 才能成立。

## 后果

### Positive

- 项目回到最初且可验证的真实 Agent → Generative UI 价值；
- Workbench 保留真实对话体验，而不是退化成 JSON Playground；
- Core 与 CopilotKit / Agent Runtime 解耦；
- Router 语义与 ADR-0015 保持一致；
- 已有 Runtime 研究保留，不需要立即推倒重写；
- 未来切换 Agent Framework 时，Presentation Core 可复用。

### Trade-offs

- 当前不会继续完善长期 Conversation Management / Runtime Recovery；
- 已有 Runtime 代码与当前主线会在一段时间内并存；
- Presentation Integration 的稳定公共 API 仍需独立决策；
- Presentation Pipeline 中残留的 Runtime / Surface metadata 需要后续独立任务审查和解耦。

## 非目标

当前阶段不主动建设：

- 手工粘贴 AgentContent 作为 Workbench 核心产品流程；
- Presentation Quality 自动评分体系；
- 完整 Agent Runtime Platform；
- 完整长期 Conversation Service；
- Runtime Repository 产品化；
- Surface / Command Admission 新能力；
- Reconcile 和复杂 Runtime Recovery；
- 完整 Observability / Diagnostic Platform；
- Interaction Gateway；
- 多 Agent 自动路由；
- 多租户、权限、审计和计费。

## 迁移策略

本次 Scope Reset 首先修改 ADR、平台需求、平台架构、Workbench SRS、README 和 Agent 规则。

第一阶段不要求删除 Runtime Platform 代码。

后续代码任务按以下顺序评估：

1. 停止新增 Deferred Runtime 功能；
2. 保证真实 Conversation → Business Agent → AgentContent → Presentation 主链路继续可运行；
3. 将 Workbench 新增功能转向真实 Agent 驱动的 Generative UI Lab；
4. 审查 Presentation Contract / Pipeline 中残留的 Thread / Run / Surface 语义，区分纯 Presentation metadata 与 Deferred Runtime metadata；
5. 识别只为 Deferred Runtime 服务且显著增加维护成本的代码；
6. 通过独立 Issue / PR 再决定保留、隔离或删除。
