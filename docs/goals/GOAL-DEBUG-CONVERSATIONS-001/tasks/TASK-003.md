# TASK-003：Business Agent Checkpoint Store

## 目标

将 Reference Business Agent 的内存 LangGraph Checkpoint Store 替换为可持久化开发实现。

## 交付

- 定义 Business State Checkpoint Store 配置和生命周期。
- 提供 SQLite 开发实现并保持 Business Agent 私有协议边界。
- 按 `threadId` 恢复工作流、暂停点和 Action Resume 状态。
- 提供受控的单线程 checkpoint 删除接口。
- 保持 Business Agent 输出仅为 Markdown 或结构化业务数据。

## 验收

- Business Agent 进程重启后可以恢复暂停的参考工作流。
- 删除 checkpoint 后同一线程不能恢复旧业务状态。
- Business Agent 存储不包含 PresentationResult、A2UI、Catalog 或前端组件信息。
- HTTP + SSE 和 WebSocket Adapter 行为等价。

## 依赖

TASK-001。
