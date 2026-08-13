# 文档导航

当前仓库的产品主线已经从“只验证 Controlled UI 纵向场景”推进到：

```text
Completed
AGUIMock → AG-UI → Frontend Tool → MapLibre / DeviceCard

Current
Workbench → thin CopilotKit Runtime → AGUIMock / SACS

Next
A2UI Renderer → Catalog → Theme → Dynamic A2UI
```

当前阶段仍坚持：

> **先纵向跑通场景，再横向抽象公共能力。**

## 状态词

阅读本仓库文档时必须区分四种状态。

| 状态 | 含义 | 处理规则 |
|---|---|---|
| Active | 当前 Release Gate 或已经接受的当前实现目标 | 可以围绕当前阶段继续实现 |
| Frozen | 为后续阶段保留，但当前不扩建 | 不得当作迁移债务删除，不得重新依赖旧 contracts |
| Removed | 实现已经移除 | 未经新的阶段决策不得恢复 |
| Historical | 保留的决策或设计记录 | 不作为当前代码布局、接口或 Release Gate 的事实来源 |

Frozen 不等于废弃。
Removed 也不表示应该删除历史文档。

## 当前权威入口

以下文档描述当前代码、目标与阶段边界：

- [根 README](../README.md)：当前实现事实、目标架构与 Roadmap；
- [AGENTS.md](../AGENTS.md)：编码 Agent 必须遵守的范围与依赖规则；
- [CONTEXT.md](../CONTEXT.md)：当前 Agent source、SACS 能力与 A2UI 下一阶段；
- [ADR-0029](./adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)：当前阶段决策；
- [ADR-0028](./adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)：上一阶段 Scope Reset、native AG-UI 与 Removed/Historical 边界；
- [Web Workbench 手册](../apps/web-workbench/README.md)：当前运行、配置、交互边界与验证命令；
- [AG-UI Mock 手册](../packages/ag-ui-mock/README.md)：测试服务与 Controlled UI 场景。

发生冲突时，以 ADR-0029、ADR-0028、根 `AGENTS.md` 和当前代码为准。

## 当前实现事实

当前可执行 Agent integration 基线是：

```text
Web Workbench
  ↓
CopilotKit Runtime
  ↓
AGUIMock / single-agent-chat-server
```

不要把下一阶段 A2UI 目标误认为已经落地的代码事实。

## Accepted current target

ADR-0029 已接受目标接入边界：

```text
Web Workbench
      ↓
CopilotKit Runtime
thin Integration Layer
      ↓
┌───────────────┬──────────────────────┐
│               │                      │
AGUIMock        single-agent-chat-server
```

CopilotKit Runtime 只作为 Supporting Infrastructure，负责 Agent registration / routing、server-side credential 和最小 middleware integration。
它不承担 Thread / Turn / Operation / Runtime Truth / Recovery 等旧 Runtime Platform 职责。

## Agent sources

### AGUIMock

用于稳定证明 Workbench capability：

- Frontend Tool / `TOOL_CALL_*`；
- fixture / regression；
- failure / edge case 场景。

### single-agent-chat-server

用于真实 Business Agent interoperability，当前重点能力包括：

- AG-UI HTTP/SSE；
- streaming text / Run lifecycle；
- State Snapshot / Delta；
- Activity Snapshot / Delta；
- structured output / Artifact；
- bounded `RUN_ERROR`；
- Interrupt / Resume；
- durable Run semantics。

当前 SACS 不支持 client-provided Frontend Tools。
该差异必须显式保留，不能由 Runtime 伪造。

## Active

当前已经存在的 Active 模块：

```text
apps/copilot-runtime
apps/web-workbench
packages/ag-ui-mock
packages/ag-ui-adapter
packages/shared-types
```

`apps/copilot-runtime` 是已经落地的最小 CopilotKit Runtime Host。
不得恢复历史 `apps/agent-runtime-host` 作为捷径。

## A2UI next phase

ADR-0029 已明确允许 A2UI 重新进入 focused implementation。
推荐顺序：

```text
A2UI Renderer MVP
  ↓
Fixed Fixtures
  ↓
Basic Catalog
  ↓
Small Custom Catalog
  ↓
Theme Tokens
  ↓
SACS AgentContent → Dynamic A2UI
```

第一阶段先证明 Renderer，不先要求 Secondary LLM。
Controlled UI 与 A2UI 应尽量共用同一套真实 UI Implementation / Theme。

## Removed

以下兼容 contract 包仍保持删除：

```text
packages/compiler-contract
packages/presentation-contract
packages/runtime-contract
```

以下上一阶段实现也保持删除状态：

- Agent Runtime Host；
- Reference Business Agent；
- Business Agent Adapter；
- Presentation Pipeline；
- UI Compiler Core；
- Component Catalog Schema；
- Runtime Platform 配套脚本与 workspace architecture tests。

旧代码恢复点为 `archive/pre-scope-reset-2026-08-13` 和提交 `c33504db91614420c2ccdf26a8c707f61d659065`。
恢复点只用于历史调查，不能替代新的阶段决策。

## Deferred

以下能力仍明确延期：

- Thread / Turn / Operation Platform；
- Runtime Repository / Runtime Truth；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- runtime-owned durable history；
- 自研多 Agent orchestration platform；
- 自研 Presentation Pipeline / UI Compiler；
- 通用 GIS Agent SDK。

历史 Compiler 研究可以作为未来 Reliability / Controlled Generation 输入，但不是当前 A2UI Renderer 的前置条件。

## Historical

以下目录和文档保留历史设计价值，但不描述当前实现：

- [Compiler MVP 需求](./REQUIREMENTS.md)；
- [Compiler MVP 架构](./ARCHITECTURE.md)；
- [Compiler 系统设计](./Generative_UI_Compiler_Design.md)；
- [旧数据契约](./CONTRACTS.md)；
- [旧 Platform 文档](./platform/README.md)；
- [旧 Compiler 操作资料](./operations/)；
- [ADR-0001 至 ADR-0027](./adr/README.md) 中已被后续决策替代的部分。

历史文档中的模块路径、命令、端口、环境变量、Contract 和 Release Gate 可能已经失效。
不要静默重写 Historical 文档以匹配当前架构。

## Current roadmap

```text
Completed
#202 Controlled UI Vertical Slice
#207 Thin CopilotKit Runtime

Current
  ↓
#200 Real SACS Interoperability

Next
A2UI Renderer MVP
  ↓
Catalog + Theme
  ↓
SACS AgentContent → Dynamic A2UI

Later
Runtime Platform / controlled-generation Compiler
```

## 文档维护规则

- 当前行为或阶段决策变化时，优先就地更新当前权威入口。
- 新阶段必须新增 ADR，不静默覆盖历史决策。
- Historical 文档保留原始语境，只增加必要状态说明。
- 目标架构与当前实现必须明确区分。
- 不手工修改 `CHANGELOG.md` 或任何自动生成文件。
