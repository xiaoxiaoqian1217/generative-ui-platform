# Generative UI Platform Development Validation Environment Goal Package

## 当前任务包定位

该任务包用于建设：

```text
生成式 UI 平台全链路开发验证环境
```

它不是独立产品，也不是正式业务系统。

它是 Generative UI Platform 项目中的研发基础设施和集成验证环境。

## 核心链路

```text
Business Agent
→ Markdown / Structured Business Data
→ UI Compiler Service
→ Model Adapter
→ UI Plan Candidate
→ UI Compiler Core
→ A2UI
→ Vue Renderer
→ Action
→ Business Agent Resume
```

## 文件

- `GOAL-DEV-ENV-001.md`
  - 完整建设背景、目标、定位、架构边界、子任务和验收标准。
- `tasks.json`
  - 机器可读的任务、依赖、工作目录和架构约束。
- `tasks/TASK-001.md` ～ `tasks/TASK-012.md`
  - 可分别交给开发人员或编码 Agent 执行的子任务指令。

## TASK-006 与 Web Workbench

`TASK-006：Web Workbench 工程化` 直接在 `apps/web-workbench` 中实施。

三份文档的关系如下：

- `tasks/TASK-006.md`：工程化实施任务；
- `apps/web-workbench/README.md`：工程职责、目录规划和当前状态；
- `docs/WEB_WORKBENCH_SRS.md`：Workbench 需求基线。

`TASK-006` 与 `apps/web-workbench` 属于同一建设目标。所有 Web Workbench 实现均进入 `apps/web-workbench`，不建立第二套工程目录。

## 执行建议

先执行 TASK-001。

TASK-002 与 TASK-004 可以并行。

执行 TASK-006 时，使用 `apps/web-workbench` 作为工作目录。

默认开发和 CI 使用 UI Compiler Fixture Model Adapter。
