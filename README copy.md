# Generative UI Platform

面向多智能体应用的生成式 UI 编译与统一交互平台。

## 核心模块

- `packages/ui-compiler-core`：框架无关的 Markdown / 结构化数据 → UI IR → A2UI 编译核心。
- `apps/ui-compiler-agent`：将编译核心封装为独立 HTTP / AG-UI 服务。
- `apps/interaction-gateway`：面向前端的统一 AG-UI 入口，协调业务 Agent、Action 与 Surface。

## 文档入口

- [需求规格说明书](./REQUIREMENTS.md)
- [架构说明](./docs/ARCHITECTURE.md)
- [数据契约](./docs/CONTRACTS.md)
- [AI 编码 Agent 使用说明](./AGENTS.md)
- [GitHub 仓库设置](./docs/operations/REPOSITORY_SETUP.md)
- [Codex / Claude 自动化设置](./docs/operations/AI_AUTOMATION_SETUP.md)

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
