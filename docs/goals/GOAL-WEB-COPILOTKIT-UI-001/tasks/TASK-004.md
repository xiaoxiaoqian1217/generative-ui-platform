# TASK-004：会话 Run、Action 与失败恢复

## 目标

让 Run、Action Resume、失败、取消和重试都保持在原 Conversation Turn 中，且不会重复执行可能具有副作用的 Action。

## 交付

- Run 和 Action 执行期间阻止新的提交和其他 Action。
- 将 Action Resume 的新 PresentationResult 原位更新到所属轮次。
- 将失败和取消显示为 Workbench Turn Failure，而不是 Assistant Message。
- 提供使用新 `requestId` 和 `runId` 的显式重试。
- 保留确认型 Action 的风险元数据和用户批准门槛。

## 验收

- 乱序响应不会把错误 Surface 标记为当前结果。
- 用户取消不会触发自动重试。
- 错误只显示稳定代码和安全摘要。
- 详细关联信息仅保留在 Inspect 中。

## 依赖

TASK-003。
