# Test Scope

`unit/` 从公开 seam 验证单一 Runtime Host 配置、HTTP/WS Runtime Contract 客户端和安全 Markdown。
`e2e/` 使用生产静态构建、真实 Chromium 和 Runtime Host Fixture 验证浏览器行为。

基础 E2E 覆盖：

- HTTP Markdown 结果；
- WebSocket A2UI 结果；
- Action Resume 后的更新展示；
- PresentationResult Viewer；
- A2UI Raw 默认隐藏和显式开启；
- Runtime Host 断线和服务恢复；
- 页面刷新状态；
- 诊断摘要。

Fixture 只实现 Runtime Host 的公开端点，不创建 Compiler 或 Business Agent 浏览器直连。
完整平台业务 E2E 位于 `tests/platform-e2e/`，并由仓库根目录的 `pnpm test:e2e:platform` 执行。
