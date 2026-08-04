# TASK-004：CopilotKit 主运行与确认闭环

## 目标

将 Workbench 的主运行交互迁移至 Runtime Host 的 CopilotKit Headless 端点。

## 交付

- 使用 CopilotKit Headless 消费运行事件和 PresentationResult。
- 保持 Component Action 经现有 Runtime Action 契约回传。
- 支持自然语言确认和结构化确认型 Action。
- 删除或归档用户界面的 HTTP/WebSocket 传输切换。

## 验收

- CopilotKit 失败具有可理解的连接与恢复信息。
- 未批准的确认型 Action 不恢复 Business Agent。

## 依赖

TASK-001 和 TASK-003。
