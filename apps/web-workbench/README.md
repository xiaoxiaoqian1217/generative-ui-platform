# Generative UI Workbench

## 当前定位

`apps/web-workbench` 当前是 Generative UI Platform 的 **Generative UI Lab / 可视化开发调试工作台**。

它的首要目的不是提供完整 Agent Runtime 产品体验。
它用于验证：

> 给定一份最终 AgentContent，Presentation Pipeline 为什么生成了这个 Presentation，以及结果是否正确、漂亮、稳定、主题一致且受控。

当前产品合同以 `docs/WEB_WORKBENCH_SRS.md` 和 ADR-0027 为准。

## 当前主线

Workbench 当前优先验证：

```text
AgentContent / Scenario
        ↓
Presentation
        ↓
Presentation Decision
        ↓
UI Plan Candidate
        ↓
Validation / Compiler Result
        ↓
trusted A2UI
        ↓
Rendered UI
```

当前重点能力包括：

- AgentContent / Reference Scenario 输入；
- Markdown / Generative UI Presentation；
- Presentation Decision 查看；
- UI Plan Candidate 查看；
- Validation / Compiler Error 查看；
- trusted A2UI Raw Viewer；
- 受控 Component Registry Renderer；
- Theme / Presentation Context；
- Catalog；
- Viewport Preview；
- Compare / Reliability 验证。

## 当前不再作为 Release Gate 的能力

以下能力已有实现可以在迁移期保留，但当前停止扩张：

- Conversation-first；
- Runtime-owned Conversation History；
- Thread / Turn / Operation 产品视图；
- Runtime Recovery；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- Reconcile；
- 完整 Runtime Diagnostics；
- Diagnostic Bundle 产品化；
- Cases / Regression Management。

这些能力属于 ADR-0027 定义的 Deferred Runtime Platform 或历史开发验证路径。

## Supporting Agent Integration

Workbench 当前仍可以通过 Agent Runtime Host 使用 CopilotKit / AG-UI 参考链路。

```text
Workbench
   │ AG-UI
   │ current transport: HTTP POST + SSE
   ▼
Agent Runtime Host
```

这条路径用于验证真实 Business Agent Integration。
它不是 Generative UI Core 的强制协议。

未来即使不使用 CopilotKit，Workbench 的 Presentation 调试模型也不应改变。

当前 Workbench 仍只读取：

- `VITE_RUNTIME_HOST_URL`；
- `VITE_WORKBENCH_ENVIRONMENT`。

不得将 Provider、API Key 或 Business Agent 私有地址写入 `VITE_*`。

## 职责边界

Workbench 可以：

- 选择输入；
- 选择 Theme / Context；
- 触发参考 Presentation 链路；
- 展示 Presentation 开发信息；
- 渲染 trusted Presentation；
- 比较输出。

Workbench MUST NOT：

- 直接成为 Business Agent；
- 重新解释 Business Truth；
- 自己生成第二份 UI Plan；
- 绕过 Presentation Pipeline；
- 绕过 UI Compiler Core；
- 把 untrusted UI Plan 当作 trusted A2UI；
- 执行模型生成的任意 HTML / JavaScript；
- 持有 Presentation Model Provider 密钥。

## 当前实现基线

当前代码仍包含之前 Runtime-first 阶段形成的功能和页面。

其中包括：

- Vue 3、Vite 和 TypeScript；
- Playground / Conversation / Inspect / Cases / Catalog / Scenarios / Settings 等既有路由；
- 安全 Markdown；
- PresentationResult；
- A2UI Raw Viewer；
- 受控 Component Registry；
- Action / Confirmation 等既有 Runtime Integration；
- 环境和连接诊断；
- Reference Scenarios；
- Playwright E2E。

这些实现事实不反向定义当前产品范围。

本次 Scope Reset 不要求立即删除旧页面。
后续通过独立 Issue 判断哪些路径继续保留、隔离或删除。

## CopilotKit 基线

当前参考 Agent Integration 固定使用：

- `@copilotkit/core` / `@copilotkit/vue` `1.64.1`；
- `@copilotkit/runtime` `1.63.2`。

这组版本属于当前参考 Integration 的工程约束，不是 Generative UI Core Contract。

如果未来替换 CopilotKit，只允许影响 Integration Adapter 和对应 UI 接入层。
Presentation Pipeline、UI Compiler Core、Catalog 和 Theme Contract 不应因此改变。

## 本地运行

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev:web-workbench
```

默认使用页面同源地址作为 Runtime Host。

需要连接独立 Runtime Host 时：

```bash
VITE_RUNTIME_HOST_URL=https://runtime.test.example pnpm dev:web-workbench
```

Windows PowerShell：

```powershell
$env:VITE_RUNTIME_HOST_URL = "https://runtime.test.example"
pnpm dev:web-workbench
```

## 外部运行时配置

发布后可以在加载应用前覆盖：

```js
window.__GEN_UI_WORKBENCH_CONFIG__ = {
  runtimeHostUrl: "https://runtime.test.example",
  environment: "test",
};
```

Runtime Host 地址只接受不包含凭据的 `http` 或 `https` URL。

## 构建与验证

```bash
pnpm build:web-workbench
pnpm test:web-workbench
pnpm test:e2e:web-workbench
```

静态构建输出位于 `apps/web-workbench/dist`。

后续 Workbench 新测试应优先覆盖：

- AgentContent；
- Presentation Decision；
- UI Plan；
- Compiler Validation；
- A2UI；
- Rendered UI；
- Theme；
- fallback；
- reliability scenarios。

已有 Runtime Integration 测试继续用于防止现有安全行为回退，但不再自动扩大当前 MVP。

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

容器监听 `8080`。
可用性端点为 `/workbench-health`。

## 相关文档

- [Workbench SRS](../../docs/WEB_WORKBENCH_SRS.md)
- [ADR-0027：Presentation-first Scope Reset](../../docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [平台需求](../../docs/platform/REQUIREMENTS.md)
- [平台架构](../../docs/platform/ARCHITECTURE.md)
- [ADR-0025：双外部接入模式](../../docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：当前 AG-UI 参考集成协议](../../docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
