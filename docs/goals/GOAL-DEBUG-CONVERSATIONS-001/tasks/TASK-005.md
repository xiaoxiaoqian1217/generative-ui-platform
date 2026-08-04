# TASK-005：只读回放历史 Presentation Snapshot

## 目标

让 Workbench 在原 Conversation Turn 中安全回放历史 Markdown 和 A2UI，而不重新调用模型或 UI Compiler Core。

## 交付

- 使用保存的契约版本、Catalog 身份和 Compiler 版本验证快照。
- 兼容快照在原会话轮次中只读回放。
- 不兼容快照显示安全诊断和受限的显式 Raw Viewer。
- 不自动迁移、重新编译、部分渲染或重新调用模型。
- 历史 Business Surface 永远不能产生 Action。

## 验收

- 历史回放与保存时的 PresentationResult 保持一致。
- 当前组件不支持旧快照时不会执行或猜测其操作。
- Raw Viewer 默认隐藏并继续限制大小。
- 历史加载不访问 Business Model 或 Presentation Model。

## 依赖

TASK-002 和 TASK-004。
