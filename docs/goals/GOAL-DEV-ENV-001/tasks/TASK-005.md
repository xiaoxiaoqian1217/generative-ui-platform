# TASK-005：Runtime Host 平台编排

## 目标

把 Business Agent 和 UI Compiler 串成完整后端链路。

Fixture 编译链路使用 UI Compiler Service 现有 Model Adapter，不等待真实 Provider 接入完成。

## 流程

```text
用户请求
→ Business Agent Adapter
→ AgentContent
→ PresentationRequest
→ UI Compiler Service
→ PresentationResult
→ Web
```

## 工作项

- 实现 RunOrchestrator。
- 实现 ActionOrchestrator 的基础结构。
- 实现 UICompilerClient。
- 实现最小 SurfaceContextStore。
- 实现 DependencyHealthService。
- 提供 `/api/runs`、`/api/actions`、`/health/dependencies` 和 `/ws/runs`。
- 让 HTTP 与 WebSocket 复用相同应用层编排。
- 贯穿 requestId、threadId、runId 和 presentationRequestId。
- 定义 UI Compiler 不可达、返回失败结果和返回降级结果时的不同处理。

## 架构限制

- Runtime Host 不生成 PresentationDecision、UI Plan Candidate 或 A2UI。
- Runtime Host 不直接调用模型。
- Transport 层不放业务逻辑。
- Compiler 内部错误和降级以 PresentationResult 契约为准。
- UI Compiler Service 完全不可达时，Runtime 返回稳定平台错误，不伪造编译成功结果。

## 验收

- AgentContent 正确包装为 PresentationRequest。
- PresentationResult 正确映射为 Runtime Result。
- HTTP 和 WebSocket 对相同输入产生等价应用结果。
- Compiler 的成功、降级、失败和不可达场景均有测试。
- 全链路关联 ID 可用于诊断。
