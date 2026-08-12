# Generative UI Workbench

## 当前定位

`apps/web-workbench` 当前是 Generative UI Platform 的 **真实 Agent 驱动 Generative UI Lab / 可视化开发调试工作台**。

它的首要目的不是提供完整 Agent Runtime 产品体验，也不是让开发者手工粘贴 AgentContent JSON。

它用于验证：

> 用户通过自然语言驱动 Business Agent 后，最终 AgentContent 如何被 Presentation Pipeline 转换为可信 Presentation，以及这个过程是否正确、稳定和受控。

当前产品合同以 `docs/WEB_WORKBENCH_SRS.md` 和 ADR-0027 为准。

## 当前主流程

```text
User natural language
        ↓
Workbench
        ↓
Reference Agent Integration
        ↓
Business Agent
        ↓
Final AgentContent
        ↓
Presentation Pipeline
        ↓
Presentation Decision
        ↓
Markdown or trusted Generative UI
        ↓
Workbench Renderer
```

AgentContent 是系统中间边界和 Inspect 对象，不是当前 Workbench 主输入。

## 当前重点能力

Workbench 当前优先建设：

- Natural-language Conversation；
- Business Agent public activity；
- Final Presentation；
- AgentContent Inspect；
- Presentation Decision Inspect；
- UI Plan Candidate Inspect；
- Validation / Compiler Error Inspect；
- trusted A2UI Raw Viewer；
- 受控 Component Registry Renderer；
- Theme / Presentation Context；
- Catalog；
- Viewport Preview；
- fallback / Reliability 验证。

## Router 语义

Workbench 不根据 AgentContent 的 content type 猜测 presentation mode。

ADR-0015 继续有效：

```text
Markdown or Structured AgentContent
        ↓
Presentation Router
        ├── deterministic decision
        └── Presentation Model when needed
        ↓
Presentation Decision
        ├── markdown
        └── generative-ui + UI Plan Candidate
```

## Conversation 当前边界

真实 Agent Conversation 是当前 Supporting Core Experience。

以下能力已有实现可以在迁移期保留，但当前停止扩张：

- long-term Runtime-owned Conversation History；
- Conversation Rename / Archive / Delete；
- Thread / Turn / Operation 产品视图；
- Runtime Host restart recovery；
- Surface Lifecycle 产品化；
- Command Admission 产品化；
- Reconcile；
- 完整 Runtime Diagnostics；
- Diagnostic Bundle 产品化；
- Cases / Regression Management。

这些能力属于 Deferred Runtime Platform 或历史开发验证路径。

## Supporting Agent Integration

当前 Reference Path：

```text
Workbench
   │ AG-UI
   │ current transport: HTTP POST + SSE
   ▼
Agent Runtime Host / Reference Integration Host
   │ private Business Agent Adapter
   ▼
Business Agent
```

这条路径用于产生真实 AgentContent，不定义 Generative UI Core。

未来即使不使用 CopilotKit，Workbench 的 `Conversation → Presentation → Inspect` 产品心智也不应改变。

Workbench 只允许浏览器配置：

- `VITE_RUNTIME_HOST_URL`；
- `VITE_WORKBENCH_ENVIRONMENT`。

不得将 Provider API Key、Presentation Model credentials 或 Business Agent 私有地址写入 `VITE_*`。

## 职责边界

Workbench 可以：

- 表达用户自然语言意图；
- 展示 Agent public activity；
- 展示最终 Presentation；
- 打开 Presentation Inspect；
- 切换受控 Theme / Context；
- 浏览 Catalog；
- 渲染 trusted Presentation。

Workbench MUST NOT：

- 直接成为 Business Agent；
- 把手工 AgentContent JSON 输入变成主产品流程；
- 重新解释 Business Truth；
- 自己生成第二份 UI Plan；
- 绕过 Presentation Pipeline；
- 绕过 UI Compiler Core；
- 把 untrusted UI Plan 当作 trusted A2UI；
- 执行模型生成的任意 HTML / JavaScript；
- 持有 Presentation Model Provider 密钥。

## Catalog 与 Theme

Component Catalog 决定允许使用什么能力。
Theme 只决定已授权能力如何呈现。

