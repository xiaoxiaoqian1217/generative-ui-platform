# Generative UI Platform

面向 Agent 应用的生成式 UI 编译基础设施仓库。

## 名称与范围

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 长期平台名称 | 持续使用 |
| Generative UI Compiler | 当前 MVP 产品 | 本期实现 |
| Interaction Gateway | 未来 Agent 协作扩展能力 | 不属于当前 MVP |

仓库名称使用 Generative UI Platform，不代表当前已经实现完整 Agent 平台能力。

当前实现重点是 **Generative UI Compiler**：将 Agent 输出转换为标准化、受控、可渲染的生成式 UI 描述。

## Problem

传统 Agent 应用交互存在：

- Agent 输出格式不统一；
- 每个前端应用需要重复处理 Agent 输出；
- UI 与业务 Agent 强耦合；
- 缺少统一的 UI Contract 和组件约束。

本项目通过 Presentation Contract、UI Compiler 和 Component Catalog 解决 Agent 到声明式 UI 的转换问题。
外部 Frontend Runtime 再通过 Component Registry 将组件类型映射为真实组件实现。

## 当前 MVP: Generative UI Compiler

核心模块：

- `packages/ui-compiler-core`
- `apps/ui-compiler-agent`
- `packages/presentation-contract`
- `packages/component-catalog-schema`

架构：

```text
Business Agent / LLM Agent
(LangGraph / Claude / OpenAI Agent 等)
              |
              | Agent Output
              v
      UI Compiler Agent
              |
              v
      UI Compiler Core
              |
              v
      A2UI / Fallback
              |
              v
      Frontend Runtime Renderer
```

## 产品定位

Generative UI Compiler 是一个通用的 Agent 交互编译层：

- 不负责业务推理；
- 不负责 Agent 路由；
- 不负责任务编排；
- 不负责业务状态管理。

它负责：

- Agent 输出解析；
- Presentation Contract 转换；
- UI IR 到 A2UI 的编译；
- Component Catalog 校验；
- 受控 UI 生成。

复杂业务组件的类型、语义和 Schema 通过 Component Catalog 声明。
真实的 GIS、设备控制和领域任务面板实现由外部 Component Registry 提供，而不是由 Compiler 自动生成。

## 后续规划: Interaction Gateway

Interaction Gateway 是未来可能启动设计的 Agent 协作问题空间，例如：

- 多 Agent 路由；
- Agent 编排；
- 会话状态管理；
- 人机审批流程。

这些需求只构成启动设计的条件，不预先决定 Gateway 的产品关系、职责、依赖或部署方式。
任何 Gateway 工作都必须先通过显式的范围变更 Issue 和新 ADR。

## 文档入口

- [需求规格说明书](./docs/REQUIREMENTS.md)
- [架构说明](./docs/ARCHITECTURE.md)
- [数据契约](./docs/CONTRACTS.md)
- [领域词汇](./CONTEXT.md)
- [AI 编码 Agent 使用说明](./AGENTS.md)

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
pnpm validate
pnpm dev
pnpm build
pnpm test
```

> 当前仓库是基础设施和架构骨架，不代表需求规格中的产品能力已经全部实现。
