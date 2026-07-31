# TASK-008：Action 回传闭环

## 目标

完成浏览器用户操作到 Business Agent 状态恢复的受控闭环。

## 流程

```text
A2UI Action
→ Web Action Event
→ Runtime Host
→ Surface / Action 校验
→ Business Agent Adapter
→ LangGraph Resume
→ 新 AgentContent
→ UI Compiler
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
- 恢复 LangGraph 并重新调用 UI Compiler。
- 更新或替换当前 Surface。

## 架构限制

- Action Payload 是不可信输入。
- 前端不能构造任意业务工具调用。
- destructive 或 requiresApproval Action 必须显式确认。
- Runtime Host 只转发通过契约和上下文校验的业务意图。

## 验收

- 生成巡逻计划并渲染确认按钮。
- 点击确认后恢复正确 LangGraph 线程。
- 业务状态变为 confirmed，并展示新 PresentationResult。
- 重复、过期、伪造和非法 Payload Action 均被稳定拒绝。
