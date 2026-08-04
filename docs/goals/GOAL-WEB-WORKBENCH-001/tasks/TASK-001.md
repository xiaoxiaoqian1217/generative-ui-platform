# TASK-001：Business Agent 事件传输 Adapter

## 目标

实现 HTTP + SSE 与 WebSocket Business Agent Adapter。

## 交付

- 定义 HTTP + SSE 与 WebSocket Business Agent Adapter 的公共契约边界与配置选择。
- 实现两个 Adapter，使其传递一次请求中的离散完整业务事件。

## 验收

- 当前可通过 HTTP + SSE 或 WebSocket 调用 Business Agent，并接收离散完整业务事件，且 Run 与 Resume Action 使用同一 Adapter 语义。
- RunOrchestrator 不感知 Business Agent 私有传输消息。

## 依赖

无。
