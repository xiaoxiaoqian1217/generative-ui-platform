# TASK-004：Thread 编排与一致性

## 目标

在 Runtime Host 中协调 Thread Repository、RunOrchestrator 和 Business Agent checkpoint 生命周期。

## 交付

- 在调用 Business Agent 前创建 pending Conversation Turn。
- 在 Run、Pipeline、Action 和取消终局更新明确状态。
- 在返回成功结果前保存已验证 Presentation Snapshot。
- 对历史写入失败、checkpoint 失败和部分删除提供稳定状态。
- 对幂等请求、重试和重复 Action 建立保护。
- 不引入分布式事务或自动重复副作用 Action。

## 验收

- 存储失败不会被错误报告为 Business Agent 失败。
- 已执行 Action 不会因历史写入失败自动重放。
- 每个 Turn 具有唯一终局或明确的 history-write-failed 状态。
- 关联 ID 可以串联 Thread、Run、Presentation 和 Action，但不会进入普通日志内容字段。

## 依赖

TASK-002 和 TASK-003。
