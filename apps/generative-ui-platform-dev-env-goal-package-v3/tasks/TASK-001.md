# TASK-001：平台集成契约

## 目标

建立 Business Agent、Runtime Host、UI Compiler 与 Web 之间的公共契约。

## 工作项

- 定义 Business Agent Run Request / Result；
- 定义 Action Request / Result；
- 复用 AgentContent；
- 复用 PresentationRequest / PresentationResult；
- 定义 Runtime HTTP / WebSocket 消息；
- 定义统一错误；
- 增加运行时 Schema 校验；
- 删除重复消息类型。

## 限制

- Business Agent Contract 不得包含 UI Plan Candidate；
- Business Agent Contract 不得包含 A2UI；
- 不允许各应用各自定义同名消息结构。

## 验收

- 契约可独立构建；
- 非法消息稳定拒绝；
- Runtime Result 可携带 PresentationResult；
- 受影响范围 lint、typecheck、test、build 通过。
