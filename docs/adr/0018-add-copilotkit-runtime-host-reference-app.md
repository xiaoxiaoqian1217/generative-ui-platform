# ADR-0018: 增加 CopilotKit Runtime Host 参考应用

- **状态：** 已接受
- **日期：** 2026-07-30
- **关联 Issue：** #70

## 背景

Generative UI Compiler MVP 将 Copilot Runtime、业务 Agent 和 Frontend Runtime 定义为外部系统。
这一边界保证 UI Compiler Core 和 UI Compiler Service 不依赖具体 Agent 框架。

当前需要验证 Vue Headless 前端、AG-UI 通信和 Compiler 输出之间的真实集成链路。
如果只在独立仓库中实现 Runtime Host，Compiler 仓库无法持续验证公共契约和集成边界。
如果把 Runtime 能力直接写入 UI Compiler Service，则会混合 Agent Run 生命周期、展示路由和 UI 编译职责。

## 决策

仓库增加 `apps/agent-runtime-host`，作为非 Compiler MVP 产品能力的参考集成应用。
该应用使用 CopilotKit Runtime v2，并通过 Node.js HTTP Handler 暴露 `/api/copilotkit`。

Runtime Host 可以承担：

- CopilotKit 前端与 Agent 之间的 AG-UI 通信；
- Agent 注册和路由；
- 认证、请求头策略和运行时中间件的未来接入位置；
- 调用外部业务 Agent；
- 在得到 Markdown 或 JSON 后调用 UI Compiler Service；
- 把 `PresentationResult` 映射为前端可消费的 Agent 协议事件。

Runtime Host 不得承担：

- Presentation Router 的展示模式决策；
- UI Plan Candidate 的生成和权威校验；
- Component Catalog 的权威校验；
- UI IR 和 A2UI 编译；
- Interaction Gateway、多 Agent 协作、长期记忆或业务工作流职责。

第一阶段只注册一个用于通信验证的 Built-in Agent。
真实业务 Agent、UI Compiler 编排闭环和生产认证不属于本 Issue。

CopilotKit 的自动 A2UI 生成中间件默认不启用。
A2UI 的权威生成和校验继续由 UI Compiler 负责。
Runtime Host 只能传输或适配 Compiler 已产生的 `PresentationResult`。

依赖方向固定为：

```text
Frontend
    |
    v
apps/agent-runtime-host
    |
    +----> external Business Agent
    |
    +----> apps/ui-compiler-service HTTP API
```

`ui-compiler-core`、共享契约包和 `ui-compiler-service` 不得依赖 CopilotKit Runtime。

## 后果

- 仓库可以提供可重复的 Vue Headless 和 AG-UI 集成验证入口。
- CopilotKit 被隔离在独立应用层，不污染 Compiler Core 和共享契约。
- Runtime Host 可以独立部署、替换或移出仓库。
- 新应用增加第三方依赖和锁文件维护成本。
- 当前应用仅是参考宿主，不代表 Interaction Gateway 已进入 MVP。
- 后续接入真实业务 Agent 和 Compiler 闭环需要独立 Issue 和验收条件。

## 取代关系

本 ADR 不取代现有 Compiler MVP 架构决策。
它对需求文档中“Copilot Runtime 不属于 Compiler MVP”的表述增加一个受控例外：仓库可以包含独立的参考集成应用，但该应用不属于 Compiler 产品模块。
