# TASK-006：Web Workbench 工程化

## 目标

将当前静态 Web Demo 升级为长期可用、可发布的 Vue 开发验证工作台。

## 实施前审计

- 检查现有 `apps/web-demo` 的启动方式、测试和 Runtime 协议。
- 明确哪些能力迁移到 Workbench，哪些仅作为兼容 Smoke 保留。
- 在 Workbench E2E 通过前，不直接删除现有 Demo。

## 工作项

- 创建 `apps/web-workbench`。
- 使用 Vue 3、Vite 和 TypeScript。
- 移除公共 CDN 运行依赖。
- 实现 HTTP Transport 和 WebSocket Transport。
- 实现 Markdown Renderer、PresentationResult Viewer 和 A2UI Raw Viewer。
- 实现场景快捷输入、连接状态、运行状态和错误状态。
- 实现环境与版本 Banner、基础诊断面板。
- 使用环境变量配置 Runtime Host 地址。
- 输出可部署静态构建和必要测试。

## 架构限制

- Web 只连接 Agent Runtime Host。
- 不直接调用 Business Agent、Presentation Pipeline、UI Compiler Core 或 Model Provider。
- 不感知 Presentation Pipeline 的进程内装配细节，不配置独立 Compiler 地址。
- 不硬编码 localhost。
- Workbench 是 Frontend Runtime 参考实现与开发工作台，不是正式业务产品。

## 验收

- HTTP 和 WebSocket 可切换。
- 页面刷新、连接失败和服务恢复场景表现明确。
- 仅配置 Runtime Host 地址即可运行，不存在 UI Compiler URL 配置。
- 构建产物可以发布到测试环境。
- Workbench 基础 E2E 通过。
- 现有 Web Demo 的迁移或保留决策有明确记录。
