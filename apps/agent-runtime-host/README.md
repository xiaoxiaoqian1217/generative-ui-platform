<!-- cspell:ignore doubao qwen -->

# Agent Runtime Host

## 当前定位

`apps/agent-runtime-host` 当前保留为 Generative UI Platform 的 **Reference Integration Host**。

它的当前主要作用是把参考 Business Agent、Framework Integration 和 Presentation Pipeline 组装成可运行链路。
它不是 ADR-0027 下的 Generative UI Core 产品边界。

当前 North Star 仍然是：

```text
Final AgentContent
→ Presentation Pipeline
→ Presentation Model
→ untrusted UI Plan Candidate
→ UI Compiler Core
→ trusted Presentation
```

Runtime Host 的存在用于支持和验证这条链路，而不是要求当前阶段继续建设完整 Agent Runtime Platform。

## 当前 Active Responsibilities

Runtime Host 当前可以继续负责：

- 承载当前 CopilotKit Runtime / AG-UI 参考入口；
- 隔离 Business Agent 私有 HTTP + SSE / WebSocket 协议；
- 在服务端持有 Presentation Model Provider 凭据；
- 组装 Presentation Pipeline；
- 把最终 AgentContent 送入 Presentation Pipeline；
- 为 Workbench 和 E2E 提供 Reference Integration；
- 保持已有 Runtime Integration 路径的兼容和安全行为。

Runtime Host MUST NOT：

- 承担 Business Agent 的业务推理；
- 修改 Business Truth；
- 直接生成 trusted A2UI；
- 绕过 Presentation Pipeline / UI Compiler Core；
- 让 CopilotKit 定义 Presentation Core 语义。

## Deferred Runtime Platform

当前代码已经包含之前 Runtime-first 阶段形成的：

- Runtime Kernel；
- Runtime Repository；
- Thread；
- Turn；
- Operation；
- Surface Lifecycle；
- Command Admission；
- Runtime Event Projection；
- Recovery / Reconcile；
- Diagnostics。

这些设计继续有效于已有或未来 Agent Runtime Integration。
但 ADR-0027 将它们从当前 MVP Release Gate 中移出。

当前阶段禁止无新的明确范围决策继续扩展：

- Runtime Thread / Turn / Operation 产品语义；
- Runtime Repository 产品能力；
- Surface Lifecycle 新能力；
- Command Admission 新能力；
- Runtime-owned Conversation Service；
- Reconcile；
- Runtime Recovery；
- 完整 Diagnostic Platform。

本次 Scope Reset 不要求立即删除这些代码。

已有路径继续存在期间仍必须遵守 ADR-0024 的安全不变量。
Scope Reset 改变的是产品优先级，不降低已经存在的 Action / Surface / Command 安全边界。

## Framework Integration

当前参考 Workbench Agent 集成仍采用：

```text
Workbench
   │ AG-UI
   │ current transport: HTTP POST + SSE
   ▼
Agent Runtime Host
```

ADR-0026 继续约束这条参考路径。

Business Agent 不要求实现 AG-UI。

```text
Agent Runtime Host
   │ private Business Agent Adapter
   │ HTTP + SSE / WebSocket / ...
   ▼
Business Agent
```

Business Agent Adapter 只做：

- Contract Validation；
- Correlation Mapping；
- Protocol Mapping；
- Public Event Mapping。

它不得总结、改写或重新解释 Business Agent 的最终业务内容。

CopilotKit 和 AG-UI 属于 Supporting Integration。
如果未来不再使用 CopilotKit，应替换 Integration Adapter，而不是修改 Presentation Pipeline、UI Compiler Core 或 Component Catalog 的核心语义。

## Presentation Pipeline

Runtime Host 当前继续以内嵌 Package 方式使用 Presentation Pipeline。

