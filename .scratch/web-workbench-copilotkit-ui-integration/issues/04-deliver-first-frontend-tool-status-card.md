# 04 - 用 show_status_card 打通首条 Frontend Tool 链路

**要构建的能力：** 用户通过自然语言请求状态摘要，SACS 通过 AG-UI 选择 `show_status_card`，Workbench 渲染受控 Vue 组件，并将 Tool Result 返回同一 Agent Conversation。

**阻塞于：** 03 - 通过 Runtime Adapter 接通 SACS Conversation。

**状态：** ready-for-agent

## 验收条件

- [ ] 使用 `useFrontendTool` 和运行时参数 Schema 注册 `show_status_card`。
- [ ] 注册工具进入实际发送给 SACS 的 `RunAgentInput.tools`。
- [ ] 工具只响应标准 AG-UI `TOOL_CALL_*` 事件执行。
- [ ] 不使用程序化 `runTool` 或测试捷径冒充 Agent 工具选择。
- [ ] 使用 Workbench 视觉组件展示 `inProgress`、`executing` 和 `complete`。
- [ ] 将有界 Tool Result 返回 SACS，并允许 Agent 继续 Conversation。
- [ ] 即使收到重复事件，一个 Tool Call 也至多执行一次。
- [ ] 通过 `AbortSignal` 将取消传播到未完成 handler。
- [ ] 单元测试和 E2E 覆盖自然语言到 Tool Result 的完整路径。

## `/goal` 提示词

```text
/goal

目标：使用 show_status_card 打通 Web Workbench 第一条真实 Frontend Tool UI 纵向链路。

这是一个明确的 Goal。
仅在 Ticket 03 已合并到最新 origin/dev_1.0 后开始。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

默认假设 SACS 后续能够接收 RunAgentInput.tools、输出标准 TOOL_CALL_*、接收 TOOL_CALL_RESULT 并继续 Agent Run。
本 Goal 不修改 single-agent-chat-server。

实现：
用户自然语言
-> SACS 选择 show_status_card
-> AG-UI TOOL_CALL_START / ARGS / END
-> useFrontendTool
-> 受控 Vue 状态卡片
-> TOOL_CALL_RESULT
-> SACS continuation

工具必须包含稳定名称、清晰描述、运行时参数 Schema、Vue Renderer、无业务副作用 handler、明确 followUp 和 AbortSignal 支持。
UI 必须展示 inProgress、executing 和 complete。
流式参数必须按 Partial 输入安全处理。
同一 Tool Call 不得重复执行。
取消后的旧结果不得覆盖新 Conversation。

不允许使用 copilotkit.runTool、测试按钮或直接调用 handler 冒充 Agent Tool Call。
SACS 工具版本不可用时，使用严格符合 AG-UI 合同的 fixture 生成 TOOL_CALL_*。

本 Goal 只实现一个 tracer-bullet 工具，不扩展完整 Catalog，不启用 A2UI。
验证单元测试、AG-UI contract test、Workbench integration test 和端到端 Tool Call。
```
