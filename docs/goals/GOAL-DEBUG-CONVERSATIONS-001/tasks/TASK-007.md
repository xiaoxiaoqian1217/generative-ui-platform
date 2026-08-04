# TASK-007：调试会话自动化验收与运维文档收口

## 目标

以迁移、重启、回放、清理和部分失败测试收口持久调试会话能力，并记录开发运维边界。

## 交付

- 覆盖 Runtime Contract、Repository、迁移和资源限制测试。
- 覆盖 Business Agent checkpoint 重启恢复和删除测试。
- 覆盖 Workbench 线程创建、切换、归档、删除和刷新恢复 E2E。
- 覆盖兼容与不兼容 Presentation Snapshot 回放。
- 覆盖 Action Resume、历史只读和部分失败平台 E2E。
- 更新开发环境、数据目录、清理、排错和安全说明。

## 验收

- 所有测试使用临时且相互隔离的 SQLite 文件。
- 测试完成后不在仓库留下数据库或业务历史文件。
- 日志和 Trace 泄漏测试通过。
- 受影响的类型检查、测试、构建和 `pnpm docs:check` 通过。

## 依赖

TASK-006。
