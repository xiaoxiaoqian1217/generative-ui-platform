# Generative UI Workbench

## 开发者入口

先启动 Agent Runtime Host，再在本目录运行 `pnpm dev`。

开发命令加载 `.env` 与 `.env.local`，进程环境变量优先。
成功后访问 `http://127.0.0.1:5173`。
停止前台进程使用 Ctrl+C。

Workbench 只能配置 `VITE_RUNTIME_HOST_URL` 与 `VITE_WORKBENCH_ENVIRONMENT`。
不得将 Provider、API Key 或 Business Agent 地址写入 `VITE_*`。
Runtime Host 不可用时检查 `http://127.0.0.1:8200/health` 和 `VITE_RUNTIME_HOST_URL`。

`apps/web-workbench` 是 Generative UI Platform 的 Vue 3 Frontend Runtime 参考实现和长期开发验证工作台。
它只连接 Agent Runtime Host，并用于开发、联调、诊断和基础验收。
它不是正式业务产品，也不承担 Business Agent 适配、Runtime Truth 管理、Presentation 决策或 UI 编译。

## 当前产品规范

Workbench 的目标产品模型采用 Conversation-first 交互。
当前 MVP 产品合同以 `docs/WEB_WORKBENCH_SRS.md` 为准：

- Conversation：创建、继续、打开和恢复多轮调试会话；
- Presentation：安全展示 Markdown 和受控 A2UI；
- Safe Interaction：从当前 Business Surface 提交受控 Command / Action，并展示 accepted、rejected、duplicate、stale、indeterminate 等结果；
- Recovery：刷新、重连和 Runtime Host 重启后重新获取 Runtime Host 权威状态；
- Inspect：逐 Turn / Operation 查看阶段、耗时、公开 Tool Event、错误和 Diagnostic Artifact。

Catalog、Scenarios 和 Settings 可以作为 Supporting Developer Tools 存在。
Cases、Case Import、Rerun 和自动语义 Assertion 不属于当前 MVP Release Gate。

产品合同描述目标行为，不等于所有能力已经在当前代码中完成。
迁移期代码中仍存在的 Playground、Cases、旧 Run 状态或 compatibility Transport 应按当前 ADR 解释，而不是反向定义产品规范。

## Agent 交互协议

Workbench 与 Agent Runtime Host 之间以 **AG-UI 作为唯一 Agent 应用协议**。
当前参考实现使用 Embedded CopilotKit Runtime 的 HTTP POST + SSE Transport。

```text
Workbench
   │ AG-UI
   │ over HTTP POST + SSE
   ▼
Agent Runtime Host
```

HTTP、SSE 和 WebSocket 只是 Transport，不与 AG-UI 作为并列 Agent 业务协议。
Workbench 不应提供以“HTTP Agent 模式 / WebSocket Agent 模式”为业务语义的用户切换。
未来如果实现 AG-UI over WebSocket，应只替换 Transport Adapter，不改变 Workbench 上层 AG-UI 语义或 Runtime Domain。

Workbench MUST NOT：

- 直接连接 Business Agent；
- 配置 Business Agent 私有 URL；
- 持有 Business Agent 私有凭据；
- 直接调用 Presentation Pipeline 或 UI Compiler Core；
- 维护与 AG-UI 并列的自定义 Agent 业务协议；
- 根据浏览器旧 `runId`、历史 A2UI 或本地缓存推导新的 Runtime Truth。

## Runtime Truth 与前端状态

Runtime Host 是 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot 的权威来源。
Workbench 只拥有前端临时 UI 状态，例如输入草稿、滚动位置、展开状态和当前页面选择。

Action / Command 不能依赖浏览器提供权威 Run 上下文。
新交互路径应围绕：

```text
commandId
surfaceId
actionId
expectedRevision
input
```

Workbench 根据 Runtime Host 返回的 Surface 状态决定是否展示可执行入口，但是否正式接受 Command 仍由 Runtime Host 决定。

Historical Presentation 可以继续用于展开、复制、查看详情、查看 Artifact 或打开 Inspect 等本地 UI 行为。
历史 Action Authority 不得直接重放；需要再次执行 Runtime / Business Action 时，必须重新进入 Runtime Host 当前 Command Admission 流程。

## 当前实现基线

当前代码已经具备以下开发验证能力：

