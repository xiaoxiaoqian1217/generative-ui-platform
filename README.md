# Generative UI Platform

## 可复现真实 Provider 快速开始

从干净克隆开始执行 `./scripts/bootstrap.ps1`，然后执行 `pnpm dev:platform`。

三服务本地联调需要服务端配置真实 Presentation Model 凭证，浏览器入口是 `http://127.0.0.1:5173`。

执行 `pnpm test:e2e:platform` 可运行不依赖模型密钥的自包含受控浏览器 E2E。

完整的配置、单应用启动、真实 Provider、调试和排障说明见[平台开发者体验](./docs/platform/DEVELOPER_EXPERIENCE.md)。

面向 Agent 应用的生成式 UI 编译与交互运行基础设施仓库。

## 当前定位

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 仓库级和长期平台边界 | 持续建设 |
| Generative UI Compiler | 平台核心编译能力 | 已形成 Compiler MVP 基线 |
| Presentation Pipeline | 展示后处理应用 Package | 已提取并嵌入 Runtime Host |
| Generative UI Workbench | Frontend Runtime 参考实现与开发验证工作台 | 已用于开发验证环境 |
| Reference Business Agent | 全链路验证用参考 Agent | 已用于开发验证环境 |
| Interaction Gateway | 未来多 Agent 扩展能力 | 不属于当前阶段 |

当前仓库不再只描述 Compiler MVP。
当前 Goal 已交付覆盖 Business Agent、Runtime Host、Embedded Presentation Pipeline、A2UI Renderer 和 Action 回传的全链路开发验证环境。

这不是新的独立产品，而是 Generative UI Platform 的阶段性研发基础设施。

## 平台链路

```text
Generative UI Workbench
→ Agent Runtime Host
   ├── Business Agent Adapter
   │   → Reference Business Agent
   │   → Markdown / Structured Data
   │
   └── Embedded Presentation Pipeline
       → Presentation Router / Model Adapter
       → untrusted PresentationDecision Candidate
       → UI Plan Candidate when generative-ui is selected
       → UI Compiler Core
       → PresentationResult
→ Frontend Markdown / A2UI Renderer
→ Action 回传
```

## 核心边界

- Web 只连接 Agent Runtime Host。
- Business Agent 只输出 Markdown 或结构化业务数据。
- Business Agent 不需要支持 AG-UI、A2UI 或前端组件协议。
- Presentation Pipeline 是独立 Package，并嵌入 Agent Runtime Host 运行。
- Model Adapter 的逻辑归属是 Presentation Pipeline。
- Model Adapter 输出不可信的展示决策候选；选择 generative-ui 时包含 UI Plan Candidate。
- UI Plan Candidate 始终是不可信输入。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- Runtime Host 负责组合和 Run 生命周期，但不承担 UI 规划和 A2UI 编译。
- 当前不建设独立 UI Compiler HTTP Service、UI Compiler Client 或 Embedded / Remote 双模式。
- Interaction Gateway 和多 Agent 路由仍属于未来范围。

## 当前项目状态

当前仓库已具备以下开发验证能力：

- UI Compiler Core；
- 可嵌入的 Presentation Pipeline Package；
- Presentation Contract；
- Component Catalog Schema；
- Agent Runtime Host；
- Runtime Host 对 Presentation Pipeline 的进程内组装；
- HTTP / WebSocket 全链路验证；
- Vue A2UI Renderer 与受控 Component Registry；
- Action 安全校验、Reference Business Agent Resume 和再次展示；
- 三服务一键启动、诊断摘要与平台级 Playwright E2E。

## 文档结构

### 平台级规范

- [完整文档导航](./docs/README.md)
- [平台文档索引](./docs/platform/README.md)
- [平台级需求](./docs/platform/REQUIREMENTS.md)
- [平台系统架构](./docs/platform/SYSTEM_ARCHITECTURE.md)
- [全链路开发验证环境](./docs/platform/DEVELOPMENT_ENVIRONMENT.md)
- [平台范围调整摘要](./docs/platform/SCOPE_DECISION.md)
- [ADR 索引](./docs/adr/README.md)
- [ADR-0018：平台验证环境范围](./docs/adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0019：Presentation Pipeline 嵌入 Runtime Host](./docs/adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [当前开发环境 Goal](./docs/goals/GOAL-DEV-ENV-001.md)
- [当前 Goal 子任务包](./docs/goals/GOAL-DEV-ENV-001/README.md)

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

- 跨子系统关系和平台范围以 `docs/platform/` 与当前有效 ADR 为准。
- Compiler 内部信任和编译边界继续以原 Compiler MVP 文档为准。
- ADR-0019 取代旧文档中的独立 UI Compiler Service 目标部署结论。
- 当前 Goal 的总目标以 `docs/goals/GOAL-DEV-ENV-001.md` 为准。
- 可执行子任务以 `docs/goals/GOAL-DEV-ENV-001/tasks/` 为准。
- 当前阶段执行内容必须由 Goal、Issue 或范围决策明确授权。
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

完整安装、启动、演示、传输切换、Provider 配置和排障步骤见[平台开发验证指南](./docs/platform/DEVELOPMENT_ENVIRONMENT.md)。
