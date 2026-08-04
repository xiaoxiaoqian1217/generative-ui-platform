# GOAL-DEBUG-CONVERSATIONS-001 子任务包

该目录将持久调试会话与历史回放拆分为可独立验收的端到端任务。
总目标和边界以 [`../GOAL-DEBUG-CONVERSATIONS-001.md`](../GOAL-DEBUG-CONVERSATIONS-001.md) 为准。

本 Goal 只能在 `GOAL-WEB-COPILOTKIT-UI-001` 已合并到远端 `main` 后开始。
每个任务必须从包含全部已合并依赖的最新 `origin/main` 建立独立任务分支和 worktree。
并行任务不得共享分支、worktree 或 SQLite 文件。

## 内容

- `tasks.json`：机器可读的任务依赖和验收摘要。
- `tasks/TASK-001.md` 至 `tasks/TASK-007.md`：可独立实施的任务说明。

## 推荐顺序

```text
TASK-001 → TASK-002 → TASK-004 → TASK-005 → TASK-006 → TASK-007
          └── TASK-003 ───────────────────────────────┘
```

## 执行边界

- Runtime Host 和 Business Agent 分别拥有可见历史与业务工作流状态。
- 两个存储只通过 Shared Thread Identity 关联。
- 历史回放不重新运行模型或 Compiler。
- 不引入 CopilotKit 托管线程、账号系统或生产数据授权。
