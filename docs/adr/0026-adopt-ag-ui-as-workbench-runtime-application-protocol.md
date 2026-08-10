# ADR-0026：采用 AG-UI 作为 Workbench 与 Runtime Host 的唯一 Agent 应用协议

- **状态：** 已接受
- **日期：** 2026-08-10
- **来源决策：** #182

## 背景

平台早期为了快速打通全链路，曾同时暴露 CopilotKit Headless、`/api/runs`、`/ws/runs` 和 Action 端点。
部分 Goal、README 和 ADR-0020 因此把 HTTP、WebSocket 和 CopilotKit 描述成映射到同一 RunOrchestrator 的并列运行入口。

随着平台从 Run-centric 编排演进到 ADR-0024 定义的 Runtime Truth Model，这种表述暴露出两个问题。

第一，AG-UI 与 HTTP、SSE、WebSocket 不属于同一抽象层级。
AG-UI 定义 Agent 交互事件和语义，HTTP、SSE、WebSocket 只负责承载这些语义。

第二，如果按传输方式维护多套 Workbench Agent 入口，会把 Transport 差异扩散到 Runtime Domain，并诱导调用方绕过统一的 PlatformRunService、Runtime Kernel、Command Admission 和 Surface 生命周期。

Issue #182 已接受以下平台方向：Workbench 与 Agent Runtime Host 之间以 AG-UI 作为唯一 Agent 交互协议，当前参考实现采用 CopilotKit Runtime 的 HTTP POST + SSE 路径，HTTP、SSE 和 WebSocket 只作为传输机制。
本文将该决定正式固化为 ADR，并明确与 ADR-0020、ADR-0022 和 ADR-0024 的关系。

## 第一性原理

### 1. 应用协议负责交互语义，Transport 只负责传递

平台必须分别回答两个问题。

```text
传什么语义？
→ AG-UI

通过什么网络机制传？
→ HTTP POST + SSE / WebSocket / 其他受控 Transport
```

更换 Transport 不应改变 Thread、Turn、Operation、Command、Surface 或 Presentation 的领域语义。

### 2. 浏览器只应看到一个 Agent 交互边界

Workbench 的核心职责是消费 Runtime Host 的 Agent 交互投影，而不是根据网络协议选择不同业务编排。
因此 Workbench 不应同时维护 HTTP Agent Contract、WebSocket Agent Contract 和 AG-UI Contract 三套业务心智。

### 3. Runtime Domain 不应由框架或传输拥有

CopilotKit Runtime、AG-UI、HTTP/SSE 和未来 WebSocket 都属于 Adapter / Infrastructure。
Runtime Truth 仍由 Runtime Host 的 Runtime Kernel 和 Runtime Repository 管理。

### 4. Business Agent 私有协议与 Workbench Agent 协议是两个边界

Business Agent 不需要原生实现 AG-UI。
Runtime Host 通过 Business Agent Adapter 隔离其 HTTP + SSE、WebSocket、进程内调用或其他私有协议。
这些协议不得直接暴露给 Workbench。

## 决策

### 1. AG-UI 是唯一 Workbench Agent 应用协议

Generative UI Workbench 与 Agent Runtime Host 之间的 Agent 交互必须使用 AG-UI。
Workbench 不再把自定义 HTTP Run Contract、WebSocket Run Contract 或其他私有事件协议视为与 AG-UI 并列的 Agent 应用协议。

```text
Generative UI Workbench
        │
        │ AG-UI
        ▼
Agent Runtime Host
```

### 2. 当前参考 Transport 为 HTTP POST + SSE

当前参考实现由嵌入 Agent Runtime Host 的 CopilotKit Runtime 提供 AG-UI 入口。
Workbench 通过 Runtime Host 的 CopilotKit / AG-UI Endpoint 进行 Agent 交互。
当前默认承载方式为 HTTP POST + SSE。

```text
Workbench
   │ AG-UI
   │ over HTTP POST + SSE
   ▼
Embedded CopilotKit Runtime
   ▼
PlatformRunService
   ▼
Runtime Kernel
```

### 3. HTTP、SSE、WebSocket 只是 Transport

HTTP、SSE 和 WebSocket 不与 AG-UI 作为同一层级的业务协议并列。
未来如果需要低延迟或长连接，可以实现 `AG-UI over WebSocket`，但只能替换 Transport Adapter，不得复制 Runtime Kernel、Runtime Repository、Command Admission 或业务状态机。

