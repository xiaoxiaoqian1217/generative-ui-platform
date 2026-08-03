# Business Agent Adapter

`@generative-ui/business-agent-adapter` 在 Agent Runtime Host 与具体 Business Agent 协议之间提供稳定 seam。
公开接口只使用 `@generative-ui/runtime-contract` 的 Run、Resume Action、Result 和稳定错误类型。
Package 不依赖 LangGraph SDK、Presentation Pipeline、UI Compiler Core、Web 框架或任何 App。

## 公共接口

```ts
export interface BusinessAgentAdapter {
  run(
    request: BusinessAgentRunRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentRunResult>;

  resumeAction(
    request: BusinessAgentResumeActionRequest,
    options?: BusinessAgentInvocationOptions,
  ): Promise<BusinessAgentResumeActionResult>;
}
```

`LangGraphHttpBusinessAgentAdapter` 和 `MockBusinessAgentAdapter` 均实现该接口。
调用方可以通过依赖注入替换实现，而不需要了解具体 Agent 协议。

## LangGraph HTTP Adapter

HTTP Adapter 把 Run 发送到 `/api/runs`，把 Resume Action 发送到 `/api/actions`。
请求正文使用 Business Agent Contract，并原样透传 `requestId`、`threadId` 和 `runId`。
响应在返回调用方前必须通过字节限制、JSON 解析、Schema 校验和关联 ID 一致性校验。

```ts
import { LangGraphHttpBusinessAgentAdapter } from "@generative-ui/business-agent-adapter";

const adapter = new LangGraphHttpBusinessAgentAdapter({
  baseUrl: "http://127.0.0.1:8300",
  requestTimeoutMs: 10_000,
  maxRetries: 1,
  retryDelayMs: 100,
  retryMode: "agent-idempotent",
  maxResponseBytes: 1_048_576,
});
```

`requestTimeoutMs` 是包含所有尝试和退避在内的总调用预算。
`maxRetries` 的允许范围为 0 到 3，表示首次尝试之外的最大重试次数。
默认 `maxRetries` 为 0，避免自动重放有副作用的 Run 或 Resume Action。
只有 Agent 端保证相同请求幂等时，调用方才可以显式设置 `retryMode: "agent-idempotent"` 并启用有限重试。
调用方提供的 `AbortSignal` 与内部 deadline 同时生效，但取消与超时使用不同的稳定错误码。
HTTP 408、425、429 和 5xx 状态可以在有限策略内重试。
其他 HTTP 状态、非法 JSON、超大响应、Schema 错误和关联 ID 错配均不可重试。

## 稳定错误

| 场景 | 错误码 | 可重试 |
|---|---|---|
| 调用方取消 | `REQUEST_CANCELLED` | 否 |
| 总预算超时 | `BUSINESS_AGENT_TIMEOUT` | 是 |
| Agent 不可达或重试耗尽 | `BUSINESS_AGENT_UNAVAILABLE` | 是 |
| HTTP、JSON、Schema 或关联协议无效 | `BUSINESS_AGENT_PROTOCOL_INVALID` | 否 |
| Mock 实现内部失败 | `BUSINESS_AGENT_ERROR` | 否 |

错误结果只包含归一化消息和关联字段。
底层网络异常、原始响应正文和 Mock 内部异常不会进入返回结果或日志。
若请求缺少构造合法失败结果所必需的 `protocolVersion` 或关联 ID，Adapter 会拒绝 Promise 并抛出 `BusinessAgentAdapterRequestError`。
该错误的 `error` 字段是稳定的 `REQUEST_INVALID`，但不会复制非法关联值。

## 架构边界

Adapter 只传递 Markdown 或结构化业务数据形式的 `AgentContent`。
Adapter 不生成也不接收 `PresentationRequest`、`PresentationResult`、UI Plan Candidate、A2UI、HTML、Vue、React 或组件选择。
具体 LangGraph HTTP 路径只存在于该 Package 内，不属于 Web 契约。
