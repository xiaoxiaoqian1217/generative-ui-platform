# Agent Runtime Host

`agent-runtime-host` 是前端与业务 Agent 之间的运行时宿主。当前使用 CopilotKit Runtime v2 提供 AG-UI 通信、Agent 注册和请求路由。

## 职责边界

当前应用负责：

- 向前端提供 `/api/copilotkit` 运行时端点。
- 注册名为 `default` 的验证 Agent。
- 承载后续认证、请求头转发、Agent 路由和运行时中间件。
- 为业务 Agent 与 UI Compiler 的组合调用预留宿主位置。

当前应用不负责：

- 生成 UI Plan。
- 校验 Component Catalog。
- 编译 A2UI。
- 执行业务领域工具。

声明式 UI 仍由 `ui-compiler-service` 统一生成和校验，因此当前没有启用 CopilotKit 的自动 A2UI 生成中间件。

## 本地启动

仓库要求 Node.js 24 或更高版本、pnpm 10.13.1。

```bash
pnpm install
cp apps/agent-runtime-host/.env.example apps/agent-runtime-host/.env
pnpm --filter @generative-ui/agent-runtime-host dev
```

默认地址：

- Runtime：`http://localhost:8200/api/copilotkit`
- 健康检查：`http://localhost:8200/health`

使用默认 OpenAI 模型时，需要在 `.env` 中配置 `OPENAI_API_KEY`。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP 服务监听地址 |
| `PORT` | `8200` | HTTP 服务端口 |
| `COPILOTKIT_BASE_PATH` | `/api/copilotkit` | CopilotKit Runtime 路径 |
| `COPILOTKIT_MODEL` | `openai:gpt-5-mini` | 默认验证 Agent 使用的模型 |
| `OPENAI_API_KEY` | 空 | OpenAI API 密钥 |
| `CORS_ENABLED` | `true` | 是否开启 Runtime CORS |
| `COPILOTKIT_TELEMETRY_DISABLED` | `true` | 是否关闭 CopilotKit 匿名遥测 |

## Vue Headless 接入

现有 Vue 前端保持独立部署，只需要将 CopilotKit Provider 的 Runtime 地址指向本服务：

```vue
<CopilotKitProvider runtime-url="/api/copilotkit">
  <RouterView />
</CopilotKitProvider>
```

开发环境可以通过 Vite 把 `/api/copilotkit` 代理到 `http://localhost:8200`。

## 后续集成顺序

1. 使用当前默认 Agent 验证 Vue Headless、AG-UI 消息和流式响应。
2. 新增 `BusinessAgentClient`，接入真实业务 Agent。
3. 新增 `UICompilerClient`，把业务结果转换为 `PresentationRequest`。
4. 新增 `PresentationResultAdapter`，将 Markdown 或 A2UI 结果映射回前端事件。
5. 验证稳定后，再增加认证、线程持久化和多 Agent 路由。
