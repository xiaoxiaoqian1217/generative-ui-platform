# TASK-005：CopilotKit 会话 UI 自动化验收与文档收口

## 目标

以确定性自动化和文档收口交付 CopilotKit 会话 UI 改造，并形成后续持久化调试会话的已合并基线。

## 交付

- 覆盖 Conversation Store 状态转换的单元测试。
- 覆盖受控 CopilotChatView、Markdown、A2UI 和错误状态的组件测试。
- 覆盖提交、停止、重试、Action Resume 和历史 Surface 只读的浏览器 E2E。
- 更新 Workbench README、开发环境、架构和演示说明。
- 记录兼容依赖的升级影响与回退条件。

## 验收

- Workbench 类型检查、单元测试、E2E 和构建通过。
- 受影响的平台 E2E 通过。
- `pnpm docs:check` 通过。
- 自动化不访问真实模型或 CopilotKit 托管服务。

## 依赖

TASK-004。
