# 平台范围调整决策摘要

## 状态

已接受。

本文件保留为平台文档中的简要入口。
正式架构决策、背景、取代关系和后果以 [ADR-0018](../adr/0018-expand-repository-scope-to-platform-validation-environment.md) 为准。

## 决策摘要

- Generative UI Platform 作为仓库级和长期平台边界。
- Generative UI Compiler 继续作为平台核心子系统。
- 原 Compiler 需求、架构、设计文档和 ADR 保留，继续作为子系统基线。
- `docs/platform/` 作为平台级规范入口。
- 当前阶段建设全链路开发验证环境，而不是新的独立业务产品。
- 当前允许实现 Reference Business Agent、Business Agent Adapter、Runtime 编排、Workbench、A2UI Renderer 和 Action 回传。
- Model Adapter 继续属于 UI Compiler Service。
- UI Compiler Core 继续是唯一可信 A2UI 生产者。
- Web 只连接 Agent Runtime Host。
- Interaction Gateway 和多 Agent 路由仍不属于当前阶段。

## 影响

平台级规范与 Compiler 子系统规范分层维护。
旧 MVP 决策继续可追溯。
编码任务必须根据修改范围选择正确规范来源。
涉及仓库范围、Gateway、跨子系统职责或信任边界变化时，必须先更新对应 ADR。
