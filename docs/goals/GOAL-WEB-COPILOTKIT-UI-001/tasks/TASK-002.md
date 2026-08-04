# TASK-002：在会话轮次中交付 Markdown

## 目标

让用户输入、运行状态和已验证的 Markdown PresentationResult 在同一 Conversation Turn 中端到端显示。

## 交付

- 定义 Conversation Turn、Pending Turn 和 Turn Failure。
- 将现有单个 input、result、runState 和 error 状态迁移为 Workbench 唯一拥有的可测试会话 Store。
- 保留 `threadId`、`requestId`、`runId`、`presentationRequestId` 和 `surfaceId` 关联。
- 定义 Run 成功、取消和失败的纯状态转换。
- 保持状态仅位于当前页面内存中。

## 验收

- 状态转换具有确定性单元测试。
- 同一时间只能存在一个 Active Operation。
- 用户提交后立即看到用户消息和运行状态。
- Markdown 结果映射为对应轮次中的助手消息。

## 依赖

TASK-001。
