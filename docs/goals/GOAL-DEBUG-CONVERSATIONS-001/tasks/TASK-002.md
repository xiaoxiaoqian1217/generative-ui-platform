# TASK-002：Runtime Thread Repository

## 目标

为 Runtime Host 建立可替换 Thread Repository 和 SQLite 开发实现。

## 交付

- 定义不依赖 SQLite SDK 的 Repository Port。
- 建立线程、轮次、快照、Action 关联和安全元数据表。
- 提供版本化数据库迁移和启动检查。
- 实现分页、重命名、归档、删除和三十天清理。
- 实现线程、记录、快照和数据库总大小限制。
- 确保 SQLite 文件位于显式开发数据目录并被 Git 忽略。

## 验收

- Repository 单元测试不依赖 Runtime HTTP Adapter。
- SQLite 重启后能够恢复全部已提交记录。
- 并发写入、重复请求和迁移失败具有稳定语义。
- 数据库文件不会进入构建产物、镜像或日志。

## 依赖

TASK-001。
