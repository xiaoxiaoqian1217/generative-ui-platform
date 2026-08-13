# Generative UI Platform

Generative UI Platform 当前聚焦两类互补能力：

> **确定性交互使用 Frontend Tool / Controlled UI；不确定业务结果展示逐步进入 A2UI / Generative UI。**

当前阶段先统一真实 Agent 的服务端接入边界，再进入 A2UI Renderer、Catalog 与 Theme 实践。

## 已验证能力

第一条纵向场景已经跑通：

```text
用户：定位无人机 01
        ↓
AGUIMock
        ↓ AG-UI TOOL_CALL
CopilotKit useFrontendTool("locateDevice")
        ↓
MapLibre 定位设备
        ↓
DeviceCard / Frontend Tool Result
```

这条场景证明：

```text
AG-UI
  ↓
CopilotKit Frontend Tool
  ↓
真实浏览器能力
```

可以成立。

当前仍坚持：

> **先纵向跑通场景，再基于真实复用证据横向抽象公共能力。**

## 当前架构方向

### 当前可执行基线

仓库当前通过 thin CopilotKit Runtime 暴露统一 Agent integration endpoint：

```text
Web Workbench
   ↓
CopilotKit Runtime
   ↓
AGUIMock / single-agent-chat-server
```

### 已接受的目标接入边界

根据 ADR-0029，仓库已经引入一个 **薄 CopilotKit Runtime Integration Layer**：

```text
┌──────────────────────────────────────┐
│ Web Workbench                        │
│ CopilotKit Frontend / A2UI Renderer  │
└──────────────────┬───────────────────┘
                   │
                   ▼
          ┌───────────────────┐
          │ CopilotKit Runtime│
          │ thin integration  │
          └─────────┬─────────┘
                    │
          ┌─────────┴───────────────┐
          ▼                         ▼
      AGUIMock          single-agent-chat-server
      Test Agent             Real Agent
```

CopilotKit Runtime 在当前阶段只负责：

- Agent registration / routing；
- server-side endpoint 与 credential；
- Workbench 到不同 Agent 的统一服务端接入；
- CopilotKit / AG-UI / 后续 A2UI 所需的最小 middleware 集成。

它不是之前的自研 Runtime Platform。

## Agent Source 边界

### AGUIMock

用于稳定验证 Workbench capability：

- Frontend Tool / `TOOL_CALL_*`；
- fixture / regression；
- failure / edge case 场景。

### single-agent-chat-server

作为真实 Business Agent 互操作目标，当前已具备：

- AG-UI HTTP/SSE；
- streaming text / Run lifecycle；
- State Snapshot / Delta；
- Activity Snapshot / Delta；
- structured output / Artifact；
- bounded `RUN_ERROR`；
- Interrupt / Resume；
- durable Run 语义。

当前 SACS profile **不支持 client-provided Frontend Tools**。
这是 Real Agent interoperability gap，不是 Workbench capability 的删除理由。

## 当前模块

### Active

```text
apps/
├─ copilot-runtime/
└─ web-workbench/

packages/
├─ ag-ui-mock/
├─ ag-ui-adapter/
└─ shared-types/
```

- `web-workbench`：当前产品主体与交互 / Generative UI 实验场。
- `ag-ui-mock`：可复用 AG-UI 测试服务。
- `ag-ui-adapter`：仅承载 AG-UI 协议边界辅助能力。
- `shared-types`：真正跨模块使用的最小共享类型。

`apps/copilot-runtime` 是已经落地的最小 Runtime Host，并保持 Supporting Infrastructure 边界。

### Removed compatibility contracts

以下迁移期契约已经解除依赖并删除：

```text
packages/
├─ compiler-contract/
├─ presentation-contract/
└─ runtime-contract/
```

Workbench 继续使用 CopilotKit / 原生 AG-UI 契约。
不得为了 Runtime 或 A2UI 重新创建这些兼容合同。

## A2UI 下一阶段

统一 Agent 接入边界已经建立，主线进入：

```text
A2UI Renderer MVP
        ↓
Fixed A2UI Fixture
        ↓
Basic Catalog
        ↓
Small Custom Catalog
        ↓
Theme Tokens
        ↓
SACS AgentContent → Dynamic A2UI
```

第一步只证明 Renderer 和 Catalog 能稳定工作，不先引入 Secondary LLM。

Controlled UI 与 A2UI 应尽量复用同一套真实 UI Implementation / Theme：

```text
Frontend Tool ──────┐
                    ▼
                 Real UI
                    ▲
A2UI Renderer ──────┘
```

二者区别在于“谁决定怎么展示”，而不是维护两套 Button / Card / Theme。

## Deferred Runtime Platform

以下仍明确延期：

- Thread / Turn / Operation 平台模型；
- Runtime Repository；
- Runtime Truth；
- Surface Lifecycle；
- Command Admission；
- Recovery / Reconcile；
- runtime-owned durable history；
- 自研多 Agent orchestration platform。

CopilotKit Runtime 不得演化成上述平台。

## 已移除的旧方向

当前不恢复：

- Agent Runtime Host；
- Reference Business Agent；
- Business Agent Adapter；
- Presentation Pipeline；
- UI Compiler Core；
- Component Catalog Schema；
- Runtime Platform 配套启动、环境和 E2E 脚本。

删除前的完整代码保存在：

```text
archive/pre-scope-reset-2026-08-13
```

基线提交：`c33504db91614420c2ccdf26a8c707f61d659065`。

历史 Compiler 研究仍可作为以后 Reliability / Controlled Generation 的输入，但不是当前 A2UI Renderer 的前置条件。

## 当前 Roadmap

```text
Completed
#202 Controlled UI Vertical Slice
AGUIMock + Frontend Tool + MapLibre + DeviceCard
#207 Thin CopilotKit Runtime Integration

Current
  ↓
#200 Real SACS Interoperability

Next
A2UI Renderer MVP
  ↓
Catalog + Theme
  ↓
SACS AgentContent → Dynamic A2UI

Later, only when evidence requires it
Runtime Platform / controlled-generation Compiler
```

## 开发原则

新增能力前优先回答：

1. 它是否直接服务当前 Agent integration 或下一阶段 A2UI 验证？
2. 它是否来自已经跑通或正在验证的真实场景？
3. 能否先在 Workbench 内最小实现，再根据第二个真实消费者抽象？
4. 框架已经提供的 Runtime / Renderer / Catalog 能力是否可以直接复用？

没有真实复用证据时，不提前建设自研 Runtime Platform、Compiler 或通用业务 SDK。

## 快速开始

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` 启动 Web Workbench、AG-UI Mock 和 thin CopilotKit Runtime。
输入 `连接测试` 或 `定位无人机 01` 可以验证 AGUIMock 场景。
Workbench 中的 Agent Source 选择器可以切换到 `single-agent-chat-server`。
真实 SACS 的服务端环境变量和 smoke test 见 [`apps/copilot-runtime/README.md`](./apps/copilot-runtime/README.md)。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm docs:check
```

## 文档

- [当前文档导航](./docs/README.md)；
- [当前阶段决策 ADR-0029](./docs/adr/0029-adopt-thin-copilotkit-runtime-and-activate-a2ui-next-phase.md)；
- [上一阶段 Scope Reset ADR-0028](./docs/adr/0028-use-native-ag-ui-and-retire-compatibility-contracts.md)；
- [Web Workbench 手册](./apps/web-workbench/README.md)；
- [AG-UI Mock 手册](./packages/ag-ui-mock/README.md)。