如果迁移期仍保留 `/api/runs`、`/ws/runs`、`/api/actions` 等旧端点，它们只能作为 compatibility / debug adapter 存在。
这些端点不得成为新的 Workbench 规范入口，也不得形成第二套 Agent 业务协议。
所有兼容入口最终必须收敛到同一个 PlatformRunService / Runtime Kernel 领域语义。

### 4. 普通 REST 继续用于非 Agent 查询能力

以下能力可以继续通过普通 REST 暴露，并不构成第二套 Agent 交互协议：

- Health；
- Catalog / Scenarios / Settings；
- Thread / Turn / Operation / Surface Snapshot；
- TurnDetailsResponse；
- Diagnostic Artifact；
- Diagnostic Bundle Export。

### 5. Business Agent Adapter 可以使用独立私有 Transport

Runtime Host 与 Business Agent 之间不要求 AG-UI。
Business Agent Adapter 可以适配 HTTP + SSE、WebSocket、进程内调用或其他私有协议。

```text
Workbench
   │ AG-UI
   ▼
Runtime Host
   │
   │ Business Agent Adapter SPI
   │ HTTP+SSE / WebSocket / in-process / ...
   ▼
Business Agent
```

Business Agent 私有 Transport 不得暴露给 Workbench，也不得改变 Runtime Truth 所有权。

### 6. CopilotKit Runtime 是可替换 Adapter / Infrastructure

CopilotKit Runtime 继续嵌入 Agent Runtime Host，并提供当前 AG-UI 入口和标准运行时能力。
CopilotKit 不拥有 Thread、Operation、Surface、Command 幂等、Presentation 决策或 Business Agent 私有状态。
替换 CopilotKit 时，Runtime Kernel、Runtime Repository、Business Agent Adapter 和 Presentation Pipeline 的领域语义不得被迫改变。

## 与既有 ADR 的关系

### ADR-0020

本 ADR **部分取代 ADR-0020** 中“CopilotKit、HTTP、WebSocket 作为并列 Run 入口并共享 RunOrchestrator”的旧表述。
ADR-0020 关于以下决定继续有效：

- Workbench 只连接 Agent Runtime Host；
- Workbench 采用受控 CopilotKit Headless 集成；
- Catalog、场景、Runtime Snapshot 等非 Agent 数据通过 Runtime Host 的只读契约获取；
- 浏览器不直接读取 Business Agent、Presentation Pipeline、内部 Package 或模型供应商配置。

### ADR-0022

本 ADR **不取代 ADR-0022**。
ADR-0022 描述的是 `Runtime Host ↔ Business Agent` 的私有 Adapter Transport，而不是 `Workbench ↔ Runtime Host` 的 Agent 应用协议。

### ADR-0024

本 ADR不改变 ADR-0024 的 Runtime Truth Model。
AG-UI 和 Transport 都只是 Runtime Truth 的投影与接入适配，不拥有 Thread、Turn、Operation、Command 或 Surface 权威状态。

### ADR-0025

本 ADR不改变 Presentation Integration 与 Agent Runtime Integration 两种外部接入模式。
本 ADR只约束 Agent Runtime Integration 中官方 Workbench 与 Runtime Host 的 Agent 交互边界。

## 迁移规则

现有实现允许渐进迁移，但新增文档和功能必须遵守以下规则：

- 新 Workbench Agent 功能只接入 AG-UI；
- 不新增与 AG-UI 并列的 HTTP 或 WebSocket Agent 业务协议；
- 旧 `/api/runs`、`/ws/runs`、`/api/actions` 如仍存在，必须标记为 compatibility / debug path；
- 新 Runtime Domain 逻辑不得直接绑定某一种 Transport；
- Workbench 不再提供以“HTTP 模式 / WebSocket 模式”为业务语义的用户选择；
- 如果未来实现 AG-UI over WebSocket，应通过 Transport Adapter 完成，并保持上层 AG-UI 与 Runtime Domain 语义不变；
- Business Agent Adapter 的 HTTP + SSE / WebSocket 选择继续属于 Runtime Host 内部接入配置。

## 后果

- Workbench 获得单一、稳定的 Agent 交互契约。
- HTTP、SSE 和 WebSocket 的替换不会扩散成新的 Runtime 状态机。
- CopilotKit 可以作为当前实现继续使用，同时保持 Runtime Domain 可替换性。
- Business Agent 可以保持自身协议，不被迫实现 AG-UI。
- 旧开发环境和 Goal 中的 HTTP/WebSocket 双入口描述需要显式标记为历史或 compatibility 语义。
- 自动化测试可以继续覆盖底层 Transport Adapter，但不得把这些测试解释为多套 Agent 应用协议。
