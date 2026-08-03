<!-- cspell:ignore doubao qwen -->

# Agent Runtime Host

`agent-runtime-host` 是 Generative UI Platform 的 CopilotKit Runtime 集成层。
它位于前端和兼容 AG-UI 的远程业务 Agent 之间。

> 当前实现属于 Developer Preview。默认仅监听本机回环地址，未实现认证、授权和正式持久化；不得直接暴露到公网。

## 职责边界

Runtime Host 提供 CopilotKit 运行时端点，并把 AG-UI 请求转发给远程业务 Agent。
它使用 `HttpAgent` 将业务 Agent 注册到 CopilotKit 的 Agent 注册表中。
`BUSINESS_AGENT_ID` 是前端可选择的业务 Agent 标识。
`default` 是同一远程业务 Agent 的默认别名。

```text
Vue + CopilotKit Headless
          |
          | AG-UI
          v
Agent Runtime Host
          |
          | AG-UI
          v
Business Agent
```

Runtime Host 不承担 Business Agent 的模型推理。
进程内 Embedded Presentation Pipeline 可以通过服务端环境变量选择 Fixture 或已注册的 Presentation Model Provider，Provider 仍只由 Presentation Router / Pipeline 调用。
Runtime Host 不包含业务推理、业务工具调用、UI Plan 生成或 A2UI 编译逻辑。
当前实现提供远程 Business Agent 的 AG-UI 转发、Demo 端点，以及 Presentation Pipeline 的进程内组合根。
当前实现通过 `BusinessAgentAdapter` 的 Runtime Contract 接口提供 Run 调用，并在组合根中直接装配 LangGraph HTTP Adapter 和 Presentation Pipeline Package。
`/api/runs`、`/ws/runs` 和 `/api/actions` 复用同一 RunOrchestrator。
`/api/actions` 会校验 `threadId`、`runId`、`surfaceId`、`actionId`、Catalog Action 定义、Payload Schema 与显式审批。
校验通过后，Runtime Host 经 Business Agent Adapter 恢复 Reference Business Agent，并将新的业务结果再次交给同一个 Embedded Presentation Pipeline。

## 运行要求

- Node.js 24 或更高版本。
- pnpm 10.13.1。
- 一个兼容 AG-UI 的远程业务 Agent 端点。

## 配置

将 `.env.example` 中的值复制到启动进程的环境变量中。
应用不会自动加载 `.env` 文件。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | HTTP 监听地址。仅在已有认证、TLS、受控 CORS 和 WebSocket Origin 校验的部署边界内，才应改为非回环地址。 |
| `PORT` | `8200` | HTTP 监听端口。 |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | 面向前端的 CopilotKit Runtime 路径。 |
| `BUSINESS_AGENT_ID` | `business-agent` | 面向前端暴露的业务 Agent 标识。 |
| `BUSINESS_AGENT_URL` | `http://localhost:8000/ag-ui` | 仅兼容 CopilotKit AG-UI 端点使用的远程业务 Agent 地址；三服务开发验证链路使用下方 Contract 地址。 |
| `BUSINESS_AGENT_CONTRACT_URL` | `http://localhost:8300` | Runtime Host 通过 Business Agent Adapter 使用的 Contract HTTP 基址。 |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` | 是否关闭 CopilotKit 匿名遥测。 |
| `PRESENTATION_MODEL_PROVIDER` | `fixture` | `fixture`、`kimi`、`doubao`、`glm`、`qwen` 或 `openai-compatible`。 |
| `PRESENTATION_MODEL_REGISTRATION_ID` | `<provider>-primary` | Provider Registry 中的稳定注册 ID。 |
| `PRESENTATION_MODEL_NAME` | 无 | 真实 Provider 的模型名。 |
| `PRESENTATION_MODEL_BASE_URL` | Provider 默认值 | HTTPS Base URL；`openai-compatible` 必须显式提供。 |
| `PRESENTATION_MODEL_ENDPOINT_ID` | 无 | 可选部署 Endpoint ID，与模型名分离。 |
| `PRESENTATION_MODEL_API_KEY` | 无 | 仅服务端读取的 API Key，不得暴露到浏览器或日志。 |
| `PRESENTATION_MODEL_TIMEOUT_MS` | `10000` | Router 总超时，范围为 1 至 300000 毫秒。 |
| `PRESENTATION_MODEL_RETRY_COUNT` | `0` | Router 有限重试次数，范围为 0 至 3。 |
| `RUNTIME_TOTAL_TIMEOUT_MS` | `15000` | 单次 Run 或 Action 的总超时预算，范围为 1 至 300000 毫秒。 |
| `RUNTIME_MAX_CONCURRENT_RUNS` | `16` | Run 与 Action 共享的运行时并发上限，范围为 1 至 1000。 |

真实 Provider 模式要求模型名和 API Key，`openai-compatible` 还要求显式 Base URL。
切换 Provider 只需修改这些服务端配置，不需要修改 Runtime Orchestrator 或 UI Compiler Core。

## 启动

在仓库根目录执行：

```bash
pnpm install
pnpm --filter @generative-ui/agent-runtime-host dev
```

健康检查地址为 `http://localhost:8200/health`。

依赖健康检查地址为 `http://localhost:8200/health/dependencies`。

Runtime HTTP 接口为 `POST /api/runs` 和 `POST /api/actions`。

Runtime WebSocket 接口为 `ws://localhost:8200/ws/runs`。

`/api/runs` 和 `/ws/runs` 使用相同的 Run 请求和结果契约。
`/api/actions` 和 WebSocket action 消息使用相同的 Action 契约。
浏览器不连接 Reference Business Agent、Presentation Pipeline、UI Compiler Core 或 Model Provider。

前端应使用 `http://localhost:8200/api/copilotkit` 作为 Runtime URL，并选择 `business-agent` 或默认 Agent。

## 当前范围

当前 Host 不实现正式业务 Agent、线程持久化、认证或前端业务工具。
Reference Business Agent 的内存 Checkpoint 仅用于开发验证，进程重启后会丢失。
当前 Host 不启用 CopilotKit 自动 A2UI 生成功能。
所有 A2UI 均由 Presentation Pipeline 调用 UI Compiler Core 产生。
