# Generative UI Platform

面向 Agent 应用的生成式 UI 编译与交互运行基础设施仓库。

## 仓库定位

Generative UI Platform 是整个仓库和长期平台边界。

平台负责把 Business Agent 输出的 Markdown 或结构化业务数据，转换为安全 Markdown 或受控 A2UI，并支持浏览器渲染和用户 Action 回传。

平台不允许模型直接生成并执行任意 HTML、JavaScript、Vue 或 React 代码。

## 名称与当前状态

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 整个仓库和长期平台边界 | 当前顶层建设对象 |
| Generative UI Compiler | 平台核心子系统 | 已具备 MVP 基础能力 |
| Agent Runtime Host | 平台统一 Web 接入和编排层 | 已初始化，继续扩展 |
| Generative UI Workbench | Frontend Runtime 参考实现和开发验收环境 | 需求与目录已初始化 |
| Reference Business Agent | 用于完整链路验证的 LangGraph Agent | 当前 Goal 待建设 |
| 全链路开发验证环境 | 平台研发基础设施和集成验证环境 | 当前阶段 Goal |
| Interaction Gateway | 未来多 Agent 协作扩展 | 不属于当前阶段 |

当前阶段不是将 Workbench 建设成独立企业产品，而是为整个平台建立可开发、可联调、可诊断、可回归的验证环境。

## 平台架构

```text
Vue Web Workbench
        |
        | HTTP / WebSocket
        v
Agent Runtime Host
        |                    \
        |                     \ PresentationRequest
        v                      v
Business Agent Adapter   UI Compiler Service
        |                      |
        v                      v
Business Agent          Presentation Router
                               |
                               v
                         Model Adapter
                               |
                               v
                     UI Plan Candidate
                               |
                               v
                      UI Compiler Core
                               |
                               v
                     PresentationResult
                               |
                               v
                       A2UI Renderer
                               |
                               v
                          Action Event
```

## 核心边界

- Web 只连接 Agent Runtime Host。
- Business Agent 不需要支持 AG-UI、A2UI 或 CopilotKit。
- Business Agent 只输出 Markdown 或结构化业务数据。
- Business Agent Adapter 不承担 UI 规划和编译。
- Model Adapter 位于 UI Compiler Service。
- Model Adapter 处理 AgentContent 并产生不可信 UI Plan Candidate。
- UI Compiler Core 不调用模型，也不决定展示模式。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- A2UI Renderer 只渲染 Component Registry 中注册的组件。
- Action 必须经过 Runtime Host 校验后才能进入业务流程。

## 当前项目阶段

当前仓库已经具备：

- UI Compiler Core。
- UI Compiler Service。
- Presentation Contract。
- Component Catalog Schema。
- A2UI 0.9.1 Profile 编译。
- Markdown 安全处理和降级。
- Agent Runtime Host。
- HTTP / WebSocket Mock 演示。
- Web Workbench 需求和目录边界。

当前尚未完成：

- TypeScript LangGraph Reference Business Agent。
- Business Agent Adapter 正式实现。
- Runtime Host 到 Business Agent 和 UI Compiler 的完整编排。
- UI Compiler Model Adapter 的真实供应商验证。
- Vue A2UI Renderer。
- Action 回传和 LangGraph Resume。
- 平台完整 E2E。
- 一键启动完整开发环境。

当前阶段 Goal：

> 建设生成式 UI 平台全链路开发验证环境。

## Compiler 子系统

原 `docs/REQUIREMENTS.md`、`docs/ARCHITECTURE.md` 和 `docs/Generative_UI_Compiler_Design.md` 继续保留。

这些文档现在作为 UI Compiler 子系统的历史需求和设计基线，不再单独代表整个仓库当前范围。

Compiler 内部架构没有被推翻，而是从仓库顶层架构调整为平台核心子系统架构。

## 文档入口

- [文档导航](./docs/README.md)
- [平台需求](./docs/platform/REQUIREMENTS.md)
- [平台架构](./docs/platform/ARCHITECTURE.md)
- [开发验证环境](./docs/platform/DEVELOPMENT_ENVIRONMENT.md)
- [当前 Goal](./docs/goals/GOAL-DEV-ENV-001.md)
- [Compiler 子系统文档](./docs/compiler/README.md)
- [Workbench SRS](./docs/WEB_WORKBENCH_SRS.md)
- [数据契约](./docs/CONTRACTS.md)
- [领域词汇](./CONTEXT.md)
- [ADR-0007](./docs/adr/0007-expand-scope-to-platform-validation-environment.md)
- [编码 Agent 说明](./AGENTS.md)

## 当前 Mock 演示

启动 Agent Runtime Host：

```bash
pnpm --filter @generative-ui/agent-runtime-host dev
```

在另一个终端启动 Web Demo：

```bash
pnpm dev:web-demo
```

打开 `http://localhost:5173`。

当前 Web Demo 只验证 Web 与 Runtime Host 的 HTTP / WebSocket Mock 通信，不能证明完整平台链路已经完成。

## 快速开始

### Windows PowerShell

```powershell
./scripts/bootstrap.ps1
```

### Linux / WSL

```bash
./scripts/bootstrap.sh
```

常用命令：

```bash
pnpm check:boundaries
pnpm typecheck
pnpm test
pnpm build
pnpm validate
pnpm docs:check
```
