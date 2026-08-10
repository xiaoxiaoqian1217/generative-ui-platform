# 平台开发者体验

## 五分钟真实 Provider 快速开始

需要 Node.js 24 或更高版本和 pnpm 10.13.1。

Windows PowerShell：

```powershell
./scripts/bootstrap.ps1
pnpm dev:platform
```

Linux 或 WSL：

```bash
./scripts/bootstrap.sh
pnpm dev:platform
```

启动器要求配置真实 Presentation Model 的服务端凭证。
缺少配置时会失败，不会回退到 Fixture。

访问 `http://127.0.0.1:5173`，通过 Workbench 验证 AG-UI Conversation、Markdown、设备状态、Generative UI 和巡逻确认。
Workbench 与 Runtime Host 的当前 AG-UI Transport 为 HTTP POST + SSE，不需要在界面中选择“HTTP 模式”或“WebSocket 模式”。

使用 Ctrl+C 停止前台服务，或执行 `pnpm stop:platform` 停止后台服务。

## 配置契约

开发命令从各应用目录依次读取 Git 忽略的 `.env` 和 `.env.local`。
进程环境变量优先于文件变量，`.env.local` 优先于 `.env`。
生产 `start` 命令不会读取这些文件，部署系统必须显式注入环境变量。

| 应用 | 配置文件 | 支持的变量与默认值 |
| --- | --- | --- |
| Reference Business Agent | `apps/business-agent-langgraph/.env[.local]` | `BUSINESS_AGENT_HOST=127.0.0.1`，`BUSINESS_AGENT_PORT=8300`。 |
| Agent Runtime Host | `apps/agent-runtime-host/.env[.local]` | `HOST=127.0.0.1`，`PORT=8200`，`BUSINESS_AGENT_CONTRACT_URL=http://localhost:8300`，以及应用 README 列出的 Business Agent Transport、真实 Provider、超时和并发变量。 |
| Workbench | `apps/web-workbench/.env[.local]` | `VITE_RUNTIME_HOST_URL` 和 `VITE_WORKBENCH_ENVIRONMENT`。 |

CI 和平台 E2E 使用进程内确定性替身，因此不会读取或依赖真实 Provider 配置。
真实 Provider 要求显式 `PRESENTATION_MODEL_PROVIDER`、`PRESENTATION_MODEL_NAME` 和 `PRESENTATION_MODEL_API_KEY`。
`openai-compatible` 额外要求 `PRESENTATION_MODEL_BASE_URL`。

API Key、Provider 地址和 Business Agent 私有地址不得使用 `VITE_*`，不得写入 `runtime-config.js`、日志、trace、构建产物或 Git。

## 分别启动

每个应用目录中均可直接执行 `pnpm dev`。
该命令先构建所需 workspace 依赖，再启动当前应用。
不要与 `pnpm dev:platform` 并行运行相同应用，以免争用构建与端口。

Reference Business Agent 健康检查为 `http://127.0.0.1:8300/health`。
Runtime Host 依赖 Reference Business Agent，健康检查为 `http://127.0.0.1:8200/health` 和 `/health/dependencies`。
Workbench 依赖 Runtime Host，地址为 `http://127.0.0.1:5173`。

## 完整平台与浏览器调试

`pnpm dev:platform` 按 Reference Business Agent、Runtime Host、Workbench 顺序启动，并在启动前构建一次全部依赖。
`pnpm dev:platform -- --background` 在后台启动服务；使用 `pnpm stop:platform` 清理其进程和端口。
真实 Provider 通过标准 `pnpm dev:platform` 服务端配置启用。

先执行 `pnpm check:doctor -- --provider`，诊断仅输出缺失或无效变量名，不输出密钥值。

Workbench 的 Agent 交互统一通过 Runtime Host 的 AG-UI 入口。
当前 CopilotKit Runtime 使用 HTTP POST + SSE 承载 AG-UI。
如果需要验证 Runtime Host 到 Business Agent 的底层 Adapter，可以在服务端通过 `BUSINESS_AGENT_TRANSPORT=http-sse` 或 `websocket` 切换；这个配置不改变 Workbench 的 AG-UI 协议。

浏览器调试时优先核对：

- `threadId`；
- `turnId`；
- `operationId`；
- `surfaceId`；
- `commandId`；
- Presentation / Diagnostic Artifact 关联信息。

迁移期仍出现的 `requestId`、`runId` 或 `presentationRequestId` 只能作为兼容或外部关联 ID，不应被当作 Runtime Domain 权威身份。
巡逻确认后，应检查新的 Operation、Surface 状态和 Presentation 是否正确产生，而不是只检查旧 Run 是否被“Resume”。

## Playwright E2E 与 CI

`pnpm test:e2e:platform` 是自包含的平台浏览器 E2E 入口。
它确保 Chromium 可用，构建 Workbench，并在测试进程内运行受控 Runtime Stub。
该 Stub 不读取 Provider 配置，也不是可通过运行配置启用的 Fixture Provider。

平台 E2E 应从用户可观察行为验证 AG-UI Conversation、Markdown / A2UI Presentation、安全 Action、恢复和 Inspect。
HTTP / WebSocket 等底层 Adapter 可以有独立兼容性测试，但不得被描述成多套 Workbench Agent 应用协议。

CI 使用同一确定性测试替身运行 `pnpm validate`。
真实 Provider smoke 不属于 CI，需本地显式执行 `pnpm test:provider-smoke`。

## Doctor 与排障

`pnpm check:doctor -- --source` 检查 Node、pnpm、端口和不安全前端变量。
添加 `--require-build` 检查构建产物，添加 `--require-running` 检查三个运行中服务，添加 `--browser` 检查 Playwright Chromium 可执行文件。

端口冲突或残留状态先执行 `pnpm stop:platform`，再运行 doctor。
`PLATFORM_ALREADY_RUNNING` 表示 E2E 拒绝干扰已有平台。
`PRESENTATION_PROVIDER_VARIABLE_MISSING:<名称>` 表示真实 Provider 配置不完整。

生产环境应采用显式进程环境、认证、授权、TLS、持久化和受控网络边界。
这些生产能力不在当前开发验证范围内。

## 协议边界速查

```text
Workbench ↔ Runtime Host
AG-UI
current transport: HTTP POST + SSE

Runtime Host ↔ Business Agent
Business Agent Adapter private protocol
HTTP + SSE / WebSocket

Non-Agent queries
REST
```

详细边界以 [ADR-0026](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md) 和 [平台架构](./ARCHITECTURE.md) 为准。
