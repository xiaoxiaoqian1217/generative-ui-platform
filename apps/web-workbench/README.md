# Generative UI Workbench

`apps/web-workbench` 是 Generative UI Platform 的 Vue 3 Frontend Runtime 参考实现和长期开发验证工作台。
它只连接 Agent Runtime Host，并用于开发、联调、诊断和基础验收。
它不是正式业务产品，也不承担 Business Agent 适配、Run 编排或 UI 编译。

## 当前能力

- 使用 Vue 3、Vite 和 TypeScript 构建，不依赖公共 CDN。
- 从单一 Runtime Host 地址派生 HTTP、WebSocket 和健康探测端点。
- 在 HTTP `/api/runs` 与 WebSocket `/ws/runs` 之间切换。
- 使用 `packages/runtime-contract` 校验所有 Run 请求和结果。
- 安全展示 Markdown，并转义原始 HTML 和危险链接。
- 查看完整 PresentationResult。
- 在用户显式开启后，以只读、限长文本查看 A2UI Raw Operations。
- 显示连接、重连、恢复、运行、降级、失败和页面刷新状态。
- 显示环境、Workbench 版本、关联 ID 和 Runtime Host 安全诊断摘要。
- 提供四个场景快捷输入。

真实 Component Registry A2UI Renderer 属于 TASK-007。
Action 回传和人工确认闭环属于 TASK-008。
本任务不会提前实现这些后续范围。

## 架构边界

Workbench 只读取以下浏览器配置：

- Runtime Host 地址；
- 环境名称。

Workbench 不存在 UI Compiler URL、Business Agent 私有地址、Model Provider 地址或密钥配置。
Runtime Host 地址会派生以下端点：

```text
<runtime-host>/health/dependencies
<runtime-host>/api/runs
<runtime-host>/ws/runs
```

## 本地运行

从仓库根目录安装依赖并启动：

```bash
pnpm install --frozen-lockfile
pnpm dev:web-workbench
```

如果不提供配置，Workbench 使用页面同源地址作为 Runtime Host。
需要连接独立 Runtime Host 时，通过 Vite 环境变量配置：

```bash
VITE_RUNTIME_HOST_URL=https://runtime.test.example pnpm dev:web-workbench
```

Windows PowerShell 可以使用：

```powershell
$env:VITE_RUNTIME_HOST_URL = "https://runtime.test.example"
pnpm dev:web-workbench
```

## 外部运行时配置

发布后可以在加载应用前覆盖 `runtime-config.js`：

```js
window.__GEN_UI_WORKBENCH_CONFIG__ = {
  runtimeHostUrl: "https://runtime.test.example",
  environment: "test",
};
```

外部配置优先于 Vite 构建环境变量。
这允许同一静态构建在不同测试环境中复用。
Runtime Host 地址只接受不包含凭据的 `http` 或 `https` URL。

## 构建与验证

```bash
pnpm build:web-workbench
pnpm test:web-workbench
pnpm test:e2e:web-workbench
```

静态构建输出位于 `apps/web-workbench/dist`。
基础 E2E 使用真实 Chromium、可发布静态构建和同源 Runtime Host Fixture，覆盖 HTTP、WebSocket、断线恢复、刷新、安全 Markdown、PresentationResult、诊断和受控 A2UI Raw Viewer。

## 容器发布

从仓库根目录构建 Nginx 镜像：

```bash
docker build \
  -f apps/web-workbench/Dockerfile \
  --build-arg VITE_RUNTIME_HOST_URL=https://runtime.test.example \
  --build-arg VITE_WORKBENCH_ENVIRONMENT=test \
  -t generative-ui-workbench:test \
  .
```

容器监听 `8080`，可用性端点为 `/workbench-health`。
也可以直接将 `dist` 发布到任意支持 SPA Fallback 的静态站点。

## Web Demo 迁移决策

`apps/web-workbench` 是后续平台开发、联调和验收的正式 Web 入口。
`apps/web-demo` 暂时保留为旧 Mock HTTP/WebSocket 协议的兼容 Smoke，不再承载新增 Workbench 能力。
在 Runtime Host 平台编排和后续全链路迁移完成前，仓库继续运行原 Demo 的构建和测试。
迁移依据和删除条件记录在 [`../../docs/platform/WEB_DEMO_MIGRATION.md`](../../docs/platform/WEB_DEMO_MIGRATION.md)。
