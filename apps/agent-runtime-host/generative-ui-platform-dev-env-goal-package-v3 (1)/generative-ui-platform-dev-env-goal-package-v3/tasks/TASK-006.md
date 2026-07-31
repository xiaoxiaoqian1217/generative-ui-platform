# TASK-006：Web Workbench 工程化

## 目标

将当前静态 Demo 升级为长期可用的 Vue 开发验证工作台。

## 工作项

- 创建 `apps/web-workbench`；
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
- 不硬编码 localhost。

## 验收

- HTTP / WebSocket 可切换；
- 页面刷新正常；
- 构建产物可发布；
- 可用于开发、联调和演示。
