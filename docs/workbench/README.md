# Generative UI Workbench 文档

本目录汇总 Generative UI Workbench 的当前产品和架构入口。

Workbench 是 Generative UI Platform 的 Frontend Runtime 参考实现和端到端开发验收环境。
它只连接 Agent Runtime Host，不直接连接 Business Agent、Presentation Pipeline 或 UI Compiler Core。

## 当前规范

- [Workbench 软件需求规格](../WEB_WORKBENCH_SRS.md)
- [平台级需求](../platform/REQUIREMENTS.md)
- [平台级架构](../platform/ARCHITECTURE.md)
- [平台系统架构](../platform/SYSTEM_ARCHITECTURE.md)
- [全链路开发验证环境](../platform/DEVELOPMENT_ENVIRONMENT.md)
- [当前开发环境 Goal](../goals/GOAL-DEV-ENV-001.md)
- [ADR-0019：Presentation Pipeline 嵌入 Runtime Host](../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)

## 核心边界

- Web 只连接 Agent Runtime Host。
- Runtime Host 负责 Run 生命周期、Action 校验、恢复编排和进程内 Presentation Pipeline 组装。
- Business Agent 负责业务推理、后端业务工具和权威业务状态。
- Presentation Pipeline 负责展示路由、候选验证、受控 UI 编译和安全降级。
- Model Adapter 输出不可信的 PresentationDecision Candidate；仅 `generative-ui` 分支包含 UI Plan Candidate。
- UI Compiler Core 是唯一可信 A2UI 生产者。
- Workbench 负责 Markdown/A2UI 渲染、前端 Action 和诊断展示，不承担业务工具或 UI 编译职责。