```text
Final AgentContent
        ↓
Embedded Presentation Pipeline
        ├── Markdown
        │     ↓
        │ safe Markdown PresentationResult
        │
        └── Structured Business Data
                 ↓
          Presentation Model Adapter
                 ↓
          untrusted UI Plan Candidate
                 ↓
          UI Compiler Core
                 ↓
          trusted A2UI PresentationResult
```

Business Agent 公开过程事件与最终 AgentContent 必须继续区分。
Presentation Model 不得从私有 Business Agent State 或内部 Tool Trace 推断新的业务事实。

## 运行要求

- Node.js 24 或更高版本；
- pnpm 10.13.1；
- 一个满足 Business Agent Contract 的 Reference / Remote Business Agent；
- 开发运行所需的 Presentation Model Provider 配置。

## 配置

`BUSINESS_AGENT_TRANSPORT` 默认值为 `http-sse`。
设置为 `websocket` 时，只改变 Runtime Host ↔ Business Agent 的 Supporting Adapter Transport。
它不改变 Generative UI Core。

常用变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | HTTP 监听地址 |
| `PORT` | `8200` | Integration Host 监听端口 |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | 当前 Supporting AG-UI 参考入口 |
| `BUSINESS_AGENT_ID` | `business-agent` | Reference Business Agent 标识 |
| `BUSINESS_AGENT_CONTRACT_URL` | `http://localhost:8300` | Business Agent Adapter 私有 Contract 地址 |
| `BUSINESS_AGENT_TRANSPORT` | `http-sse` | 私有 Adapter Transport |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` | CopilotKit 匿名遥测开关 |
| `PRESENTATION_MODEL_PROVIDER` | 无 | Presentation Model Provider |
| `PRESENTATION_MODEL_REGISTRATION_ID` | `<provider>-primary` | Provider Registry ID |
| `PRESENTATION_MODEL_NAME` | 无 | 真实模型名 |
| `PRESENTATION_MODEL_BASE_URL` | Provider 默认值 | HTTPS Base URL |
| `PRESENTATION_MODEL_ENDPOINT_ID` | 无 | 可选 Endpoint ID |
| `PRESENTATION_MODEL_API_KEY` | 无 | 仅服务端读取的 API Key |
| `PRESENTATION_MODEL_TIMEOUT_MS` | `10000` | Presentation Model 超时 |
| `PRESENTATION_MODEL_RETRY_COUNT` | `0` | Presentation Model 有限重试 |

旧 Runtime Platform 配置如果仍被当前代码使用，可以继续保留兼容。
它们不自动成为当前产品需求。

## 启动

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm --filter @generative-ui/agent-runtime-host dev
```

健康检查：

```text
http://localhost:8200/health
http://localhost:8200/health/dependencies
```

## 当前网络入口

当前 Supporting Agent Integration：

```text
POST /api/copilotkit
```

普通 REST 可以继续用于开发和 Supporting 查询，例如：

```text
GET /health
GET /health/dependencies
GET /api/catalog
GET /api/scenarios
```

迁移期存在的：

```text
POST /api/runs
POST /api/actions
ws://localhost:8200/ws/runs
```

只属于 compatibility / debug path。
它们不得因为继续存在而驱动新的 Runtime Platform 产品范围。

## 当前代码迁移原则

1. 不先大规模删除 Runtime Platform 代码；
2. 不新增 Deferred Runtime 功能；
3. 保持 Presentation 主链路和现有安全测试通过；
4. 新工作优先投入 Presentation、Compiler、Theme、Workbench Lab 和 Reliability；
5. 后续通过独立 Issue 决定旧 Runtime 代码保留、隔离或删除。

## 相关文档

- [ADR-0027：Presentation-first Scope Reset](../../docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台需求](../../docs/platform/REQUIREMENTS.md)
- [平台架构](../../docs/platform/ARCHITECTURE.md)
- [ADR-0025：双外部接入模式](../../docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0024：Deferred Runtime Truth / Command Admission](../../docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：当前 AG-UI 参考集成](../../docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
