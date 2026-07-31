# 平台范围调整决策摘要

## 状态

已接受。

本文件保留为平台文档中的简要入口。
仓库范围扩展以 [ADR-0018](../adr/0018-expand-repository-scope-to-platform-validation-environment.md) 为准。
平台后端和 Presentation Pipeline 部署边界以 [ADR-0019](../adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md) 为准。

## 决策摘要

- Generative UI Platform 作为仓库级和长期平台边界。
- Generative UI Compiler 继续作为平台核心子系统和独立 Packages 能力。
- 原 Compiler 需求、架构、设计文档和 ADR 保留，继续作为子系统基线。
- `docs/platform/` 作为平台级规范入口。
- 当前阶段建设全链路开发验证环境，而不是新的独立业务产品。
- 当前允许实现 Reference Business Agent、Business Agent Adapter、Runtime 编排、Workbench、A2UI Renderer 和 Action 回传。
- Agent Runtime Host 是平台统一后端入口和应用组合根。
- 取消独立 `ui-compiler-service` 作为目标部署应用。
- 原 UI Compiler Service 的展示应用能力重构为 Runtime Host 内部的 Presentation Pipeline。
- Model Adapter 继续属于展示决策和 UI 编译子系统，并只由 Presentation Pipeline 调用。
- UI Compiler Core 继续是唯一可信 A2UI 生产者。
- Web 只连接 Agent Runtime Host。
- Interaction Gateway 和多 Agent 路由仍不属于当前阶段。

## 影响

平台级规范与 Compiler 子系统规范分层维护。
公共能力通过独立 Packages、稳定契约和依赖边界复用，而不是通过独立 UI Compiler 微服务复用。
旧 MVP 决策继续可追溯。
编码任务必须根据修改范围选择正确规范来源。
涉及仓库范围、Gateway、跨子系统职责、部署边界或信任边界变化时，必须先更新对应 ADR。
