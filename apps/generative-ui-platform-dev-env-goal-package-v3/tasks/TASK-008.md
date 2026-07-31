# TASK-008：Action 回传闭环

## 目标

完成浏览器用户操作到 Business Agent 状态恢复的闭环。

## 流程

```text
A2UI Action
→ Web
→ Runtime Host
→ Action 校验
→ Business Agent Adapter
→ LangGraph Resume
→ 新 AgentContent
→ UI Compiler
→ 新 PresentationResult
→ Web 更新
```

## 工作项

- Web 构造 Action Event；
- Runtime Host 校验 surfaceId；
- 校验 runId；
- 校验 actionId；
- 校验 Catalog Action；
- 调用 Business Agent Adapter resumeAction；
- 恢复 LangGraph；
- 重新调用 UI Compiler；
- 更新 Surface。

## 限制

- Action Payload 不可信；
- 前端不能构造任意业务工具调用；
- destructive / requiresApproval 必须显式确认。

## 验收

- 生成巡逻计划；
- 渲染确认按钮；
- 点击确认；
- LangGraph 恢复；
- 业务状态变为 confirmed；
- 页面展示新状态。
