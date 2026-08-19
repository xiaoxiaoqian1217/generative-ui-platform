# Repository Instructions for Coding Agents

## Current scope

当前阶段已经从单一 Controlled UI 验证推进到两步主线：

```text
Step 1
统一 Agent 服务端接入边界
Workbench → thin CopilotKit Runtime → AGUIMock / SACS

Step 2
进入 A2UI Renderer / Catalog / Theme 实践
```

已经跑通的第一条纵向场景仍然是 `locateDevice`：Agent 发起前端工具调用，Workbench 通过 `useFrontendTool` 驱动 MapLibre 定位设备。

当前阶段继续遵守：

> **先纵向跑通场景，再横向抽象公共能力。**

## Current implementation fact

当前可执行 Agent integration 基线是：

```text
Web Workbench
  ↓
CopilotKit Runtime
thin Integration Layer
  ↓
AGUIMock / single-agent-chat-server
```

不得把尚未落地的 A2UI 目标写成已经实现的代码事实。

## Accepted target architecture

ADR-0029 已接受：

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

CopilotKit Runtime 只允许承担 Supporting Infrastructure 职责：

- Agent registration / routing；
- server-side endpoint 与 credential；
- Workbench 的统一 Agent integration endpoint；
- CopilotKit / AG-UI / A2UI 所需的最小 middleware integration。

ADR-0030 在此清单上为 Dynamic A2UI 额外允许：

- 薄、确定性的 Presentation Policy；
- Secondary Presentation LLM 调用接线（基于 `@ag-ui/a2ui-toolkit`）；
- A2UI 生成结果向 AG-UI 事件流的缝合。

Issue #213 在此之上追加允许：

- source-neutral `PresentationInput` 契约与薄 AgentContent Projection（就近声明于 Runtime presentation 边界，不新建 package）；
- dev-only Scenario Lab 端点（`scenarios/` 场景 JSON 的 list/save 与真实生成运行），仅服务本地实验与评估，不承载产品运行时职责。

不得在 #207 中把它扩展为自研 Runtime Platform。

## Agent source roles

### AGUIMock

用于：

- deterministic capability fixture；
- Frontend Tool / `TOOL_CALL_*`；
- regression / failure scenarios。

### single-agent-chat-server

用于真实 Business Agent interoperability，当前重点消费：

- streaming text；
- Run lifecycle / `RUN_ERROR`；
- State Snapshot / Delta；
- Activity Snapshot / Delta；
- Artifact / structured result；
- Interrupt / Resume。

当前 SACS profile 不支持 client-provided Frontend Tools。
不得由 Runtime 或 Workbench 伪造 Tool Calling 来掩盖这一 capability gap。

## Active modules

当前已经存在：

```text
apps/
├─ copilot-runtime/
└─ web-workbench/

packages/
├─ a2ui-catalog/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

职责：

- `apps/web-workbench`：当前产品主体与交互 / Generative UI 实验场。
- `packages/a2ui-catalog`：框架无关的 Platform Catalog definitions（Metric / StatusBadge / InfoRow），仅依赖 zod 与 `@a2ui/web_core`，Workbench 与 Runtime 引用同一来源；只承载 definitions，不演变为通用 Catalog Platform。
- `packages/ag-ui-mock`：可复用 AG-UI 测试服务。
- `packages/ag-ui-adapter`：仅允许承载 AG-UI 协议边界辅助能力。
- `packages/shared-types`：最小跨模块共享类型。

`apps/copilot-runtime` 是已经落地的最小 CopilotKit Runtime Host。
不得因为历史代码存在就恢复 `apps/agent-runtime-host`。

## Removed compatibility contracts

以下迁移期契约已经解除依赖并删除，不要重新创建：

```text
packages/compiler-contract/
packages/presentation-contract/
packages/runtime-contract/
```

Workbench 使用 CopilotKit / 原生 AG-UI 契约。
AG-UI Adapter 只使用 `@ag-ui/core` 原生契约。

## A2UI phase admission

ADR-0029 已经明确允许 A2UI 重新进入 focused implementation。
ADR-0030 将 Dynamic A2UI（受控内容）提前到 Theme Tokens 之前，当前顺序为：

```text
A2UI Renderer MVP（已完成）
  ↓
Fixed Fixtures（已完成）
  ↓
Basic Catalog（已完成）
  ↓
Platform Catalog MVP（已完成）
  ↓
Dynamic A2UI MVP（受控内容，Issue #210）
  ↓
