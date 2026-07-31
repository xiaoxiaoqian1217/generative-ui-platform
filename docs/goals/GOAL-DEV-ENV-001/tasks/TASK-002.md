# TASK-002：TypeScript LangGraph Reference Business Agent

## 目标

建立用于平台链路验证的简易 Reference Business Agent。

它用于产生真实业务形态的 Markdown 或结构化数据，不代表正式业务系统。

## 参考场景

- 查询设备状态。
- 生成巡逻计划草稿。
- 确认巡逻任务。

## 工作项

- 创建 `apps/business-agent-langgraph`。
- 使用 TypeScript LangGraph 实现业务状态图。
- 提供健康检查、Run API 和 Resume Action API。
- 使用内存 Checkpoint 支持暂停和恢复。
- 实现确定性 Fixture 业务工具。
- 输出满足 Business Agent Contract 的 AgentContent。
- 增加节点单元测试、Contract Test 和进程级集成测试。

## 架构限制

- 默认不需要模型 API Key。
- 不调用 Presentation Pipeline、Presentation Model Adapter 或 UI Compiler Core。
- 不输出 PresentationDecision、UI Plan Candidate 或 A2UI。
- 不选择前端组件，不生成 HTML 或 Vue。
- 真实业务 Agent 的接入方式由 Business Agent Adapter 隔离。

## 验收

- 三个参考场景均可通过 API 执行。
- 任务草稿可以暂停，确认 Action 可以恢复同一线程。
- 输出满足 Business Agent Contract。
- 无 API Key 时可以稳定运行和测试。
