# GOAL-WEB-COPILOTKIT-UI-001 子任务包

该目录将 CopilotKit 会话 UI 与会话内 A2UI 拆分为可独立验收的端到端任务。
总目标和边界以 [`../GOAL-WEB-COPILOTKIT-UI-001.md`](../GOAL-WEB-COPILOTKIT-UI-001.md) 为准。

每个任务必须从最新 `origin/main` 建立独立任务分支和 worktree。
后续任务依赖尚未合并到远端 `main` 时必须暂停。
任务不得与 `GOAL-DEBUG-CONVERSATIONS-001` 共享分支或 worktree。

## 内容

- `tasks.json`：机器可读的任务依赖和验收摘要。
- `tasks/TASK-001.md` 至 `tasks/TASK-005.md`：可独立实施的任务说明。

## 推荐顺序

```text
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005
```

## 执行边界

- 使用受控 CopilotChatView，不引入高级 CopilotChat 的双重状态所有权。
- 保留现有 Headless Client、PresentationResult、A2UI Renderer 和 Runtime Action Contract。
- 不新增 Runtime Thread Contract、SQLite 或长期会话能力。
- 不把 A2UI 转换为 CopilotKit Tool。
