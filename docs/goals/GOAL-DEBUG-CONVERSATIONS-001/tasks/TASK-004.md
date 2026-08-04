# TASK-004：Workbench 调试会话管理

## 目标

让 Workbench 通过 Runtime Thread Contract 创建、分页、切换、重命名、归档和删除调试会话，并在刷新后恢复权威状态。

## 交付

- 提供线程列表、分页、新建、切换、重命名、归档和删除。
- 使用第一条用户消息的安全截断作为默认标题，不额外调用模型。
- 切换线程时加载 Runtime Host 的消息和 Presentation Snapshot。
- 显示加载、空列表、不可用和部分删除状态。
- 保持 CopilotKit Conversation UI 为受控视图。
- 不把完整历史复制到 localStorage 或 sessionStorage。

## 验收

- 刷新后可以从 Runtime Host 恢复线程列表和选定会话。
- 会话切换不会复用错误的 Active Business Surface 或 `threadId`。
- 归档和删除需要服务端确认后才更新权威状态。
- Workbench 不调用 CopilotKit 托管线程服务。

## 依赖

TASK-002。
