# 平台范围调整决策

## 状态

已接受。

## 决策

- Generative UI Platform 作为仓库级和长期平台边界。
- Generative UI Compiler 继续作为平台核心子系统。
- 原 Compiler 需求、架构和设计文档保留，继续作为子系统基线。
- `docs/platform/` 作为平台级规范入口。
- 当前阶段建设全链路开发验证环境。
- 当前允许实现 Reference Business Agent、Business Agent Adapter、Runtime 编排、Workbench、A2UI Renderer 和 Action 回传。
- Model Adapter 继续属于 UI Compiler Service。
- UI Compiler Core 继续是唯一可信 A2UI 生产者。
- Web 只连接 Agent Runtime Host。
- Interaction Gateway 和多 Agent 路由仍不属于当前阶段。

## 影响

平台级规范与 Compiler 子系统规范分层维护。
旧 MVP 决策继续可追溯。
编码任务必须根据修改范围选择正确规范来源。
