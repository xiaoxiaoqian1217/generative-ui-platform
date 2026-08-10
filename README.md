# Generative UI Platform

Generative UI Platform 当前阶段聚焦一个核心问题：

> **将 Business Agent 或已有 Agent Runtime 产生的业务内容，通过 Presentation Intelligence 转换为美观、可靠、主题一致且受控的 UI。**

当前范围以 [ADR-0027](./docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md) 为准。

## 当前 North Star

```text
Business Agent / Existing Agent Runtime
        ↓
Final AgentContent / Business Data
        ↓
Presentation Pipeline
        ↓
Presentation Model
        ↓
untrusted UI Plan Candidate
        ↓
UI Compiler Core
        ↓
trusted A2UI / PresentationResult
        ↓
Controlled Renderer
```

Business Agent 只负责业务结果。
它不需要理解 A2UI、Component Catalog、CopilotKit 或前端组件。

Presentation Model 负责理解业务内容并规划展示。
它没有最终 UI 权威。

UI Compiler Core 是唯一可信 A2UI 生产者。
模型候选必须经过 Schema、Catalog、Props、Binding、Action Descriptor 和 Policy 验证后才能进入 Renderer。

## 当前定位

| 名称 | 当前定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | Presentation-first Generative UI 产品边界 | Active |
| UI Compiler Core | trusted A2UI 编译与安全边界 | Core |
| Presentation Pipeline | AgentContent → Presentation 应用能力 | Core |
| Component Catalog | 受控组件能力边界 | Core |
| Theme / Presentation Context | 受控视觉表达上下文 | Core / Active |
| Generative UI Workbench | Generative UI Lab / 可视化开发调试工作台 | Supporting / Active |
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
- Presentation Model Adapter；
- UI Plan Candidate；
- UI Compiler Core；
- Component Catalog；
- Theme / Presentation Context；
- trusted A2UI / PresentationResult；
- Controlled Renderer contract；
- Generative UI reliability evaluation。

### Supporting

以下能力用于接入、验证和演示 Core：

- Generative UI Workbench；
- Agent Runtime Host；
- CopilotKit / AG-UI；
- Business Agent Adapter；
- Reference Business Agent；
- Reference Scenarios；
- Development / E2E tooling。

Supporting 能力不得反向定义 Core 的产品边界。

### Deferred Runtime Platform

以下设计和已有实现保留，但当前停止扩张：

- Runtime Thread / Turn / Operation；
- Runtime Repository；
- Surface Lifecycle；
- Command Admission；
- Runtime-owned Conversation History；
- Recovery / Reconcile；
- Runtime Truth Diagnostics；
- 完整 Agent Runtime Platform。

ADR-0024 继续约束已有 Runtime Integration 路径的安全行为。
这些能力不再属于当前 Presentation-first MVP Release Gate。

## Generative UI Workbench

Workbench 不是要被删除。

它重新回到最初的存在理由：

> **可视化调试和验证 Generative UI 是否正确、稳定和美观。**

Workbench 当前优先验证：

```text
AgentContent
→ Presentation Decision
→ UI Plan Candidate
→ Validation / Compiler Result
→ trusted A2UI
→ Rendered UI
```

并重点建设：

- Theme；
- Catalog；
- Viewport；
- Compare；
- Reliability；
- fallback；
- Compiler Error inspection。

Conversation-first、Runtime Recovery、Command Admission 和完整 Diagnostics 不再是当前 Workbench Release Gate。

## Agent Runtime Host

`apps/agent-runtime-host` 当前保留为 Reference Integration Host。

它可以继续：

- 承载当前 CopilotKit / AG-UI 参考入口；
- 通过 Adapter 接入不支持 AG-UI 的 Business Agent；
- 在服务端持有 Presentation Model Provider 凭据；
- 组装 Presentation Pipeline；
- 为 Workbench 和 E2E 提供可运行链路。

它当前不再继续扩展完整 Agent Runtime Platform。

未来即使不使用 CopilotKit，Presentation Pipeline、UI Compiler Core、Catalog 和 Theme 也必须能够独立成立。

## Framework Independence

Generative UI Core 不绑定 CopilotKit 或 AG-UI。

当前参考链路可以是：

```text
Reference Business Agent
        ↓
Business Agent Adapter
        ↓
Agent Runtime Host
        ↓
CopilotKit / AG-UI
        ↓
Workbench
```

但核心产品链路是：

```text
Any Agent / Agent Runtime
        ↓
AgentContent / Business Data
        ↓
Presentation Pipeline
        ↓
trusted Presentation
```

未来可以通过 Package、REST、AG-UI、LangGraph 或自研 Runtime Adapter 接入。
稳定公共 API 形态需要后续独立决策。

## 当前功能准入标准

当前阶段新增功能必须至少直接提升以下一项：

1. `AgentContent → Presentation` 的语义正确性；
2. 生成 UI 的视觉质量；
3. Theme / Presentation Context 一致性；
4. 模型候选到 trusted A2UI 的安全性和可靠性；
5. Generative UI 的可调试、可比较、可评测能力；
6. Core 所必需的最小 Framework / Runtime Integration。

如果一个功能主要解决通用 Agent Runtime、Conversation Service、Workflow Recovery 或 Runtime Observability，则当前默认 Deferred。

## 快速开始

从干净克隆开始执行：

Windows PowerShell：

```powershell
./scripts/bootstrap.ps1
```

Linux / WSL：

```bash
./scripts/bootstrap.sh
```

当前 Reference Integration 仍使用 `apps/agent-runtime-host` 提供服务端 Presentation Model 配置。

常用命令：

```bash
pnpm check:boundaries
pnpm typecheck
pnpm dev:platform
pnpm verify:platform
pnpm docs:check
```

当前开发脚本仍包含之前全链路阶段的 Runtime Integration。
它们是现有工程基线，不表示 Runtime Platform 仍是当前产品主线。

## 文档结构

### 当前平台规范

- [平台范围摘要](./docs/platform/SCOPE_DECISION.md)
- [ADR-0027：Presentation-first Scope Reset](./docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台级需求](./docs/platform/REQUIREMENTS.md)
- [平台级架构](./docs/platform/ARCHITECTURE.md)
- [平台系统架构简图](./docs/platform/SYSTEM_ARCHITECTURE.md)
- [Workbench SRS](./docs/WEB_WORKBENCH_SRS.md)
- [ADR 索引](./docs/adr/README.md)

### 仍然有效的关键历史决策

- [ADR-0019：Presentation Pipeline 当前嵌入 Runtime Host](./docs/adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0024：Deferred Runtime Truth Model 与安全 Command Admission](./docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0025：Presentation Integration / Agent Runtime Integration](./docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：当前 AG-UI 参考集成协议边界](./docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)

### Compiler 子系统基线

以下旧文档保留，不删除、不移动：

- [Compiler MVP 需求规格](./docs/REQUIREMENTS.md)
- [Compiler MVP 架构](./docs/ARCHITECTURE.md)
- [Compiler 系统设计](./docs/Generative_UI_Compiler_Design.md)
- [数据契约](./docs/CONTRACTS.md)

## 迁移原则

本次 Scope Reset 首先改变产品和架构优先级。

当前不先大规模删除 Runtime Platform 代码。

后续按独立任务处理：

1. 停止新增 Deferred Runtime 功能；
2. 保持现有 Presentation 主链路可运行；
3. 把 Workbench 开发转向 Generative UI Lab；
4. 建设 Theme / Compare / Reliability；
5. 再判断旧 Runtime 代码哪些保留、隔离或删除。
