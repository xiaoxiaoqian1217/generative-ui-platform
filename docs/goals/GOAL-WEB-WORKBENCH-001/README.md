# GOAL-WEB-WORKBENCH-001 子任务包

该目录将 Workbench 开发验证产品化拆分为可独立实施的任务。
总目标和边界以 [`../GOAL-WEB-WORKBENCH-001.md`](../GOAL-WEB-WORKBENCH-001.md) 为准。

每个任务实施前必须重新检查最新 `origin/main`、任务依赖和现有实现。
不得将任务文档当作代码现状。

所有任务必须遵守 ADR-0020、ADR-0021 与 ADR-0022。

## GitHub Issues

- [TASK-001](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/137)：Business Agent 事件传输 Adapter。
- [TASK-002](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/138)：退役可运行 Fixture Provider 模式。
- [TASK-003](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/139)：Workbench 路由与本地设置。
- [TASK-004](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/140)：CopilotKit 主运行与确认闭环。
- [TASK-005](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/141)：Runtime Catalog 与场景浏览。
- [TASK-006](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/142)：Cases 与语义断言。
- [TASK-007](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/143)：Inspect 与确认型 Action。
- [TASK-008](https://github.com/xiaoxiaoqian1217/generative-ui-platform/issues/144)：回归验证与文档收口。

## 推荐顺序

```text
TASK-001
TASK-002
TASK-003

TASK-001 + TASK-003 → TASK-004
TASK-003 → TASK-005
TASK-003 + TASK-004 → TASK-006
TASK-004 + TASK-006 → TASK-007
TASK-001 + TASK-002 + TASK-005 + TASK-006 + TASK-007 → TASK-008
```
