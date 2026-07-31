# TASK-003：Business Agent Adapter

## 目标

让 Runtime Host 通过统一 Adapter 调用 LangGraph Business Agent。

## 工作项

- 定义 `BusinessAgentAdapter`；
- 实现 LangGraph HTTP Adapter；
- 保留 Mock Adapter；
- 支持 run；
- 支持 resumeAction；
- 支持 Timeout；
- 支持 AbortSignal；
- 支持请求和结果 Schema 校验；
- 支持错误归一化；
- 透传 requestId、threadId、runId；
- 增加 Contract Test。

## 限制

- Runtime Host 不直接依赖 LangGraph SDK；
- Adapter 不做展示决策；
- Adapter 不调用 Model Adapter；
- Adapter 不生成 A2UI。

## 验收

- Agent 实现可替换；
- Agent 故障返回稳定错误；
- Run 和 Resume 集成测试通过。
