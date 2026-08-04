# TASK-006：保留策略、双侧删除与部分失败恢复

## 目标

交付调试历史的三十天保留、资源治理、Runtime 与 Checkpoint 协调删除，以及可重试的部分失败恢复。

## 交付

- 默认清理三十天前的非活动历史。
- 提供单线程删除和清空全部调试历史。
- 协调 Runtime Thread Repository 与 Business Agent Checkpoint Store 删除。
- 显式显示 completed、partial 和 failed 删除结果。
- 提供安全的人工重试和孤立记录诊断。
- 不自动重复执行 Run 或 Action。

## 验收

- 历史回放与保存时的 PresentationResult 保持一致。
- 当前组件不支持旧快照时不会执行或猜测其操作。
- Raw Viewer 默认隐藏并继续限制大小。
- 历史加载不访问 Business Model 或 Presentation Model。

## 依赖

TASK-003、TASK-004 和 TASK-005。
