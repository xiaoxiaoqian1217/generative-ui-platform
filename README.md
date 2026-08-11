# Generative UI Platform

Generative UI Platform 当前聚焦一个核心问题：

> **用户通过真实 Agent Conversation 获得业务结果后，平台如何把 Business Agent 的 Final AgentContent 自动转换为可靠、主题一致且受控的 UI。**

当前范围以 [ADR-0027](./docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md) 为准。

## 当前主链路

```text
User natural language
        ↓
Generative UI Workbench
        ↓
Reference Integration Host
        ↓
Business Agent Adapter
        ↓
Business Agent
        ↓
Final AgentContent
        ↓
Presentation Router
   ├── deterministic decision
   └── semantic analysis required
             ↓
      Presentation Model
             ↓
   Presentation Decision
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

Business Agent 只负责业务结果，不需要理解 A2UI、Component Catalog、CopilotKit 或前端组件。

AgentContent 是系统边界和可观察对象，不是 Workbench 当前的主要人工输入。
Workbench 的主输入是自然语言 Conversation。

## 当前定位

| 名称 | 当前定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | Presentation-first Generative UI 产品边界 | Active |
| Presentation Pipeline | AgentContent → Presentation 应用能力 | Core |
| UI Compiler Core | trusted A2UI 编译与安全边界 | Core |
| Component Catalog | capability authority | Core |
| Theme / Presentation Context | 受控视觉表达上下文 | Core |
| Generative UI Workbench | 真实 Agent 驱动的 Generative UI Lab | Supporting / Active |
| Agent Runtime Host | Reference Integration Host | Supporting / Frozen Expansion |
| CopilotKit / AG-UI | 当前参考 Agent Integration | Supporting |
| Reference Business Agent | 真实 AgentContent 与集成验证 | Supporting |
| Runtime Thread / Operation / Surface / Command | 完整 Agent Runtime Integration | Deferred |
| Interaction Gateway | 多 Agent 扩展能力 | Future / Out of Scope |

## Core / Supporting / Deferred

### Core

当前开发重点：

- AgentContent / Presentation Contract；
- Presentation Router；
- Presentation Decision；
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Theme / Presentation Context；
- trusted A2UI / PresentationResult；
- Controlled Renderer contract；
- Reliability Validation。

### Supporting

以下能力用于接入、验证和演示 Core：

- Generative UI Workbench；
- real Agent Conversation reference experience；
- Agent Runtime Host；
- CopilotKit / AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- Development / E2E tooling。

Supporting 不得反向定义 Core 产品边界。

### Deferred Runtime Platform

以下设计和已有实现保留，但当前停止扩张：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- long-term Runtime-owned Conversation History；
- Conversation management；
- Runtime restart recovery；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

ADR-0024 继续约束已有 Runtime Integration 路径的安全行为。

## Presentation Router

输入类型不等于展示模式。

ADR-0015 继续有效：

```text
Markdown or Structured AgentContent
        ↓
Presentation Router
        ├── deterministic decision
        └── call Presentation Model when needed
        ↓
Presentation Decision
        ├── markdown
        └── generative-ui + UI Plan Candidate
```

因此平台不采用：

```text
Markdown => always Markdown
Structured Data => always Generative UI
```

## Workbench

Workbench 不是 AgentContent JSON Playground。

它的核心体验是：

```text
Natural-language Conversation
        ↓
Business Agent
        ↓
Generated Presentation
```

从最终 Presentation 可以进入 Inspect，查看：

- Final AgentContent；
- Presentation Decision；
- UI Plan Candidate；
- Validation / Compiler Result；
- trusted A2UI；
- Rendered UI。

真实 Conversation 当前保留。
Deferred 的是完整长期 Conversation Management / Persistence / Recovery，而不是对话本身。

## Catalog 与 Theme

```text
Component Catalog
→ What may be used?

