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

## GitHub 协作约定

- 当前不配置 GitHub Actions。
- Issue 和 Pull Request 由维护者按需手动创建和管理。
- 不启用自动创建 Issue、自动分派、自动打标签或自动合并。
- 项目代码正式纳入版本控制后，再按实际需要评估是否添加最小 CI。
- 新增任何仓库自动化前，应确认它不会限制手动工作流或阻碍后续服务接入。

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
