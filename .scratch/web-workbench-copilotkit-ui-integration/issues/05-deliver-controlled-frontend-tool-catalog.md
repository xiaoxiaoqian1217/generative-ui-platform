# 05 - 扩展受控 Frontend Tool Catalog

**要构建的能力：** 将第一个 tracer 工具扩展为小型、一致且可维护的受控展示工具 Catalog，使 SACS 可以选择工具，但不能获得任意组件或业务 Action 权威。

**阻塞于：** 04 - 用 show_status_card 打通首条 Frontend Tool 链路。

**状态：** ready-for-agent

## 验收条件

- [ ] 工具名称、描述、运行时 Schema、Vue Renderer、可用性和 follow-up 策略只有一个注册来源。
- [ ] 至少支持 `show_status_card`、`show_metric` 和 `show_data_table` 三个只读展示工具。
- [ ] 工具名称在配置的 Agent 范围内唯一。
- [ ] 所有 Renderer 复用 Workbench Theme 和既有组件 primitives。
- [ ] 未知工具使用稳定错误拒绝，且不挂载非受控组件。
- [ ] 非法参数在进入 Vue 组件或 handler 前被拒绝。
- [ ] 所有异步 handler 都传递 `AbortSignal`。
- [ ] 明确配置 follow-up，避免展示工具造成意外 Agent 循环。
- [ ] Catalog 不执行业务副作用，也不获得 Runtime Action 权威。
- [ ] 每个 Catalog 工具都有完整 Agent Tool Call 测试。

## `/goal` 提示词

```text
/goal

目标：将 show_status_card tracer 扩展为可维护的 Web Workbench Frontend Tool Catalog。

这是一个明确的 Goal。
仅在 Ticket 04 已合并到最新 origin/dev_1.0 后开始。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

建立最小受控展示工具 Catalog：
- show_status_card
- show_metric
- show_data_table

每个工具集中定义稳定名称、描述、运行时 Schema、Vue Renderer、handler、followUp、agentId 范围和生命周期 UI。
未知工具必须拒绝。
非法参数不得进入组件或 handler。
工具名称在同一 agentId 下必须唯一。
异步 handler 必须传递 AbortSignal。
展示工具不得执行后端业务副作用。
Agent 不得指定 Vue 组件路径、HTML 或 JavaScript。
组件必须复用 Workbench Theme 和现有 UI primitives。

每个工具都必须通过真实 AG-UI Tool Call 事件或合同 fixture 完成纵向验证。
不允许只直接调用组件或 handler。

本 Goal 不实现 A2UI，不新增业务 Action 权威。
验证相关 typecheck、单元测试、集成测试、E2E 和 build。
```
