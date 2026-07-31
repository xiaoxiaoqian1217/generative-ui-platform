# Generative UI Platform

面向 Agent 应用的生成式 UI 展示和编译基础设施仓库。

## 名称与范围

| 名称 | 定位 | 当前状态 |
|---|---|---|
| Generative UI Platform | 长期平台名称 | 持续使用 |
| Generative UI Compiler | 当前 MVP 产品 | 本期实现 |
| Generative UI Workbench | Frontend Runtime 参考实现与开发验收工作台 | 需求和目录已初始化 |
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
      Frontend Runtime
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
- 通过 HTTP 返回 `PresentationResult`，并处理超时、取消、错误映射和可观测性。

AG-UI Run 生命周期属于 Agent Runtime Host 或可选协议 Adapter，不是 UI Compiler Service 的规范输出。

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

### Agent Runtime Host

- 位于 Web 前端与 Business Agent 之间。
- 对前端提供统一交互入口。
- 通过 Adapter 适配 Business Agent 原有协议。
- 不要求 Business Agent 自身支持 AG-UI 或 CopilotKit。
- 不承担 UI 规划和 UI 编译职责。

### Generative UI Workbench

- 连接 Agent Runtime Host，不直接连接 Business Agent。
- 作为 Frontend Runtime 参考实现渲染 Markdown 和 A2UI。
- 提供开发联调、运行诊断、案例验收和版本回归能力。
- 通过智慧安防场景包验证空地多智能体巡防指挥流程。

## 安全边界

- 模型输出始终是不可信输入。
- 模型不得生成或执行任意前端代码。
- 模型建议的组件必须存在于当前 Component Catalog。
- 所有 Props、Actions、UI IR 和 A2UI 必须经过 Schema 校验。
- 模型失败不得导致有效 Agent 业务内容丢失。

## 当前项目阶段

当前仓库已具备 UI Compiler Service、UI Compiler Core、共享契约包和 Agent Runtime Host。
`presentation-contract` 和 `component-catalog-schema` 已提供第一组可执行契约、运行时 Schema 和边界校验。
`shared-types` 提供这些契约共用的唯一 `JsonValue` 和校验结果类型。
UI Compiler Core 已实现输入和 Catalog 校验、UI IR lowering、A2UI 0.9.1 Profile 编译和 Markdown 降级。
UI Compiler Service 已实现 Markdown Sanitizer、结构化数据资源校验、确定性 Markdown 直出和 HTTP 调用入口。

`apps/web-demo` 提供一个最小 Vue 浏览器演示页面，可通过 HTTP POST 或 WebSocket 与 Agent Runtime Host 的 Mock 接口交换完整文本消息。
两个通道只用于验证 Web 与 Runtime Host 的连接、请求、推送和错误展示，不提供 Token 级流式输出。

当前尚未接入真实 Business Agent。
Web Demo 收到的文本由 Runtime Host Mock 接口生成，不能用于证明真实业务任务已经可执行。
下一阶段应在 Agent Runtime Host 内新增明确的 Business Agent Adapter，而不是要求 Business Agent 改造为 AG-UI Agent。
当前也尚未完成 UI Compiler、Runtime Host 与 Web Renderer 的平台级运行闭环。

`apps/web-workbench` 已初始化需求和目录边界，后续将作为可发布的 Frontend Runtime 参考实现和开发验收工作台。Workbench 只连接 Agent Runtime Host；Business Agent Adapter、Run 编排和后端业务工具仍由 Runtime Host 负责。

当前阶段继续维护需求、架构、ADR、领域语言和仓库级工程基础设施。
依赖边界检查用于阻止应用反向依赖、Core 依赖协议 Adapter 等违规方向。

## HTTP / WebSocket 演示验证

启动 Agent Runtime Host：

```bash
pnpm --filter @generative-ui/agent-runtime-host dev
```

在另一个终端启动 Web Demo：

```bash
pnpm dev:web-demo
```

打开 `http://localhost:5173`，选择 `WebSocket` 或 `HTTP POST`，发送文本后 Runtime Host 会返回完整的 Mock 文本结果。

HTTP 接口也可以直接调用：

```bash
curl -X POST http://localhost:8200/api/demo/message \
  -H "content-type: application/json" \
  -d '{"type":"user_message","messageId":"demo-1","content":"查询设备状态"}'
```

## 文档入口

- [需求规格说明书](./docs/REQUIREMENTS.md)
- [Generative UI Workbench 软件需求规格说明书](./docs/WEB_WORKBENCH_SRS.md)
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

常用工程命令：

```bash
pnpm check:boundaries
pnpm typecheck
pnpm test
pnpm build
pnpm validate
pnpm docs:check
```
