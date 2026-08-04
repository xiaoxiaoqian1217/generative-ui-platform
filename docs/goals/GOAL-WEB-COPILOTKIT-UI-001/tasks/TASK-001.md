# TASK-001：CopilotKit Vue 受控会话基础

## 目标

让 Workbench 在不改变 Runtime 边界的前提下，提供可控且可验证的 CopilotKit Vue 会话基础。

## 交付

- 评估当前 `@copilotkit/core`、Runtime Host `@copilotkit/runtime` 与 `@copilotkit/vue` 的版本兼容性。
- 将所有直接相关 CopilotKit 包固定为经过验证的兼容版本。
- 引入 CopilotKit Vue 样式，并确保其不会污染 Workbench 其他路由。
- 建立最小 Provider 与受控 CopilotChatView。
- 通过现有 CopilotKit Headless Client 完成最小提交与响应的端到端验证。
- 记录升级影响和回退条件。

## 验收

- Workbench 类型检查和构建通过。
- 最小会话视图在 Vue 3 中渲染并接受由 Workbench 控制的消息与输入事件。
- Workbench 仍只连接 Agent Runtime Host。
- Runtime Host 现有 Headless E2E 不回归。
- 未引入 CopilotKit 托管线程或外部 License 依赖。

## 依赖

无。
