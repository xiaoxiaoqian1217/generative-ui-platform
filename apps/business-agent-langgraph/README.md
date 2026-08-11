# Reference Business Agent

## 开发者入口

在本目录运行 `pnpm dev`。
开发命令加载 `.env` 与 `.env.local`，进程环境变量优先。
它会先构建 workspace 依赖，然后监听 `http://127.0.0.1:8300/health`。
停止前台进程使用 Ctrl+C。

该应用不依赖 Workbench 或 Presentation Pipeline，也不需要 Presentation Model Provider 密钥。

端口错误时运行 `pnpm check:doctor -- --source`，或设置未占用的 `BUSINESS_AGENT_PORT`。

这是平台全链路验证使用的 TypeScript LangGraph Reference Business Agent。
它负责参考业务逻辑、后端工具、私有 State / Checkpoint 和业务副作用语义。
它最终只提交 Markdown 或结构化业务数据，不做展示决策，也不生成 UI Plan Candidate、A2UI、HTML、Vue 或前端组件选择。

## 与 Runtime Host 的边界

Reference Business Agent 不要求原生实现 AG-UI。
AG-UI 是 `Workbench ↔ Agent Runtime Host` 的 Agent 应用协议。

Runtime Host 通过 `BusinessAgentAdapter` 访问本应用。
该私有 Adapter 当前可以使用 HTTP + SSE 或 WebSocket。
这些协议只存在于 `Runtime Host ↔ Business Agent` 边界，不直接暴露给 Workbench。

```text
Workbench
   │ AG-UI
   ▼
Agent Runtime Host
   │
   │ Business Agent Adapter
   │ HTTP+SSE / WebSocket
   ▼
Reference Business Agent
```

Business Agent 可以主动发布允许进入平台公共边界的消息、活动、进度、状态、Tool Call / Tool Result、Interrupt 等过程事件。
Business Agent 对这些公开内容和可见范围负责。
Business Agent Adapter 只做契约校验、关联标识和协议映射，不总结、改写或重新解释业务内容。

最终 AgentContent 才进入 Runtime Host 的 Embedded Presentation Pipeline。
过程事件直接进入 Runtime Event / AG-UI / Diagnostics 投影，不进入 Presentation Pipeline。

## API

- `GET /health`：进程健康检查；
- `POST /api/runs`：执行 Business Agent 私有 Run Contract；
- `POST /api/actions`：执行 Business Agent 私有 Resume Action Contract；
- `GET /ws/business-agent`：通过 WebSocket 暴露等价的 Business Agent 私有 Run / Resume Contract。

WebSocket 客户端发送 `business-agent.run` 或 `business-agent.resume-action` Contract Payload。
服务端发送若干 `business-agent.event` frame，最终发送一个 `business-agent.result` frame。

这些 Run / Resume API 是 Business Agent Adapter 的私有接入契约，不是 Workbench 的 Agent API，也不是 Runtime Domain 的权威身份模型。

## Checkpoint 与确认

生成巡逻计划时，Business Agent 会在独立 SQLite Checkpoint 中暂停。
开发环境默认使用 `.platform/business-checkpoints.sqlite`，可通过 `BUSINESS_AGENT_CHECKPOINT_DATABASE_PATH` 指定隔离路径。
该数据库只保存 LangGraph 私有工作流状态，不保存 PresentationResult、A2UI、Catalog、Runtime Surface 或前端组件信息。

当巡逻计划暂停时，Business Agent 也可以解释相同 `threadId` 下的显式确认消息。
允许的确认文本包括 `confirm`、`approve`、`yes`、`ok`、`确认`、`确认执行`、`同意`、`批准` 和 `好`。
其他文本保持暂停并返回 `ACTION_CONFLICT`，不会隐式 Resume。

对于允许的确认文本，Business Agent 返回结构化 confirmation intent，而不是绕过 Runtime Host 直接恢复 Graph。
Agent Runtime Host 必须先解析当前 Surface，并校验 Action、revision、Catalog、输入和审批要求；只有 Command 被正式接纳后，才可以通过 Business Agent Adapter 恢复工作流。

## `runId` 的兼容语义

当前 Business Agent 私有 Contract 仍包含 `runId`。
该字段用于 Business Agent / Adapter 的执行关联和兼容恢复，可以理解为 `agentRunId` / compatibility correlation ID。

它不是 ADR-0024 Runtime Domain 的主键，也不得由浏览器作为 Action 权威上下文使用。
Runtime Host 的权威执行单位是 `Operation`，受控 Action 的权威上下文由 `surfaceId`、Command Admission 和 Runtime Repository 解析。

迁移期 Adapter 可以把 Runtime `operationId`、`commandId` 和 Business Agent 私有 `runId` 建立关联，但不能把两者合并为同一个状态所有权。

## 私有 Contract 示例

Run 请求：

```json
{
  "protocolVersion": "1.0",
  "requestId": "request-1",
  "threadId": "thread-1",
  "runId": "agent-run-1",
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
  "runId": "agent-run-1",
  "action": {
    "actionId": "confirm-patrol-plan",
    "actionType": "patrol.confirm",
    "surfaceId": "surface-1",
    "approved": true
  }
}
```

以上示例只描述当前 Business Agent Adapter 私有兼容契约。
浏览器不应直接构造或发送这个请求。
Runtime Host 必须根据权威 Surface / Operation 状态决定是否以及如何调用 Business Agent Resume。

## 本地运行

```bash
pnpm --filter @generative-ui/business-agent-langgraph dev
```

默认监听 `127.0.0.1:8300`。
可通过 `BUSINESS_AGENT_HOST` 和 `BUSINESS_AGENT_PORT` 修改。

## 相关架构

- [平台架构](../../docs/platform/ARCHITECTURE.md)
- [ADR-0022：Business Agent HTTP + SSE / WebSocket Adapter](../../docs/adr/0022-support-http-sse-and-websocket-business-agent-adapters.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../../docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：AG-UI Agent 应用协议边界](../../docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
