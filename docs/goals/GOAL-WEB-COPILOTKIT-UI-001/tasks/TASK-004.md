# TASK-004：会话内 Markdown 与 A2UI

## 目标

在对应会话轮次中显示已验证的 Markdown 或受控 A2UI。

## 交付

- 将 Markdown PresentationResult 映射为 CopilotKit 助手消息组件。
- 通过 message-view 插槽在助手区域挂载现有 A2UI Renderer。
- 保留 A2UI Raw Viewer 的显式只读诊断入口。
- 历史 Business Surface 保留可见但禁止 Action。
- 诊断区域不得重复渲染可操作 A2UI。

## 验收

- Markdown 与 A2UI 不会在同一结果中错误重复显示。
- 只有 A2UI 的轮次不生成助手文本、状态消息或占位内容。
- 未注册组件继续安全忽略。
- A2UI 不转换为 CopilotKit Tool Call。

## 依赖

TASK-003。
