# Generative UI Platform

面向多智能体应用的生成式 UI 编译与统一交互平台。

## Problem

传统 Agent 交互存在：

- Agent 输出格式不统一
- 前端需要适配不同 Agent
- UI 和业务逻辑强耦合
- Action 无法可靠回传

本项目通过统一 Presentation Contract 和 UI Compiler 解决。

## 核心模块

- `packages/ui-compiler-core`：框架无关的 Markdown / 结构化数据 → UI IR → A2UI 编译核心。
- `apps/ui-compiler-agent`：将编译核心封装为独立 HTTP / AG-UI 服务。
- `apps/interaction-gateway`：面向前端的统一 AG-UI 入口，协调业务 Agent、Action 与 Surface。

## 文档入口

- [需求规格说明书](./docs/REQUIREMENTS.md)
- [架构说明](./docs/ARCHITECTURE.md)
- [数据契约](./docs/CONTRACTS.md)
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