Theme
→ How should allowed capabilities look?
```

Theme 可以影响 design tokens、typography、spacing、density、layout preferences 和 Catalog 已授权的 variants。

Theme 不得：

- 增加 / 删除 Catalog capability；
- 授权新的 Action；
- 改变 Business Truth；
- 绕过 Compiler Policy。

## Agent Runtime Host

`apps/agent-runtime-host` 当前是 Reference Integration Host。

它可以继续：

- 承载 CopilotKit / AG-UI 参考入口；
- 提供真实 Agent Conversation；
- 通过 Adapter 接入不支持 AG-UI 的 Business Agent；
- 在服务端持有 Presentation Model Provider 凭据；
- 组装 Presentation Pipeline；
- 为 Workbench 和 E2E 提供可运行链路。

它当前不再继续扩展完整 Agent Runtime Platform。

未来即使不使用 CopilotKit，Presentation Router、UI Compiler Core、Catalog 和 Theme 也必须能够独立成立。

## Framework Independence

Generative UI Core 不绑定 CopilotKit 或 AG-UI。

当前参考链路：

```text
Workbench
    ↓ AG-UI
Reference Integration Host
    ↓ private Adapter
Business Agent
```

未来可以通过 Package、REST、AG-UI、LangGraph 或自研 Runtime Adapter 接入 Presentation Core。
稳定公共 API 形态需要后续独立决策。

## 当前功能准入标准

当前阶段新增功能必须至少直接提升以下一项：

1. `AgentContent → Presentation` 的语义正确性；
2. Theme / Presentation Context 一致性；
3. 模型候选到 trusted A2UI 的安全性和可靠性；
4. 真实 Agent 驱动 Generative UI 的可调试、可比较、可验证能力；
5. Core 所必需的最小 Framework / Runtime Integration。

如果一个功能主要解决长期 Conversation Service、Workflow Recovery、Runtime Repository 或 Runtime Observability，则当前默认 Deferred。

当前不建设 Presentation Quality 自动评分体系。

## 快速开始

Windows PowerShell：

```powershell
./scripts/bootstrap.ps1
pnpm dev:platform
```

Linux / WSL：

```bash
./scripts/bootstrap.sh
pnpm dev:platform
```

常用验证命令：

```bash
pnpm validate
pnpm test
pnpm build
pnpm docs:check
```

当前开发脚本仍包含之前全链路阶段的 Runtime Integration。
这些是现有工程基线，不表示 Runtime Platform 仍是当前产品主线。

## 文档入口

### 当前平台规范

- [平台范围摘要](./docs/platform/SCOPE_DECISION.md)
- [ADR-0027：Presentation-first Scope Reset](./docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台级需求](./docs/platform/REQUIREMENTS.md)
- [平台级架构](./docs/platform/ARCHITECTURE.md)
- [Workbench SRS](./docs/WEB_WORKBENCH_SRS.md)
- [ADR 索引](./docs/adr/README.md)

### 关键既有决策

- [ADR-0015：Presentation Router / Model Adapter](./docs/adr/0015-presentation-router-and-model-adapter.md)
- [ADR-0019：Presentation Pipeline 当前 Reference Host 组合方式](./docs/adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0024：Deferred Runtime Truth Model 与 Command Admission](./docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0025：Presentation Integration / Agent Runtime Integration](./docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：当前 AG-UI Reference Integration](./docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)

### Compiler 子系统基线

- [Compiler MVP 需求规格](./docs/REQUIREMENTS.md)
- [Compiler MVP 架构](./docs/ARCHITECTURE.md)
- [Compiler 系统设计](./docs/Generative_UI_Compiler_Design.md)
- [数据契约](./docs/CONTRACTS.md)

## 迁移原则

当前不先大规模删除 Runtime Platform 代码。

后续按独立任务处理：

1. 停止新增 Deferred Runtime 功能；
2. 保持 `Natural Language → Business Agent → AgentContent → Presentation` 主链路可运行；
3. 将 Workbench 聚焦真实 Agent 驱动的 Generative UI Lab；
4. 审查 Presentation Contract / Pipeline 中残留的 Runtime / Surface metadata；
5. 再判断旧 Runtime 代码哪些保留、隔离或删除。
