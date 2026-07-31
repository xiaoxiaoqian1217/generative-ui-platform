# GOAL-DEV-ENV-001 子任务包

该目录保存“生成式 UI 平台全链路开发验证环境建设”的可执行子任务。

总目标和架构边界以 [`../GOAL-DEV-ENV-001.md`](../GOAL-DEV-ENV-001.md) 为准。
ADR-0019 关于 Embedded Presentation Pipeline 的决策优先于旧任务包中的独立 UI Compiler Service 假设。

## 为什么位于 docs/goals

该任务包是阶段性工程计划和执行指令，不是可运行应用或可发布 package，因此不应位于 `apps/`。

`apps/` 只保存具有运行时入口、构建产物或部署职责的应用。

## 内容

- `tasks.json`：机器可读的任务依赖和验收摘要。
- `tasks/TASK-001.md` 至 `tasks/TASK-013.md`：可分别交给开发人员或编码 Agent 执行的子任务。

## 执行原则

- 每个任务实施前必须重新检查仓库现状，不能把任务文档当成代码现状。
- 优先复用现有契约和实现，禁止创建平行体系。
- 当前后端目标是 Agent Runtime Host + Embedded Presentation Pipeline，不建设独立 UI Compiler HTTP Service。
- Fixture 全链路优先，真实模型 Provider 接入不得阻塞基础集成验证。
- `TASK-010` 一键环境应在 `TASK-009` 完整 E2E 前完成。
- `TASK-011` 可观测性是横切任务，应随各任务增量建设。

## 推荐顺序

```text
TASK-001
├── TASK-002
├── TASK-006
└── TASK-013

TASK-002 → TASK-003
TASK-013 → TASK-004
TASK-003 + TASK-013 → TASK-005
TASK-006 → TASK-007
TASK-005 + TASK-007 → TASK-008
TASK-002 + TASK-005 + TASK-006 + TASK-007 → TASK-010
TASK-004 + TASK-008 + TASK-010 → TASK-009
TASK-011 贯穿全过程
TASK-012 最终收口
```
