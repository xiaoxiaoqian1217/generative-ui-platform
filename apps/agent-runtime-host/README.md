<!-- cspell:ignore doubao qwen -->

# Agent Runtime Host

## 开发者入口

先启动 Reference Business Agent，再在本目录运行 `pnpm dev`。

开发命令加载 `.env` 与 `.env.local`，进程环境变量优先。
开发运行必须配置真实 Presentation Model 的服务端凭证。

成功后检查：

- `http://127.0.0.1:8200/health`；
- `http://127.0.0.1:8200/health/dependencies`。

停止前台进程使用 Ctrl+C。
真实 Provider 前先运行 `pnpm check:doctor -- --provider`，并只在服务器进程中设置密钥。

`BUSINESS_AGENT_UNREACHABLE` 表示 8300 服务尚未启动或 `BUSINESS_AGENT_CONTRACT_URL` 不正确。

`apps/agent-runtime-host` 是 Generative UI Platform 的前端统一后端入口、CopilotKit Runtime 宿主和 Runtime 交互事实权威。
它负责组装 Runtime Kernel、Business Agent Adapter、Runtime Repository、Embedded Presentation Pipeline 和 Runtime Event Projection。

> 当前实现属于 Developer Preview。
> 默认仅监听本机回环地址，生产级认证、授权、TLS、审计和多租户能力仍不在当前范围内，不得直接暴露到公网。

## 协议与职责边界

Workbench 与 Runtime Host 之间的唯一 Agent 应用协议是 **AG-UI**。
当前参考实现由嵌入 Runtime Host 的 CopilotKit Runtime 提供 AG-UI Endpoint，并使用 HTTP POST + SSE 作为默认 Transport。
HTTP、SSE 和 WebSocket 只属于 Transport，不与 AG-UI 作为并列业务协议。

Runtime Host 与 Business Agent 之间是另一条边界。
Business Agent **不需要实现 AG-UI**。
`BusinessAgentAdapter` 可以通过 HTTP + SSE、WebSocket 或未来其他私有协议接入 Business Agent，并把公开业务事件映射为统一平台事件。
这些 Business Agent 私有协议不会暴露给 Workbench。

```text
Generative UI Workbench
          │
          │ AG-UI
          │ over HTTP POST + SSE
          ▼
Agent Runtime Host
├── Embedded CopilotKit Runtime
├── PlatformRunService
│     ▼
│   Runtime Kernel
│   ├── Runtime Repository
│   │   ├── Thread
│   │   ├── Turn
│   │   ├── Operation
│   │   ├── Command Admission
│   │   └── Surface Lifecycle / Presentation Snapshot
│   ├── Business Agent Adapter
│   │     │ private HTTP+SSE / WebSocket / ...
│   │     ▼
│   │   Business Agent
│   └── Embedded Presentation Pipeline
│         ├── Presentation Router / Model Adapter
│         └── UI Compiler Core
└── Runtime Event Projection
      ├── AG-UI → Workbench
      └── Diagnostics → Diagnostic Recorder
```

Runtime Host 不承担 Business Agent 的业务推理、后端工具或业务副作用事实。
Business Agent 拥有自己的业务 State、Checkpoint 和工具执行语义。

Runtime Host 也不自行生成 UI Plan 或直接编译 A2UI。
最终 `AgentContent` 进入 Embedded Presentation Pipeline；只有结构化 Generative UI 分支才进入 Presentation Router、Model Adapter 和 UI Compiler Core。
UI Compiler Core 仍是唯一可信 A2UI 生产者。

CopilotKit Runtime 是 Adapter / Infrastructure，而不是第二套 Runtime Truth。
它不拥有 Thread、Operation、Surface、Command 幂等或 Presentation 决策。

## Runtime Truth 与 Action

Runtime Host 是以下交互事实的权威来源：

- Runtime Thread；
- Turn；
- Operation；
- Command Admission / Idempotency；
- Surface Lifecycle；
- 已验证 Presentation Snapshot。

浏览器只提出 Command，不提供权威内部 Run 上下文。
新 Action 路径应收敛为：

```text
commandId
surfaceId
actionId
expectedRevision
input
```

Runtime Host 根据 `surfaceId` 从 Runtime Repository 解析 thread、turn、operation、Presentation 和 Business Agent 恢复关联信息。
客户端 `runId` 只能作为 compatibility / correlation 字段存在，不得决定内部执行上下文。

Command Admission 的权威语义以 ADR-0024 为准。
已经 `consumed` 的 Surface 不会因为 Business Agent 后续失败而自动恢复为 `actionable`。
当 Runtime Host 无法证明业务副作用是否已经发生时，Operation Outcome 使用 `indeterminate`，而不是盲目归类为普通失败并重试。

## 运行要求

- Node.js 24 或更高版本；
- pnpm 10.13.1；
- 一个满足 Business Agent Contract 的远程 Business Agent；
- 开发运行所需的 Presentation Model Provider 配置。

## 配置

`BUSINESS_AGENT_TRANSPORT` 默认值为 `http-sse`。
设置为 `websocket` 时，Runtime Host 使用 Business Agent WebSocket Contract。
这个配置只影响 `Runtime Host ↔ Business Agent` 私有 Adapter Transport，不改变 `Workbench ↔ Runtime Host` 的 AG-UI 应用协议。

