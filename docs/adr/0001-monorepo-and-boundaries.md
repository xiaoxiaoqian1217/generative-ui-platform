# ADR-0001: Monorepo 与模块边界

- **状态：** 已接受
- **日期：** 2026-07-23

## 取代关系

ADR-0003 取代了最初将 Interaction Gateway 纳入 MVP 的决策。
ADR-0005 取代了最初将 UI Compiler Agent 定义为纯网络 Adapter 的决策。
关于 Monorepo 和框架无关 Compiler Core 的决策继续有效。

## 决策

采用 pnpm/Turborepo Monorepo，其中包含可独立部署的 UI Compiler Service 和框架无关的 Compiler Core。

## 后果

- 共享契约保持同步。
- UI Compiler Service 可以独立构建和部署。
- UI Compiler Core 与应用和传输层关注点保持独立。
- 依赖规则通过代码审查和 CI 强制执行。
