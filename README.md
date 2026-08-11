# Generative UI Platform

## 真实 Provider 快速开始

从干净克隆开始执行 `./scripts/bootstrap.ps1`。
在 `apps/agent-runtime-host/.env.local` 中配置真实 Presentation Model Provider 后，执行 `pnpm dev:platform`。

`pnpm dev:platform` 不会静默回退到 Fixture。
缺少 Provider、模型名或 API Key 时启动会失败并指出缺失的配置项。
浏览器入口是 `http://127.0.0.1:5173`。

执行 `pnpm test:e2e:platform` 可运行自包含、无需模型密钥的浏览器 E2E。
测试仅在测试进程内注入确定性替身，不提供可运行的 Fixture Provider。

完整的配置、单应用启动、真实 Provider、调试和排障说明见[平台开发者体验](./docs/platform/DEVELOPER_EXPERIENCE.md)。

Generative UI Platform 是面向 Agent 应用的生成式 UI 编译与受控交互运行基础设施仓库。

## 当前定位

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 仓库级和长期平台边界 | 持续建设 |
| Generative UI Compiler | 平台核心编译能力 | 已形成 Compiler MVP 基线 |
| Presentation Pipeline | 展示后处理应用 Package | 已提取并嵌入 Runtime Host |
| Agent Runtime Host | Agent Runtime Integration 后端入口与 Runtime Truth 权威 | 持续演进 |
| Generative UI Workbench | Frontend Runtime 参考实现与开发验证工作台 | 已用于开发验证环境 |
| Reference Business Agent | 全链路验证用参考 Agent | 已用于开发验证环境 |
| Interaction Gateway | 未来多 Agent 扩展能力 | 不属于当前阶段 |

当前仓库不再只描述 Compiler MVP。
当前平台已经覆盖 Business Agent 接入、Runtime Host、Runtime Truth、Embedded Presentation Pipeline、A2UI Renderer、受控 Action 和诊断链路。

这不是新的独立业务产品，而是 Generative UI Platform 的阶段性研发基础设施。

## 平台链路

```text
Generative UI Workbench
   │
   │ AG-UI
   │ current transport: HTTP POST + SSE
   ▼
Agent Runtime Host
├── Embedded CopilotKit Runtime
├── PlatformRunService
│     ▼
│   Runtime Kernel
│   ├── Runtime Repository
│   │   ├── Thread / Turn / Operation
│   │   └── Command / Surface / Presentation Snapshot
│   ├── Business Agent Adapter
│   │     │ private HTTP+SSE / WebSocket / ...
│   │     ▼
│   │   Reference Business Agent
│   │   └── Public Events + Final AgentContent
│   └── Embedded Presentation Pipeline
│         ├── Markdown → PresentationResult
│         └── Structured AgentContent
│               → Presentation Router / Model Adapter
│               → untrusted UI Plan Candidate
│               → UI Compiler Core
│               → A2UI PresentationResult
└── Runtime Event Projection
      ├── AG-UI → Workbench
      └── Diagnostics → Diagnostic Recorder
```

## 核心边界

- Web 只连接 Agent Runtime Host；
- Workbench 与 Runtime Host 之间以 AG-UI 作为唯一 Agent 应用协议；
- 当前 AG-UI 参考 Transport 为 HTTP POST + SSE，HTTP、SSE 和 WebSocket 不作为并列 Agent 业务协议；
- Business Agent 不需要支持 AG-UI、A2UI 或前端组件协议；
- Runtime Host 与 Business Agent 的具体 HTTP + SSE / WebSocket 调用由 Business Agent Adapter 隔离；
- Business Agent 拥有业务推理、业务 State、Checkpoint、后端工具和业务副作用语义；
- Runtime Host 拥有 Thread、Turn、Operation、Command Admission、Surface Lifecycle 和可信 Presentation Snapshot；
- Presentation Pipeline 是独立 Package，并嵌入 Agent Runtime Host 运行；
- Business Agent 公开过程事件不进入 Presentation Pipeline，只有最终 AgentContent 进入展示链路；
- Model Adapter 的逻辑归属是 Presentation Pipeline；
- Model Adapter 输出不可信的展示决策候选，选择 generative-ui 时包含 UI Plan Candidate；
- UI Plan Candidate 始终是不可信输入；
- UI Compiler Core 是唯一可信 A2UI 生产者；
- 浏览器 Action 只提出 Command，不通过 `runId` 指定权威内部执行上下文；
- 当前不建设独立 UI Compiler HTTP Service、UI Compiler Client 或 Embedded / Remote 双模式；
- Interaction Gateway 和多 Agent 路由仍属于未来范围。

