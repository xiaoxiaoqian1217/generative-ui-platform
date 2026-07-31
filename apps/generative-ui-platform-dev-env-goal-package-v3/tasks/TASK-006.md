# TASK-006：Web Workbench 工程化

## 工作目录与文档关系

- 本任务的唯一实施目录是 `apps/web-workbench`；
- `TASK-006.md` 是该目录的工程化实施任务，不代表另一套 Web 工程或平行目标；
- `docs/WEB_WORKBENCH_SRS.md` 是 Workbench 的需求基线；
- `apps/web-workbench/README.md` 说明工程职责、目录规划和当前状态；
- 后续与 Renderer、Action、诊断和验收相关的任务继续在同一个 `apps/web-workbench` 工程中扩展。

## 目标

在现有 Web Demo 已验证基础 HTTP / WebSocket 通信的基础上，将 `apps/web-workbench` 建设为长期可用的 Vue 开发验证工作台。

## 工作项

- 创建并持续完善 `apps/web-workbench`；
- Vue 3 + Vite + TypeScript；
- 移除公共 CDN；
- 实现 HTTP Transport；
- 实现 WebSocket Transport；
- 实现 Markdown Renderer；
- 实现 PresentationResult Viewer；
- 实现 A2UI Raw Viewer；
- 实现场景快捷输入；
- 实现环境和版本 Banner；
- 实现诊断面板；
- 输出可部署静态构建。

## 限制

- Web 只连接 Runtime Host；
- 不直接调用 Business Agent；
- 不直接调用 UI Compiler；
- 不直接调用 Model Provider；
- 不硬编码 localhost；
- 不在其他目录创建平行的 Web Workbench 工程。

## 验收

- 所有实现位于 `apps/web-workbench`；
- HTTP / WebSocket 可切换；
- 页面刷新正常；
- 构建产物可发布；
- 可用于开发、联调和演示。