Theme MAY 影响：

- design tokens；
- typography；
- spacing；
- density；
- layout preferences；
- Catalog 已授权 variants。

Theme MUST NOT 增加 / 删除 Catalog capability 或授权新的 Action。

## 当前实现基线

当前代码仍包含之前 Runtime-first 阶段形成的功能和页面，例如：

- Vue 3 / Vite / TypeScript；
- Playground / Conversation / Inspect / Cases / Catalog / Scenarios / Settings 等既有路由；
- safe Markdown；
- PresentationResult；
- A2UI Raw Viewer；
- 受控 Component Registry；
- Action / Confirmation 等既有 Runtime Integration；
- 环境和连接诊断；
- Reference Scenarios；
- Playwright E2E。

这些实现事实不反向定义当前产品范围。
本次 Scope Reset 不要求立即删除旧页面。

## CopilotKit 基线

当前 Reference Agent Integration 固定使用：

- `@copilotkit/core` / `@copilotkit/vue` `1.64.1`；
- `@copilotkit/runtime` `1.63.2`。

这组版本属于 Reference Integration 工程约束，不是 Generative UI Core Contract。

如果未来替换 CopilotKit，只允许影响 Integration Adapter 和对应 Agent UI 接入层。
Presentation Router、UI Compiler Core、Catalog 和 Theme 语义不应因此改变。

## 本地运行

从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev:web-workbench
```

默认使用页面同源地址作为 Runtime Host。

连接独立 Runtime Host：

```bash
VITE_RUNTIME_HOST_URL=https://runtime.test.example pnpm dev:web-workbench
```

发布后可以在加载应用前覆盖：

```js
window.__GEN_UI_WORKBENCH_CONFIG__ = {
  runtimeHostUrl: "https://runtime.test.example",
  environment: "test",
};
```

Runtime Host 地址只接受不包含凭据的 `http` 或 `https` URL。

### 使用 AG-UI Mock 验证 GIS Frontend Tool

独立终端启动可复用 mock：

```bash
pnpm --filter @generative-ui/ag-ui-mock build
pnpm --filter @generative-ui/ag-ui-mock exec ag-ui-mock --scenario locate-device --port 4800
```

在 Workbench Settings 中将 Runtime Host 配置为 `http://127.0.0.1:4800`。

在 Conversation 中输入“定位无人机 01”后，AG-UI mock 会请求 `locateDevice` Frontend Tool。

工具只改变独立 GIS Workspace 的设备选择状态，并由地图飞行、高亮 Marker 和最小 `DeviceCard` 呈现结果。

GIS Workspace 是受控业务 Surface，不是 A2UI Renderer，也不改变 Presentation Pipeline 的权威边界。

## 构建与验证

```bash
pnpm --filter @generative-ui/web-workbench typecheck
pnpm --filter @generative-ui/web-workbench test
pnpm --filter @generative-ui/web-workbench build
pnpm test:e2e:web-workbench
```

后续新测试应优先覆盖：

- Natural-language Conversation → Business Agent → Final AgentContent；
- public activity vs Final AgentContent separation；
- Presentation Decision；
- UI Plan / Compiler Validation；
- trusted A2UI / Rendered UI；
- Theme / Catalog separation；
- fallback / reliability scenarios。

已有 Runtime Integration 测试继续用于防止现有安全行为回退，但不自动扩大当前 MVP。

## 容器发布

容器监听 `8080`，可用性端点为 `/workbench-health`。
也可以直接将 `dist` 发布到支持 SPA Fallback 的静态站点。

## 相关文档

- [Workbench SRS](../../docs/WEB_WORKBENCH_SRS.md)
- [ADR-0027：Presentation-first Scope Reset](../../docs/adr/0027-refocus-current-phase-on-presentation-first-generative-ui.md)
- [ADR-0015：Presentation Router / Model Adapter](../../docs/adr/0015-presentation-router-and-model-adapter.md)
- [平台需求](../../docs/platform/REQUIREMENTS.md)
- [平台架构](../../docs/platform/ARCHITECTURE.md)
- [ADR-0025：双外部接入模式](../../docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：当前 AG-UI Reference Integration](../../docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)
