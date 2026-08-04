# TASK-002：Conversation Turn 状态模型

## 目标

建立 Workbench 唯一拥有的显式会话轮次状态模型。

## 交付

- 定义 Conversation Turn、Pending Turn、Turn Failure、Active Business Surface 和 Historical Business Surface。
- 将现有单个 input、result、runState 和 error 状态迁移为可测试的会话 Store。
- 保留 `threadId`、`requestId`、`runId`、`presentationRequestId` 和 `surfaceId` 关联。
- 定义 Run、取消、失败、重试和 Action Resume 的纯状态转换。
- 保持状态仅位于当前页面内存中。

## 验收

- 状态转换具有确定性单元测试。
- 同一时间只能存在一个 Active Operation。
- A2UI 结果不会生成额外助手文本或状态占位。
- 新结果会将旧 Business Surface 转为只读。

## 依赖

TASK-001。
