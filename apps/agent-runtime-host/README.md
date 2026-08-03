# Agent Runtime Host

`agent-runtime-host` 是 Generative UI Platform 的 CopilotKit Runtime 集成层。
它位于前端和兼容 AG-UI 的远程业务 Agent 之间。

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

Runtime Host 不直接配置或调用模型。
Runtime Host 不包含业务推理、业务工具调用、UI Plan 生成或 A2UI 编译逻辑。
当前实现提供远程 Business Agent 的 AG-UI 转发、Demo 端点，以及 Presentation Pipeline 的进程内组合根。
完整 Run / Action 编排仍由后续任务接入，但 Runtime Host 不通过独立 HTTP Client 调用展示能力。

## 运行要求

- Node.js 24 或更高版本。
- pnpm 10.13.1。
- 一个兼容 AG-UI 的远程业务 Agent 端点。

## 配置

将 `.env.example` 中的值复制到启动进程的环境变量中。
应用不会自动加载 `.env` 文件。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP 监听地址。 |
| `PORT` | `8200` | HTTP 监听端口。 |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | 面向前端的 CopilotKit Runtime 路径。 |
| `BUSINESS_AGENT_ID` | `business-agent` | 面向前端暴露的业务 Agent 标识。 |
| `BUSINESS_AGENT_URL` | `http://localhost:8000/ag-ui` | 远程业务 Agent 的 AG-UI 端点。 |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` | 是否关闭 CopilotKit 匿名遥测。 |

## 启动

在仓库根目录执行：

```bash
pnpm install
pnpm --filter @generative-ui/agent-runtime-host dev
```

健康检查地址为 `http://localhost:8200/health`。

前端应使用 `http://localhost:8200/api/copilotkit` 作为 Runtime URL，并选择 `business-agent` 或默认 Agent。

## 当前范围

当前 Host 不实现业务 Agent、完整 Presentation Run 编排、线程持久化、认证、前端工具或审批处理。
当前 Host 不启用 CopilotKit 自动 A2UI 生成功能。
这些能力必须在边界和契约明确后，以独立 Adapter 接入。