- 使用 Vue 3、Vite 和 TypeScript 构建，不依赖公共 CDN；
- 从单一 Runtime Host 地址派生运行、只读查询和健康探测端点；
- 当前仍保留 Playground、Inspect、Cases、Catalog、Scenarios 和 Settings 等既有路由；
- 使用 `packages/runtime-contract` 校验现有运行请求和结果；
- 安全展示 Markdown，并转义原始 HTML 和危险链接；
- 查看完整 PresentationResult；
- 在用户显式开启后，以只读、限长文本查看 A2UI Raw Operations；
- 显示连接、重连、恢复、运行、降级、失败和页面刷新状态；
- 显示环境、Workbench 版本、关联 ID 和 Runtime Host 安全诊断摘要；
- 提供参考场景快捷输入与 Runtime Host 场景元数据查看；
- 使用受控 Component Registry 渲染 A2UI，并将用户 Action 回传 Runtime Host；
- 对需要审批的 Action 请求浏览器显式确认。

这些既有能力正在向 Conversation-first、Runtime Truth 和 Command Admission 语义迁移。
旧 `/api/runs`、`/api/actions` 或 `/ws/runs` 如果仍被当前代码或测试使用，只属于 compatibility / debug path。

## CopilotKit Vue 兼容基线

Workbench 固定使用 `@copilotkit/core` 与 `@copilotkit/vue` `1.64.1`。
Runtime Host 当前固定 `@copilotkit/runtime` `1.63.2`，因为升级到 `1.64.1` 会引入 `@copilotkit/channels-core` 对 Vitest 4 的强制 peer dependency，而平台当前固定 Vitest `3.2.6`。
这组版本共享 AG-UI `0.0.57`，并通过现有 Headless Client 与 Runtime Host 集成验证运行协议。

`@copilotkit/vue/v2` 的目标用途是受控 `CopilotChatView` 和 Provider 外壳，而不是由 `CopilotChat` 或托管线程接管平台 Runtime Truth。
CopilotKit 不拥有 Runtime Thread、Operation、Surface、Command 幂等或 Presentation 决策。
Workbench 不使用 CopilotKit 托管线程作为平台历史权威来源。

当前 `main` 基线尚未完成 Conversation View 的正式接入，因此不能把受控 CopilotKit Vue 会话 UI 描述为已经交付的当前能力。
会话 UI 的实施与验收以 `GOAL-WEB-COPILOTKIT-UI-001` 和当前 Workbench SRS 为准。

CopilotKit 的样式由 `src/styles/copilotkit.css` 单独引入。
如果后续 CopilotKit 升级破坏受控视图的消息、输入或停止事件，应先保持已验证版本组合，并在独立兼容任务中协调 Vue、Runtime 与 Vitest 升级。

## 架构边界

Workbench 只读取以下浏览器配置：

- Runtime Host 地址；
- 环境名称。

Workbench 不存在 UI Compiler URL、Business Agent 私有地址、Model Provider 地址或密钥配置。

Runtime Host 地址派生的目标规范入口包括：

```text
<runtime-host>/api/copilotkit        # AG-UI Agent interaction
<runtime-host>/health
<runtime-host>/health/dependencies
<runtime-host>/api/catalog           # non-Agent REST query
<runtime-host>/api/scenarios         # non-Agent REST query
```

Thread、Turn、Operation、Surface、Turn Details、Artifact 等 Runtime / Diagnostic 查询同样属于非 Agent REST 能力，不构成第二套 Agent 协议。

迁移期实现如果仍存在 `/api/runs`、`/api/actions` 或 `/ws/runs`，它们属于 compatibility / debug adapter，不是 Workbench 新功能的规范接入入口。

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

Windows PowerShell：

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
现有基础 E2E 使用真实 Chromium、可发布静态构建与进程内受控测试替身，覆盖运行、刷新、安全 Markdown、PresentationResult、诊断、受控 A2UI Raw Viewer 和 Action Resume 等基线能力。
后续 Conversation / Runtime Truth 迁移应继续补充 AG-UI Conversation、恢复、Inspect 和受控 Command 的验收覆盖。
底层 compatibility HTTP / WebSocket Adapter 可以独立测试，但这些测试不表示存在多套 Workbench Agent 应用协议。

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

## 相关文档

- [Workbench SRS](../../docs/WEB_WORKBENCH_SRS.md)
- [平台架构](../../docs/platform/ARCHITECTURE.md)
- [平台开发验证环境](../../docs/platform/DEVELOPMENT_ENVIRONMENT.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](../../docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0026：AG-UI Agent 应用协议边界](../../docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
