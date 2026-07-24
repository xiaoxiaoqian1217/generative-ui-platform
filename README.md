# Generative UI Platform

面向多智能体应用的生成式 UI 编译与统一交互平台仓库。

## 名称与范围

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 仓库名称和长期平台定位 | 持续使用 |
| Generative UI Compiler | 当前 MVP 产品 | 本期实现 |
| Interaction Gateway | 平台未来扩展能力 | 不属于当前 MVP |

仓库名称使用 Generative UI Platform，不表示当前已经实现完整平台能力。

当前需求、开发和验收范围仅覆盖 Generative UI Compiler。

## Problem

传统 Agent 交互存在：

- Agent 输出格式不统一
- 前端需要适配不同 Agent
- UI 和业务逻辑强耦合

本项目通过统一 Presentation Contract 和 UI Compiler 解决。

## 当前 MVP: Generative UI Compiler

- packages/ui-compiler-core
- apps/ui-compiler-agent

当前 MVP 解决输出标准化和受控 UI 编译；Action 路由和回传由后续 Interaction Gateway 负责。

## 后续规划: Interaction Gateway

- apps/interaction-gateway

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
