# TASK-008：Action 回传闭环

## 目标

完成浏览器用户操作到 Business Agent 状态恢复，再到 Embedded Presentation Pipeline 重新生成展示结果的受控闭环。

## 流程

```text
A2UI Action
→ Web Action Event
→ Agent Runtime Host
→ Surface / Action 校验
→ Business Agent Adapter
→ LangGraph Resume
→ 新 AgentContent
→ Embedded Presentation Pipeline
→ 新 PresentationResult
→ Web 更新
```

## 工作项

- Web 构造满足 Runtime Contract 的 Action Event。
- Runtime Host 校验 surfaceId、threadId、runId、actionId 和 actionType。
- 根据 SurfaceContextStore 校验 Action 是否属于当前 Surface。
- 校验 Catalog Action、Payload Schema、destructive 和 requiresApproval。
- 处理重复提交、过期 Surface 和已完成 Action。
- 调用 Business Agent Adapter 的 Resume Action。
- 恢复 LangGraph，并由 ActionOrchestrator 将新 AgentContent 重新交给同一 Embedded Presentation Pipeline。
- 复用 RunOrchestrator 的取消、超时、降级、关联 ID 和错误映射规则。
- 更新或替换当前 Surface，并原子更新对应 SurfaceContext。

## 架构限制

- Action Payload 是不可信输入。
- 前端不能构造任意业务工具调用。
- destructive 或 requiresApproval Action 必须显式确认。
- Runtime Host 只转发通过契约和上下文校验的业务意图。
- Action 恢复路径不得直接调用 UI Compiler Core、Model Adapter 或旧 UI Compiler Service。
- 展示编译失败时优先保留有效 Resume 业务结果，并执行安全 Markdown 降级。

## 验收

- 生成巡逻计划并渲染确认按钮。
- 点击确认后恢复正确 LangGraph 线程。
- 业务状态变为 confirmed，并通过 Embedded Presentation Pipeline 展示新 PresentationResult。
- Action 前后保持 threadId、runId、presentationRequestId 和 surfaceId 的可追踪关系。
- 展示阶段失败不会丢失已成功恢复的业务结果。
- 重复、过期、伪造和非法 Payload Action 均被稳定拒绝。
