# TASK-002：持久化调试会话的运行闭环

## 目标

让 Runtime Host 能持久化并在重启后读取 Debug Conversation、Conversation Turn 和已验证 Presentation Snapshot。

## 交付

- 定义不依赖 SQLite SDK 的 Repository Port。
- 建立线程、轮次、快照、Action 关联和安全元数据表。
- 提供版本化数据库迁移和启动检查。
- 实现分页、重命名、归档、删除和三十天清理。
- 实现线程、记录、快照和数据库总大小限制。
- 确保 SQLite 文件位于显式开发数据目录并被 Git 忽略。
- 在调用 Business Agent 前创建 pending Conversation Turn。
- 在 Run、Pipeline、Action 和取消终局更新明确状态。
- 在返回成功结果前保存已验证 Presentation Snapshot。

## 验收

- Repository 单元测试不依赖 Runtime HTTP Adapter。
- SQLite 重启后能够恢复全部已提交记录。
- 历史写入失败具有明确状态，且不会被报告为 Business Agent 失败。
- 并发写入、重复请求和迁移失败具有稳定语义。
- 数据库文件不会进入构建产物、镜像或日志。

## 依赖

TASK-001。
