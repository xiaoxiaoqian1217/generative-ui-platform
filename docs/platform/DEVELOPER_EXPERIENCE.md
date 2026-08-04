# 平台开发者体验

## 五分钟 Fixture 快速开始

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

启动器默认使用离线、确定性的 Fixture，不需要模型密钥。

访问 `http://127.0.0.1:5173`，依次尝试 HTTP、WebSocket、Markdown、设备状态和巡逻确认。

使用 Ctrl+C 停止前台服务，或执行 `pnpm stop:platform` 停止后台服务。

## 配置契约

开发命令从各应用目录依次读取 Git 忽略的 `.env` 和 `.env.local`。

进程环境变量优先于文件变量，`.env.local` 优先于 `.env`。

生产 `start` 命令不会读取这些文件，部署系统必须显式注入环境变量。

| 应用 | 配置文件 | 支持的变量与默认值 |
| --- | --- | --- |
| Reference Business Agent | `apps/business-agent-langgraph/.env[.local]` | `BUSINESS_AGENT_HOST=127.0.0.1`，`BUSINESS_AGENT_PORT=8300`。 |
| Agent Runtime Host | `apps/agent-runtime-host/.env[.local]` | `HOST=127.0.0.1`，`PORT=8200`，`BUSINESS_AGENT_CONTRACT_URL=http://localhost:8300`，`PRESENTATION_MODEL_PROVIDER=fixture`，以及应用 README 列出的超时、并发和 Provider 变量。 |
| Workbench | `apps/web-workbench/.env[.local]` | `VITE_RUNTIME_HOST_URL` 和 `VITE_WORKBENCH_ENVIRONMENT`。 |

Fixture、CI 和普通平台 E2E 强制 `PRESENTATION_MODEL_PROVIDER=fixture`，因此不会被本地真实 Provider 文件污染。

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

真实 Provider 只能显式执行 `pnpm dev:platform -- --provider=real`。

先执行 `pnpm check:doctor -- --provider`，诊断仅输出缺失或无效变量名，不输出密钥值。

在 Workbench 中切换 HTTP/WebSocket，展开诊断摘要核对 `requestId`、`runId` 和 `presentationRequestId`，并在巡逻确认后确认 Resume 结果重新渲染。

## Playwright E2E 与 CI

`pnpm test:e2e:platform` 是唯一的自包含平台浏览器 E2E 入口。

它确保 Chromium 可用，构建服务，隔离 Fixture 环境，启动三服务并检查健康度，保存 Playwright trace 与日志，然后清理进程和端口。

CI 使用同一 Fixture 路径运行 `pnpm validate`。

真实 Provider smoke 不属于 CI，需本地显式执行 `pnpm test:provider-smoke`。

## Doctor 与排障

`pnpm check:doctor -- --source` 检查 Node、pnpm、端口和不安全前端变量。

添加 `--require-build` 检查构建产物，添加 `--require-running` 检查三个运行中服务，添加 `--browser` 检查 Playwright Chromium 可执行文件。

端口冲突或残留状态先执行 `pnpm stop:platform`，再运行 doctor。

`PLATFORM_ALREADY_RUNNING` 表示 E2E 拒绝干扰已有平台。

`PRESENTATION_PROVIDER_VARIABLE_MISSING:<名称>` 表示真实 Provider 配置不完整。

生产环境应采用显式进程环境、认证、授权、TLS、持久化和受控网络边界。

这些生产能力不在本 Goal 的交付范围内。
