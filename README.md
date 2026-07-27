# Generative UI Platform

面向 Agent 应用的生成式 UI 展示和编译基础设施仓库。

## 名称与范围

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 长期平台名称 | 持续使用 |
| Generative UI Compiler | 当前 MVP 产品 | 本期实现 |
| Interaction Gateway | 未来 Agent 协作扩展能力 | 不属于当前 MVP |

仓库名称使用 Generative UI Platform，不代表当前已经实现完整 Agent 平台能力。

## Problem

业务 Agent 的内容输出可以是 Markdown 或 JSON 结构化数据。
它们不会稳定提供 `presentationMode`、`presentationIntent` 或 UI Plan。

系统需要解决两个不同问题：

1. 这次 Agent 输出应该直接显示为 Markdown，还是生成结构化 UI。
2. 已经决定生成 UI 后，如何把不可信的 UI Plan Candidate 转换为受控、可验证、可渲染的 UI 描述。

这两个问题分别由 Presentation Router 和 UI Compiler Core 负责。

## 当前 MVP 架构

```text
Business Agent / LLM Agent
返回 Markdown / JSON
              |
              v
      UI Compiler Service
              |
              v
      Presentation Router
              |
              +---- markdown ----> Sanitized Markdown
              |
              +---- generative-ui
                          |
                          v
              Schema-valid UI Plan Candidate
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

Presentation Router 可以通过可替换的 Model Adapter 调用大模型。
一次模型调用应同时返回简单 Markdown 表示决策或受 Schema 约束的 UI Plan Candidate，避免分类和规划分别调用模型。

普通 Markdown 经过安全清理后直接返回前端，不进入 UI Compiler Core。
结构化数据可以通过确定性规则或模型生成 UI Plan Candidate，也可以安全序列化为 Markdown 结果。
只有已经选择生成式 UI 的请求才进入 Core。

## 模块职责

### UI Compiler Service

- 接收业务 Agent 返回的 Markdown 或 JSON 结构化数据。
- 接收调用方能够提供的原始用户消息和展示上下文。
- 调用 Presentation Router。
- 组装具体 Model Adapter。
- 直接返回安全的 Markdown，或调用 UI Compiler Core。
- 处理 HTTP、AG-UI、超时、取消、错误映射和可观测性。

### Presentation Router

- 判断 Markdown 应直接展示还是生成 UI。
- 判断结构化数据应生成 UI 还是安全序列化为 Markdown。
- 在需要语义分析时调用 Model Adapter。
- 返回受约束的 `PresentationDecision`。
- 模型或路由失败时安全降级为 Markdown。

### UI Compiler Core

- 接受已经选择生成式 UI 的编译请求。
- 把 UI Plan Candidate 视为不可信输入，并校验 Component Catalog、Props、Actions 和结构。
- 构建框架无关 UI IR。
- 将 UI IR 编译为 A2UI。
- 生成确定性错误和降级结果。

Core 不决定是否生成 UI，也不直接依赖模型 SDK 或具体模型供应商。

### Frontend Runtime

- 使用 Markdown Renderer 展示 Markdown 结果。
- 使用 A2UI Renderer 和 Component Registry 展示生成式 UI。
- 提供真实 Vue、React、Flutter 或其他框架组件。

## 安全边界

- 模型输出始终是不可信输入。
- 模型不得生成或执行任意前端代码。
- 模型建议的组件必须存在于当前 Component Catalog。
- 所有 Props、Actions、UI IR 和 A2UI 必须经过 Schema 校验。
- 模型失败不得导致有效 Agent 业务内容丢失。

## 当前项目阶段

当前仓库处于需求确认后的规划阶段。
提前创建且与确认后架构不一致的应用、共享包和测试实现已经从活动代码树移除。
Git 历史和归档分支保留这些旧实现，仅用于追溯，不作为当前完成度或后续设计依据。

当前阶段只维护需求、架构、ADR、领域语言和仓库级工程基础设施。
任何产品代码都必须由明确的任务和已满足的阶段前置决策授权。
阶段二开始前必须先完成 A2UI Schema 版本和 Schema 校验库 ADR。

## 文档入口

- [需求规格说明书](./docs/REQUIREMENTS.md)
- [系统设计说明书](./docs/Generative_UI_Compiler_Design.md)
- [架构说明](./docs/ARCHITECTURE.md)
- [数据契约](./docs/CONTRACTS.md)
- [领域词汇](./CONTEXT.md)
- [ADR-0005](./docs/adr/0005-route-markdown-before-ui-compilation.md)
- [ADR-0006](./docs/adr/0006-support-structured-agent-content.md)
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

规划阶段常用命令：

```bash
pnpm validate
pnpm docs:check
```
