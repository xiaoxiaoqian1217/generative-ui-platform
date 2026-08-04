# TASK-003：受控 CopilotKit 会话视图

## 目标

使用受控 CopilotChatView 替换 Playground 的自定义消息列表和输入基础设施。

## 交付

- 由 Workbench 显式传入 messages、isRunning 和 inputValue。
- 将提交、停止和输入变化事件连接到现有 Headless Client 与 Conversation Store。
- 使用 CopilotKit 默认滚动、运行光标和输入控制。
- 保留快捷场景、案例重放和页面级运行控制。
- 为窄屏和桌面布局提供可访问样式。

## 验收

- 高级 CopilotChat 不拥有第二套 Agent、线程或消息状态。
- 用户提交后立即看到用户消息和运行状态。
- 停止操作取消当前 Run 并恢复输入能力。
- Playground 之外的 Workbench 路由不受 CopilotKit 样式影响。

## 依赖

TASK-002。
