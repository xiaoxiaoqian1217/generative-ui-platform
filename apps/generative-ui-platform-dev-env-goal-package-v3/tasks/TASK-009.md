# TASK-009：完整平台 E2E

## 目标

使用真实进程和真实浏览器验证完整链路。

## Playwright 场景

- 查询设备状态；
- 生成巡逻计划；
- 确认任务；
- Markdown 路径；
- A2UI 路径；
- HTTP；
- WebSocket；
- Business Agent 不可用；
- UI Compiler 不可用；
- Model Adapter 超时；
- Model Adapter 非法 UI Plan Candidate；
- 非法 A2UI；
- 非法 Action；
- 安全降级。

## 模型测试

CI 默认使用 Fixture。

真实 Provider Smoke 只断言：

- UI Plan Candidate Schema；
- Component Catalog 约束；
- Compiler 成功或正确降级；
- A2UI 可渲染；
- 不断言固定自然语言。

## 验收

- Fixture 全链路在 CI 稳定通过；
- HTTP 和 WebSocket 均通过；
- 至少一个真实 UI Compiler Model Provider Smoke 通过；
- 测试进程正确清理；
- 失败具有明确诊断。
