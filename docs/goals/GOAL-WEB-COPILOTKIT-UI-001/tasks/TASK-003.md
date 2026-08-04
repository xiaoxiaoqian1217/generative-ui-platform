# TASK-003：在会话轮次中交付受控 A2UI

## 目标

让已验证的 A2UI PresentationResult 以内嵌 Business Surface 显示在对应 Conversation Turn 中，并维持现有 Action 安全边界。

## 交付

- 通过消息视图插槽在助手区域挂载现有 A2UI Renderer。
- 只将 Markdown 映射为助手消息。
- A2UI 结果不生成助手文本、状态消息或占位内容。
- 新 PresentationResult 到达后将旧 Business Surface 转为 Historical Business Surface 并保持只读。
- 保留 A2UI Raw Viewer 的显式只读诊断入口。

## 验收

- Markdown 与 A2UI 不会在同一结果中错误重复显示。
- 历史 Business Surface 的按钮和表单不能发出 Action。
- 未注册组件继续安全忽略。
- A2UI 不转换为 CopilotKit Tool Call。

## 依赖

TASK-002。
