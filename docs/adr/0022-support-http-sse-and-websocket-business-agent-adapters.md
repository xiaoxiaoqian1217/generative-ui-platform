# 支持 HTTP + SSE 与 WebSocket Business Agent Adapter

## 状态

已接受。

当前 Goal 中，Agent Runtime Host 同时支持 HTTP 请求 + SSE 事件流响应和 WebSocket 与 Business Agent 通信。
Business Agent 可以在一次 Run 或 Resume Action 请求期间连续发送离散、完整的业务事件，而不要求模型 token 流式输出。
Runtime Host 通过受 Runtime Contract 约束的 HTTP + SSE Business Agent Adapter 与 WebSocket Business Agent Adapter 发送请求，并将事件映射为同一 Business Agent Adapter 接口。

## 考虑的方案

- 只实现非流式 HTTP 请求/响应。
- 只实现 WebSocket。
- 同时实现 HTTP + SSE 与 WebSocket。

## 后果

- HTTP + SSE 与 WebSocket Adapter 必须实现等价的 Runtime Contract 校验、取消、超时、响应大小限制、错误映射和连接关闭语义。
- Run 和 Resume Action 必须使用同一关联标识、请求标识和协议版本规则。
- Runtime Host 的 RunOrchestrator 不感知传输实现，也不包含 Business Agent 私有协议。
- Workbench 仍只连接 Runtime Host，不能连接 Business Agent 的 WebSocket。
