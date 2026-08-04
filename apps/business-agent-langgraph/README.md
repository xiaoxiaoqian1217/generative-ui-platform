# Reference Business Agent

## 开发者入口

在本目录运行 `pnpm dev`。

开发命令加载 `.env` 与 `.env.local`，进程环境变量优先。

它会先构建 workspace 依赖，然后监听 `http://127.0.0.1:8300/health`。

停止前台进程使用 Ctrl+C。

该应用不依赖其他服务，且不需要 Provider 密钥。

端口错误时运行 `pnpm check:doctor -- --source`，或设置未占用的 `BUSINESS_AGENT_PORT`。

这是平台全链路验证使用的 TypeScript LangGraph Reference Business Agent。
它使用确定性 Fixture 工具，不需要模型 API Key。
它只返回 Markdown 或结构化业务数据，不做展示决策，也不生成 A2UI、HTML 或 Vue。

## API

`GET /ws/business-agent` exposes the same validated Run and Resume Action contracts over WebSocket.

The client sends `business-agent.run` or `business-agent.resume-action` with a Contract payload.

The server emits `business-agent.event` frames followed by one `business-agent.result` frame.

When a patrol plan is paused, the Business Agent also interprets an explicit confirmation message in the same `threadId`.

Accepted messages are `confirm`, `approve`, `yes`, `ok`, `确认`, `确认执行`, `同意`, `批准`, and `好`.

Any other text preserves the pause and returns `ACTION_CONFLICT`; it never resumes a plan implicitly.

- `GET /health`：进程健康检查。
- `POST /api/runs`：执行 Business Agent Run Contract。
- `POST /api/actions`：执行 Business Agent Resume Action Contract。

生成巡逻计划时，Run 会在内存 Checkpoint 中暂停。
后续 Action 必须使用相同的 `threadId` 和 `runId`，并提交 `patrol.confirm` Action。
内存 Checkpoint 只用于开发验证，进程重启后不会保留。

## 本地运行

```bash
pnpm --filter @generative-ui/business-agent-langgraph dev
```

默认监听 `127.0.0.1:8300`。
可通过 `BUSINESS_AGENT_HOST` 和 `BUSINESS_AGENT_PORT` 修改。

## 示例

Run 请求：

```json
{
  "protocolVersion": "1.0",
  "requestId": "request-1",
  "threadId": "thread-1",
  "runId": "run-1",
  "input": {
    "message": "生成巡逻计划"
  }
}
```

Resume Action 请求：

```json
{
  "protocolVersion": "1.0",
  "requestId": "request-2",
  "threadId": "thread-1",
  "runId": "run-1",
  "action": {
    "actionId": "confirm-patrol-plan",
    "actionType": "patrol.confirm",
    "surfaceId": "surface-1",
    "approved": true
  }
}
```
