# 支持 HTTP + SSE 与 WebSocket Business Agent Adapter

## 状态

已接受。

## 协议边界说明

本 ADR 只定义 `Agent Runtime Host ↔ Business Agent` 的私有 Adapter Transport。
它不定义 `Workbench ↔ Agent Runtime Host` 的 Agent 应用协议。

ADR-0026 已明确：Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 应用协议，当前参考 Transport 为 HTTP POST + SSE。
因此本 ADR 中的 HTTP + SSE / WebSocket 选择不得暴露成 Workbench 的“Agent 协议模式”或与 AG-UI 并列的前端业务协议。

## 决策

当前 Goal 中，Agent Runtime Host 同时支持 HTTP 请求 + SSE 事件流响应和 WebSocket 与 Business Agent 通信。
Business Agent 可以在一次 Run 或 Resume Action 请求期间连续发送离散、完整的业务事件，而不要求模型 token 流式输出。
Runtime Host 通过受 Runtime Contract 约束的 HTTP + SSE Business Agent Adapter 与 WebSocket Business Agent Adapter 发送请求，并将事件映射为同一 Business Agent Adapter 接口。

Business Agent 不需要原生实现 AG-UI。
Adapter 必须把 Business Agent 私有协议隔离在 Runtime Host 内部，并将允许公开的业务事件映射为平台公共事件。

## 考虑的方案

- 只实现非流式 HTTP 请求/响应；
- 只实现 WebSocket；
- 同时实现 HTTP + SSE 与 WebSocket。

采用第三种方案，以验证 Business Agent Adapter 可以与具体 Transport 解耦。

## 后果

- HTTP + SSE 与 WebSocket Adapter 必须实现等价的 Business Agent Contract 校验、取消、超时、响应大小限制、错误映射和连接关闭语义；
- Run 和 Resume Action 的私有兼容契约可以使用同一关联标识、请求标识和协议版本规则；
- 其中 `runId` 只作为 Business Agent / Adapter 的外部执行或兼容关联 ID，不是 ADR-0024 Runtime Domain 主键；
- Runtime Host 的领域编排不得感知具体 Business Agent Transport，也不得包含 Business Agent 私有协议；
- Workbench 仍只连接 Runtime Host，不能连接 Business Agent 的 HTTP、SSE 或 WebSocket；
- Workbench Agent 交互协议和 Transport 分层以 ADR-0026 为准；
- Runtime Truth 与安全 Command Admission 以 ADR-0024 为准。
