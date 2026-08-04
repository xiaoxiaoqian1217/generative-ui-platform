# TASK-008：自动化验证与文档收口

## 目标

以确定性自动化验证收口 Workbench 产品化能力和文档。

## 交付

- 使用进程内测试替身覆盖 Runtime、Workbench 和浏览器 E2E。
- 覆盖案例重放、语义断言、路由、Catalog 预览、确认型 Action 和错误诊断。
- 证明 HTTP + SSE 与 WebSocket Business Agent Adapter 具有等价 Runtime Contract 语义。
- 证明 CopilotKit、HTTP 和 WebSocket 前端入口复用同一 RunOrchestrator 语义。
- 更新部署、配置、排错和真实双模型开发联调文档。

## 验收

- CI 不访问真实模型，不启动 Fixture Provider，也不依赖外部模型服务。
- 文档与实现不再将可运行 Fixture 描述为默认模式。

## 依赖

TASK-001、TASK-002、TASK-005、TASK-006 和 TASK-007。
