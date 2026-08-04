# GOAL-WEB-COPILOTKIT-UI-001：CopilotKit 会话 UI 与会话内 A2UI

## 1. 目标

将 Web Workbench 的自定义主会话交互迁移到受控的 CopilotKit Vue 会话 UI。
Workbench 必须继续通过 CopilotKit Headless 连接 Agent Runtime Host，并在对应会话轮次中渲染已验证的 Markdown 或受控 A2UI。

本 Goal 只改变 Workbench 的会话展示和前端会话状态模型。
它不改变 Business Agent、Runtime Host、Presentation Pipeline、UI Compiler Core 或 Runtime Action Contract 的职责。

## 2. 基线与依赖

本 Goal 以 `GOAL-WEB-WORKBENCH-001` 完成后的最新 `origin/main` 为基线。
实施前必须确认 ADR-0020 和 ADR-0023 已位于远端 `main`。
本 Goal 必须使用独立分支和 worktree，不得与持久调试会话 Goal 共享分支或工作目录。

## 3. 架构决策

- Workbench 使用 `@copilotkit/vue` 的受控 `CopilotChatView` 和会话原子组件。
- Workbench 是前端会话状态、消息列表、运行状态和提交处理器的唯一所有者。
- 现有 CopilotKit Headless Client 继续作为 Run 传输入口。
- Runtime Host 不为会话 UI 生成额外 Assistant Message Event，也不改写 Business Agent 内容。
- Markdown PresentationResult 映射为助手消息。
- A2UI PresentationResult 通过消息视图插槽和现有 A2UI Renderer 显示在对应助手区域。
- A2UI 不映射为 CopilotKit Tool，不绕过 Component Catalog、UI Compiler Core 或 Runtime Action Contract。
- 历史 A2UI 保留可见，但只有最新 Active Business Surface 可以产生 Action。

## 4. 范围

- 引入并固定兼容的 CopilotKit Vue UI 依赖。
- 建立显式的 Conversation Turn 前端状态模型。
- 使用受控 CopilotChatView 提供消息列表、输入、运行光标、停止控制和滚动行为。
- 保留快捷场景、案例重放、运行诊断和确认型 Action。
- 在会话轮次内渲染安全 Markdown、A2UI、失败和取消状态。
- Action Resume 原位更新所属轮次的 PresentationResult。
- 同一会话同一时间只允许一个活动 Run 或 Action。
- 提供确定性单元、组件和浏览器 E2E 覆盖。

## 5. 非目标

- Runtime Host Thread Contract。
- SQLite 会话存储或 Business Agent 持久 Checkpoint Store。
- 会话列表、切换、重命名、归档、删除和跨刷新恢复。
- CopilotKit 托管 `useThreads` 或 Enterprise Intelligence Platform。
- Runtime Host 新增标准助手文本事件。
- CopilotKit Tool Call 到 A2UI Component Action 的映射。
- 内容级逐字流式输出。
- A2UI 协议、Component Catalog 或 UI Compiler Core 变更。

## 6. 会话状态模型

每个 Conversation Turn 至少关联用户消息、Run 状态、`threadId`、`runId` 和可选 PresentationResult。
Markdown 结果形成助手消息。
A2UI 结果形成 Inline Business Surface，不生成额外助手文本或状态占位。
失败和取消形成 Workbench Turn Failure，不冒充 Business Agent 回复。
新 PresentationResult 到达后，旧 Business Surface 转为只读。

本 Goal 的状态只保存在当前页面内存中。
持久历史由 `GOAL-DEBUG-CONVERSATIONS-001` 单独实现。

## 7. 验证要求

- `pnpm --filter @generative-ui/web-workbench typecheck`。
- `pnpm test:web-workbench`。
- `pnpm test:e2e:web-workbench`。
- 受影响的平台 E2E。
- `pnpm docs:check`。

自动化必须覆盖 Markdown、A2UI、Action Resume、停止、失败、重试、历史 Surface 只读和单活动操作。
测试不得访问真实模型或 CopilotKit 托管线程服务。

## 8. 任务与依赖

任务包位于 [`./GOAL-WEB-COPILOTKIT-UI-001/`](./GOAL-WEB-COPILOTKIT-UI-001/README.md)。

```text
TASK-001 CopilotKit Vue 兼容基线
  → TASK-002 Conversation Turn 状态模型
      → TASK-003 受控 CopilotKit 会话视图
          → TASK-004 会话内 Markdown 与 A2UI
              → TASK-005 Run、Action 与错误交互
                  → TASK-006 自动化验证与文档收口
```

## 9. 完成条件

- Playground 的主会话区域使用受控 CopilotKit Vue 会话组件。
- Workbench 不再自行实现通用消息列表、输入和滚动基础设施。
- Markdown 与 A2UI 严格按照已验证 PresentationResult 显示在对应会话轮次。
- A2UI Action 继续通过现有 Runtime Action Contract 回传。
- Runtime Host 和 Business Agent 不因会话 UI 产生新的展示职责。
- 现有 Inspect、Cases、Catalog、Scenarios 和 Settings 能力不回归。
- 自动化和文档验证全部通过。
