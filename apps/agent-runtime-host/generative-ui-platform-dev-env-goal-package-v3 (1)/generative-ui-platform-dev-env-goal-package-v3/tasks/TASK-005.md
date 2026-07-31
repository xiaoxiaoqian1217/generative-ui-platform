# TASK-005：Runtime Host 平台编排

## 目标

把 Business Agent 和 UI Compiler 串成完整后端链路。

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

- 实现 RunOrchestrator；
- 实现 ActionOrchestrator；
- 实现 UICompilerClient；
- 实现 SurfaceContextStore；
- 实现 DependencyHealthService；
- 提供 `/api/runs`；
- 提供 `/api/actions`；
- 提供 `/health/dependencies`；
- 提供 `/ws/runs`。

## 限制

- HTTP 和 WebSocket 共用应用层；
- Runtime Host 不生成 A2UI；
- Runtime Host 不直接调用模型；
- Transport 层不放业务逻辑。

## 验收

- AgentContent 正确包装为 PresentationRequest；
- PresentationResult 正确返回 Web；
- Compiler 故障可安全降级；
- requestId、threadId、runId 贯穿链路。
