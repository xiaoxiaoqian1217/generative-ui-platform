# Web Demo 到 Workbench 的迁移决策

## 状态

已完成。

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
Runtime Host 的旧 Mock HTTP 和 WebSocket 端点仅保留为兼容 Fixture，不再作为浏览器入口或平台验收证据。

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