真实 SACS AgentContent → Dynamic A2UI
```

Theme Tokens 不再是 Dynamic A2UI 的前置条件，按真实需要后置。

约束：

- Renderer 已先于 Secondary LLM 证明；Secondary LLM 只在 ADR-0030 / Issue #210 的受控边界内接入（受控内容源 + 确定性 Presentation Policy），不先接 SACS；
- 优先复用 CopilotKit Basic Catalog / 现成 Renderer 能力；
- Custom Catalog 优先增加 Metric / StatusBadge / InfoRow 等高复用展示语义；
- DeviceCard / AlarmCard / TaskCard 只有出现真实复用后再抽成公共能力；
- Controlled UI 与 A2UI 尽量复用同一套真实 UI implementation / Theme；
- 不为了做 A2UI 恢复旧 Compiler / Presentation contracts。

## Frozen architecture

以下 Workbench 能力继续保留：

- Playground / Inspect / Cases / Catalog / Scenarios / Settings 路由；
- 已接受的 Workbench shell 与 inspection 原型基线；
- case-library 与 inspection 支持。

与 A2UI Renderer / Catalog / Theme 直接相关的能力，在 ADR-0029 后可以按当前阶段目标进行 focused implementation。
Inspect 等其他能力仍不得借机恢复旧 Runtime Platform。

## Removed architecture

不要重新创建或恢复以下模块，除非用户明确开启新的架构阶段：

- `apps/agent-runtime-host`；
- `apps/business-agent-langgraph`；
- `packages/business-agent-adapter`；
- `packages/component-catalog-schema`；
- `packages/presentation-pipeline`；
- `packages/ui-compiler-core`；
- Runtime Platform 配套脚本与 Workspace 架构测试。

旧代码恢复点：

```text
archive/pre-scope-reset-2026-08-13
c33504db91614420c2ccdf26a8c707f61d659065
```

历史 Compiler 研究可以作为以后 Reliability / Controlled Generation 的设计输入，但不是当前 A2UI Renderer 的前置条件。

## Out of scope for the current phase

除非新的真实需求明确证明必要，不实现：

- Thread / Turn / Operation 平台模型；
- Runtime Repository；
- Runtime Truth；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- runtime-owned durable history；
- 自研 Business Agent；
- 自研 Presentation Pipeline；
- 自研 UI Compiler；
- 多 Agent orchestration platform；
- 通用 GIS Agent SDK。

## Feature admission gate

任何新 Issue / PR / 模块必须优先回答：

1. 是否直接服务 #207 Agent integration、#200 Real Agent interoperability 或下一阶段 A2UI 验证？
2. 是否由已经跑通或正在验证的真实场景提出？
3. 是否可以先在 `web-workbench` 内最小实现，再根据第二个真实消费者抽象？
4. CopilotKit / AG-UI / A2UI 已经提供的能力是否可以直接复用？
5. 是否正在无意中恢复旧 Runtime / Compiler / Presentation Platform？

没有真实复用证据时，不提前建立自研平台层、通用 Catalog Package、Compiler 或 Runtime 抽象。

## Dependency rules

- Apps 可以依赖 packages，packages 不得依赖 apps。
- Workbench 优先使用 CopilotKit 提供的 Frontend / Runtime / A2UI 能力，不重复实现框架已有职责。
- CopilotKit Runtime 是 Supporting Infrastructure，不拥有产品 Runtime Truth。
- AG-UI Mock 只模拟 Business Agent 的协议行为，不承载产品 Runtime。
- SACS capability gap 必须显式呈现，不伪造协议能力。
- GIS 实现属于浏览器前端；Agent 只看到稳定的 Frontend Tool capability。
- 不执行模型生成的任意 HTML / JavaScript。

## Current roadmap

```text
Completed
#202 Controlled UI Vertical Slice
#207 Thin CopilotKit Runtime
#206 A2UI Renderer MVP
#209 Platform Catalog MVP
#210 Dynamic A2UI MVP (controlled content)

Current
  ↓
#200 Real SACS Interoperability
#213 Generative UI Scenario & Evaluation MVP

Next
SACS AgentContent → Dynamic A2UI

Postponed per ADR-0030
Theme Tokens (no longer a prerequisite for Dynamic A2UI)

Later
Runtime Platform / controlled-generation Compiler
```

## Branch and change safety

- 默认目标分支为 `dev_1.0`。
- 修改前检查当前范围，不因为历史文档存在就恢复已删除架构。
- 大范围架构变更需要用户明确授权。
- 当前阶段决策以 ADR-0029 为主；ADR-0030 调整 A2UI 阶段顺序并扩展 Runtime 的 Presentation 职责白名单；ADR-0028 继续约束 native AG-UI、Removed/Historical 边界与已删除 contracts。
- Historical 文档不是当前实现规范。

## Markdown 文档规范

- GitHub Issue / PR 引用不得以裸 `#123` 开头一行（会被 Markdown 解析为 ATX 标题并触发 MD018）。
- 使用 `Issue #123`、`PR #123`，或在句子中间引用 `#123`。
- 修改任何 Markdown 文档后、提交前必须执行 `pnpm docs:lint`，不等 CI 才发现问题。
