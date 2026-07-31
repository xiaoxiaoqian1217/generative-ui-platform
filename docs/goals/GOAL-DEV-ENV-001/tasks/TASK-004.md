# TASK-004：Presentation Model Adapter 多模型接入

## 目标

扩展 `packages/presentation-pipeline` 中的 Model Adapter，使其可以使用 Fixture 或真实模型分析 Business Agent 输出，并生成不可信的 `PresentationDecision` 候选。

候选选择 `generative-ui` 时必须包含 UI Plan Candidate；候选也可以选择 Markdown。

## 实施前审计

先检查当前：

- `ModelAdapter` 接口和 `generatePresentationDecisionCandidate` 语义。
- Fixture / test Model Adapter。
- ModelPresentationRequest 和输出 Schema。
- PresentationDecision 校验。
- Timeout、Retry、AbortSignal 和错误分类。
- Prompt、Catalog 摘要、日志和可观测性。

优先扩展 TASK-013 提取后的现有实现，禁止创建重复平行体系。

## 工作项

- 将测试 Fixture 提炼为可配置的开发 Fixture Adapter。
- 实现或完善 OpenAI-compatible Provider 基础适配。
- 实现 Provider Registry 和配置校验。
- 支持配置 Kimi、豆包、GLM 和通义千问 Provider。
- 明确 Provider 与 Model Name 分离，模型名、Base URL、Endpoint ID 和 API Key 全部配置化。
- 支持 Timeout、Abort 和有限 Retry。
- 复用现有稳定错误码并归一化 Provider 错误。
- 解析安全的 Usage、延迟和响应 ID 摘要。
- 强制校验 PresentationDecision；`generative-ui` 模式继续校验 UI Plan Candidate。
- 增加 Provider Contract Test 和按需执行的真实 Provider Smoke Test。

## 架构限制

- Model Adapter 的逻辑归属是 Presentation Pipeline。
- 它运行在 Agent Runtime Host 进程内，但只能由 Presentation Router / Pipeline 调用。
- 不用于 Business Agent 业务推理或业务工具调用。
- Provider 输出始终是不可信候选。
- 不直接生成可信 A2UI、HTML、Vue 或任意可执行代码。
- API Key、Authorization 和敏感 Prompt 不进入浏览器或日志。
- Router 继续负责 Timeout、Retry 和候选验证时，不得在 Adapter 内重复实现冲突策略。

## 验收

- Fixture 模式确定性通过，并可模拟超时、限流和非法候选。
- Kimi、豆包、GLM 和通义千问均可通过配置注册。
- 至少一个真实 Provider Smoke Test 通过。
- 更换 Provider 不修改 UI Compiler Core 或 Runtime Orchestrator。
- Markdown 和 generative-ui 两类 PresentationDecision 候选均可正确处理。
- 非法候选进入现有重试、降级或失败路径。
