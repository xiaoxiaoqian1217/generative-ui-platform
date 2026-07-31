# TASK-002：TypeScript LangGraph Business Agent MVP

## 目标

建立用于平台链路验证的简易 TypeScript LangGraph Business Agent。

## 场景

- 查询设备状态；
- 生成巡逻计划；
- 确认巡逻任务。

## 工作项

- 创建 `apps/business-agent-langgraph`；
- 实现 `/health`；
- 实现 Run API；
- 实现 Action Resume API；
- 实现内存 Checkpoint；
- 实现业务 Fixture 工具；
- 实现任务暂停和恢复；
- 输出 AgentContent；
- 增加单元和进程级集成测试。

## 限制

- 默认不需要模型 API Key；
- 不调用 UI Compiler Model Adapter；
- 不输出 UI Plan Candidate；
- 不输出 A2UI；
- 不选择前端组件。

## 验收

- 三个参考场景通过；
- 支持暂停和恢复；
- 输出满足 Business Agent Contract；
- 无 API Key 可运行。
