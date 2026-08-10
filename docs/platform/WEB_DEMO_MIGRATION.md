# Web Demo 到 Workbench 的迁移决策

## 状态

已完成。

## 后续协议取代说明

本文记录旧 Web Demo 退役并迁移到 Workbench 时的历史事实。
正文中的 `/api/runs`、`/ws/runs`、HTTP / WebSocket 双入口和 Run Contract 表述反映当时的实现基线，不再代表当前 Workbench Agent 协议。

当前规范以 ADR-0026 为准：Workbench 与 Runtime Host 之间只使用 AG-UI 作为 Agent 应用协议，当前参考 Transport 为 HTTP POST + SSE。
旧 HTTP / WebSocket Run 端点如仍存在，只作为 compatibility / debug adapter。
Runtime Truth 和 Action 权威语义以 ADR-0024 为准。

本文以下正文保留为历史迁移记录，不据此新增协议或 Runtime Domain 语义。

## 背景

`apps/web-demo` 是用于验证旧 Mock HTTP 和 WebSocket 文本闭环的单文件静态页面。
它通过公共 CDN 加载 Vue，并分别配置 Mock HTTP 和 WebSocket 完整端点。
它不具备 Runtime Contract、PresentationResult、安全 Markdown、诊断、可部署前端工程或长期维护结构。

TASK-006 建立了 `apps/web-workbench`，作为平台长期开发、联调和验收的正式 Web 入口。

## 决策

`apps/web-workbench` 接管以下长期能力：

- Vue 3、Vite 和 TypeScript 工程；
- 无公共 CDN 的静态构建；
- 单一 Runtime Host 配置；
- `/api/runs` 和 `/ws/runs` Runtime Contract；
- Markdown、PresentationResult 和受控 A2UI Raw 查看；
- 连接、运行、错误、恢复、环境、版本和安全诊断状态；
- Chromium 基础 E2E；
- 测试环境静态发布和 Nginx 容器入口。

`apps/web-workbench` 是唯一的平台 Web 开发、联调和验收入口。
旧 `apps/web-demo`、专用构建命令和专用测试已经删除。
Runtime Host 不再挂载旧 Mock HTTP 和 WebSocket 端点。
相关单元测试 Fixture 仍可直接使用，不能作为浏览器入口或平台验收证据。

## 删除条件

删除时已核验以下条件：

- Runtime Host 平台 `/api/runs` 和 `/ws/runs` 编排已合并到远端 `main`；
- Workbench 与 Runtime Host 的集成测试已经替代旧 Mock 通信证据；
- 平台完整 E2E 已覆盖 HTTP 和 WebSocket；
- 仓库开发文档和 CI 不再引用旧 Demo 命令；
- 删除变更通过最新 `origin/main` 的完整验证。

前四项由 GOAL-DEV-ENV-001 的 Runtime、Workbench 和平台 E2E 实现满足。
最后一项在删除变更同步最新 `origin/main` 后通过完整验证闭合。

## 架构影响

Workbench 只配置 Runtime Host 地址。
迁移不会引入 UI Compiler URL、Business Agent 私有地址或其他浏览器后端直连。
真实 A2UI Renderer 和 Action 闭环继续分别由 TASK-007 和 TASK-008 实现。

当前协议和 Runtime 语义请参考：

- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：AG-UI Agent 应用协议边界](../adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