将 `.env.example` 中的值复制到启动进程的环境变量中。
开发命令会加载应用目录的 `.env` 与 `.env.local`；生产 `start` 应由部署系统显式注入环境变量。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | HTTP 监听地址；仅在已有认证、TLS、受控 CORS 和 Origin 校验的部署边界内改为非回环地址。 |
| `PORT` | `8200` | Runtime Host 监听端口。 |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | Workbench 使用的 CopilotKit / AG-UI Runtime 路径。 |
| `BUSINESS_AGENT_ID` | `business-agent` | Business Agent 的稳定接入标识；不代表浏览器直连 Agent。 |
| `BUSINESS_AGENT_CONTRACT_URL` | `http://localhost:8300` | Runtime Host 通过 Business Agent Adapter 使用的私有 Contract 基址。 |
| `BUSINESS_AGENT_TRANSPORT` | `http-sse` | Runtime Host 到 Business Agent 的私有 Transport，可切换为 `websocket`。 |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` | 是否关闭 CopilotKit 匿名遥测。 |
| `PRESENTATION_MODEL_PROVIDER` | 无 | `kimi`、`doubao`、`glm`、`qwen` 或 `openai-compatible`。 |
| `PRESENTATION_MODEL_REGISTRATION_ID` | `<provider>-primary` | Provider Registry 中的稳定注册 ID。 |
| `PRESENTATION_MODEL_NAME` | 无 | 真实 Provider 的模型名。 |
| `PRESENTATION_MODEL_BASE_URL` | Provider 默认值 | HTTPS Base URL；`openai-compatible` 必须显式提供。 |
| `PRESENTATION_MODEL_ENDPOINT_ID` | 无 | 可选部署 Endpoint ID，与模型名分离。 |
| `PRESENTATION_MODEL_API_KEY` | 无 | 仅服务端读取的 API Key，不得暴露到浏览器或日志。 |
| `PRESENTATION_MODEL_TIMEOUT_MS` | `10000` | Presentation Router 超时，范围为 1 至 300000 毫秒。 |
| `PRESENTATION_MODEL_RETRY_COUNT` | `0` | Presentation Router 有限重试次数，范围为 0 至 3。 |
| `RUNTIME_TOTAL_TIMEOUT_MS` | `15000` | 单次 Runtime Operation 的总超时预算，范围为 1 至 300000 毫秒。 |
| `RUNTIME_MAX_CONCURRENT_RUNS` | `16` | 兼容配置名；约束 Runtime Host 同时接受的运行工作量。 |
| `RUNTIME_THREAD_DATABASE_PATH` | `.platform/runtime-threads.sqlite` | 本地开发 Runtime Repository / Thread 数据文件位置。 |

真实 Provider 模式要求模型名和 API Key，`openai-compatible` 还要求显式 Base URL。
切换 Provider 只需修改服务端配置，不需要修改 Runtime Kernel 或 UI Compiler Core。

## 启动

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm --filter @generative-ui/agent-runtime-host dev
```

健康检查地址为 `http://localhost:8200/health`。
依赖健康检查地址为 `http://localhost:8200/health/dependencies`。

## 网络入口

### Workbench Agent 交互

规范入口：

```text
POST /api/copilotkit
```

该入口由 Embedded CopilotKit Runtime 提供 AG-UI 交互，当前使用 HTTP POST + SSE Transport。
Workbench 新增 Agent 功能应只基于这一 AG-UI 边界。

### 非 Agent 查询

普通 REST 可以继续用于 Health、Catalog、Scenarios、Runtime Snapshot、Diagnostics 和 Artifact 等查询能力。
例如当前开发环境包含：

```text
GET /health
GET /health/dependencies
GET /api/catalog
GET /api/scenarios
```

这些 REST API 不构成第二套 Agent 交互协议。

### Compatibility / Debug 入口

迁移期实现中如果仍保留以下端点：

```text
POST /api/runs
POST /api/actions
ws://localhost:8200/ws/runs
```

它们属于 compatibility / debug adapter。
它们可以继续用于旧测试、兼容调用或 Transport 验证，但不是 Workbench 的规范 Agent 应用协议。
新增领域逻辑不得只存在于这些端点中，必须收敛到统一的 PlatformRunService / Runtime Kernel 语义。

旧 Action Contract 中的 `threadId` / `runId` 可以在兼容期存在，但进入 Runtime Domain 后不得作为 Command 的权威执行上下文。

## Business Agent 接入

Reference Business Agent 默认监听 `http://127.0.0.1:8300`。
Runtime Host 通过 `BusinessAgentAdapter` 调用它，而不是由 CopilotKit Runtime 直接把 Business Agent 注册成浏览器可访问的 Agent。

Business Agent 可以发布公开消息、活动、进度、状态、工具调用、Interrupt 和最终 AgentContent。
过程事件进入 Runtime Event Projection；最终 AgentContent 才进入 Presentation Pipeline。
Adapter 只做契约校验、关联标识和协议映射，不总结、改写或重新解释业务内容。

## 当前范围

当前 Host 提供本地开发用 Runtime Repository 和 Reference Business Agent Checkpoint 协作能力，但不代表已经具备生产级会话服务。
Reference Business Agent 使用独立 SQLite Checkpoint Store 保存私有工作流状态。
Runtime Host 与 Business Agent 只通过 shared `threadId` 等安全关联标识协作，不复制 Business Agent 私有 Checkpoint。

当前 Host 不启用 CopilotKit 自动 A2UI 生成功能。
所有可信 A2UI 均由 Embedded Presentation Pipeline 调用 UI Compiler Core 产生。

## 相关架构

- [平台架构](../../docs/platform/ARCHITECTURE.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../../docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：AG-UI Agent 应用协议边界](../../docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
- [ADR-0022：Business Agent HTTP + SSE / WebSocket Adapter](../../docs/adr/0022-support-http-sse-and-websocket-business-agent-adapters.md)
