# TASK-009：完整平台 E2E

## 目标

使用真实进程和真实浏览器验证完整平台链路。

该任务依赖一键开发环境已经可稳定启动。

## Playwright 场景

- 查询设备状态。
- 生成巡逻计划。
- 确认任务并更新界面。
- Markdown 路径。
- A2UI 路径。
- HTTP 路径。
- WebSocket 路径。
- Business Agent 不可用。
- UI Compiler 不可用。
- Model Adapter 超时、限流和非法 PresentationDecision 候选。
- generative-ui 候选包含非法 UI Plan Candidate。
- 非法 A2UI。
- 非法、过期和重复 Action。
- Compiler 降级和 Runtime 稳定错误。

## 模型测试

CI 默认使用 Fixture Model Adapter。

真实 Provider Smoke 只断言：

- PresentationDecision 候选满足 Schema。
- generative-ui 模式的 UI Plan Candidate 满足 Schema 和 Catalog 约束。
- Compiler 成功、正确降级或返回稳定失败。
- 产生的 A2UI 可以渲染。
- 不断言固定自然语言或完全相同的组件选择。

## 验收

- Fixture 全链路在 CI 稳定通过。
- HTTP 和 WebSocket 均通过。
- Action Resume 完整通过。
- 至少一个真实 UI Compiler Model Provider Smoke 通过。
- 所有测试进程、端口和临时数据正确清理。
- 失败信息能够定位具体服务和阶段。
