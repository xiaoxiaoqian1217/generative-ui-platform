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
  - 机器可读的任务、依赖和架构约束。
- `tasks/TASK-001.md` ～ `tasks/TASK-012.md`
  - 可分别交给开发人员或编码 Agent 执行的子任务指令。

## 执行建议

先执行 TASK-001。

TASK-002 与 TASK-004 可以并行。

默认开发和 CI 使用 UI Compiler Fixture Model Adapter。
