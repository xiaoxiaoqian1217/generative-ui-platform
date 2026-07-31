# Agent Runtime Host

`agent-runtime-host` 是 Generative UI Platform 的 CopilotKit Runtime 集成层。
它位于前端和兼容 AG-UI 的远程业务 Agent 之间。

这里的“兼容 AG-UI”只描述当前 `/api/copilotkit` 兼容入口所使用的 `HttpAgent` 实现，
不是平台对所有 Business Agent 的统一要求。后续 Business Agent 可以继续使用自身协议，
由 Runtime Host 内的显式 Adapter 负责适配。

## 职责边界

Runtime Host 提供 CopilotKit 运行时端点，并把 AG-UI 请求转发给远程业务 Agent。
它使用 `HttpAgent` 将业务 Agent 注册到 CopilotKit 的 Agent 注册表中。
`BUSINESS_AGENT_ID` 是前端可选择的业务 Agent 标识。
`default` 是同一远程业务 Agent 的默认别名。

同时，Runtime Host 可以为前端提供统一的 HTTP 或 WebSocket 交互入口，
并在未来通过 Adapter 对接不支持 AG-UI 的 Business Agent。

```text
Vue + CopilotKit Headless
          |
          | AG-UI
          v
Agent Runtime Host
          |
          | 当前兼容入口：AG-UI
          | 未来业务入口：Business Agent Adapter
          v
Business Agent
          |
          | Markdown 或 JSON
          v
UI Compiler Service
```

Runtime Host 不直接配置或调用模型。
Runtime Host 不包含业务推理、业务工具调用、UI Plan 生成或 A2UI 编译逻辑。
UI Compiler Service 在需要展示语义分析时，通过可替换的 Model Adapter 配置和调用模型。
业务 Agent、UI Compiler Service 与 Runtime Host 的集成应通过显式 Adapter 完成。

## 演示接口

当前尚未接入真实 Business Agent。以下两个接口只用于验证 Web 与 Runtime Host 的通信闭环，
均返回一次性完整文本，不提供 Token 级流式输出。

### HTTP Mock

```http
POST /api/demo/message
Content-Type: application/json
```

请求示例：

```json
{
  "type": "user_message",
  "messageId": "demo-1",
  "content": "查询设备状态"
}
```

非法消息返回 `400`。该接口允许本地 Web Demo 跨域调用。

### WebSocket Mock

```text
/ws/demo
```

连接建立后，前端发送一条完整 `user_message`，Runtime Host 推送一条完整
`agent_message`。该接口不调用真实 Business Agent。

## 运行要求

- Node.js 24 或更高版本。
- pnpm 10.13.1。
- 一个兼容 AG-UI 的远程业务 Agent 端点。

最后一项只在使用现有 `/api/copilotkit` 兼容入口时需要；HTTP 和 WebSocket Mock
演示不依赖真实 `BUSINESS_AGENT_URL`。

## 配置

将 `.env.example` 中的值复制到启动进程的环境变量中。
应用不会自动加载 `.env` 文件。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP 监听地址。 |
| `PORT` | `8200` | HTTP 监听端口。 |
| `COPILOTKIT_ENDPOINT` | `/api/copilotkit` | 面向前端的 CopilotKit Runtime 路径。 |
| `BUSINESS_AGENT_ID` | `business-agent` | 面向前端暴露的业务 Agent 标识。 |
| `BUSINESS_AGENT_URL` | `http://localhost:8000/ag-ui` | 当前兼容 Adapter 使用的远程 AG-UI 端点。 |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` | 是否关闭 CopilotKit 匿名遥测。 |

## 启动

在仓库根目录执行：

```bash
pnpm install
pnpm --filter @generative-ui/agent-runtime-host dev
```

健康检查地址为 `http://localhost:8200/health`。

健康检查会明确返回演示接口以及真实 Business Agent 未连接状态：

```json
{
  "status": "ok",
  "service": "agent-runtime-host",
  "demoHttpPath": "/api/demo/message",
  "demoSocketPath": "/ws/demo",
  "businessAgentConnected": false
}
```

在另一个终端启动 Web Demo：

```bash
pnpm dev:web-demo
```

打开 `http://localhost:5173`，可选择 `WebSocket` 或 `HTTP POST`。

前端使用现有 CopilotKit 兼容入口时，应将
`http://localhost:8200/api/copilotkit` 配置为 Runtime URL，并选择
`business-agent` 或默认 Agent。

## 当前范围

当前 Host 不实现真实 Business Agent、UI Compiler 调用、线程持久化、认证、
前端工具或审批处理。
当前 Host 不启用 CopilotKit 自动 A2UI 生成功能。
这些能力必须在边界和契约明确后，以独立 Adapter 接入。