## 当前项目状态

当前仓库已具备或正在收敛以下开发验证能力：

- UI Compiler Core；
- 可嵌入的 Presentation Pipeline Package；
- Presentation Contract；
- Component Catalog Schema；
- Agent Runtime Host；
- Runtime Host 对 Presentation Pipeline 的进程内组装；
- Runtime Thread / Turn / Operation / Surface / Command 交互事实模型；
- AG-UI Workbench Agent 交互，当前通过 HTTP POST + SSE 承载；
- Business Agent HTTP + SSE / WebSocket 私有 Adapter；
- Vue A2UI Renderer 与受控 Component Registry；
- Command / Action 安全校验、Reference Business Agent Resume 和再次展示；
- Runtime Repository 与 Diagnostic Store 分离；
- 三服务一键启动、逐 Turn / Operation 诊断与平台级 Playwright E2E。

## 文档结构

### 平台级规范

- [完整文档导航](./docs/README.md)
- [平台文档索引](./docs/platform/README.md)
- [平台级需求](./docs/platform/REQUIREMENTS.md)
- [平台系统架构](./docs/platform/SYSTEM_ARCHITECTURE.md)
- [全链路开发验证环境](./docs/platform/DEVELOPMENT_ENVIRONMENT.md)
- [平台范围调整摘要](./docs/platform/SCOPE_DECISION.md)
- [ADR 索引](./docs/adr/README.md)
- [ADR-0019：Presentation Pipeline 嵌入 Runtime Host](./docs/adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](./docs/adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)
- [ADR-0025：双外部接入模式与内部能力分层](./docs/adr/0025-adopt-two-external-integration-modes-and-layered-platform-capabilities.md)
- [ADR-0026：AG-UI Agent 应用协议边界](./docs/adr/0026-adopt-ag-ui-as-workbench-runtime-application-protocol.md)

### Compiler MVP 子系统基线

以下旧文档保留，不删除、不移动：

- [Compiler MVP 需求规格](./docs/REQUIREMENTS.md)
- [Compiler MVP 架构](./docs/ARCHITECTURE.md)
- [Compiler 系统设计](./docs/Generative_UI_Compiler_Design.md)
- [数据契约](./docs/CONTRACTS.md)

### 仓库规范

- [领域词汇](./CONTEXT.md)
- [AI 编码 Agent 使用说明](./AGENTS.md)
- [Workbench 需求](./docs/WEB_WORKBENCH_SRS.md)

## 文档适用规则

- 跨子系统关系和平台范围以 `docs/platform/` 与当前有效 ADR 为准；
- Compiler 内部信任和编译边界继续以原 Compiler MVP 文档为准；
- ADR-0019 取代旧文档中的独立 UI Compiler Service 目标部署结论；
- ADR-0024 定义 Runtime Truth Model 与安全 Command Admission；
- ADR-0026 定义 Workbench 与 Runtime Host 的 Agent 协议和 Transport 分层；
- 已完成 Goal 保留其历史交付事实，但被后续 ADR 取代的语义不得继续作为新增实现依据；
- 当前阶段执行内容必须由 Goal、Issue 或范围决策明确授权；
- Roadmap 不自动授权实现。

## 快速开始

Windows PowerShell：

```powershell
./scripts/bootstrap.ps1
```

Linux / WSL：

```bash
./scripts/bootstrap.sh
```

常用命令：

```bash
pnpm check:boundaries
pnpm typecheck
pnpm dev:platform
pnpm verify:platform
pnpm docs:check
```

完整安装、启动、AG-UI 联调、Provider 配置和排障步骤见[平台开发验证指南](./docs/platform/DEVELOPMENT_ENVIRONMENT.md)。
