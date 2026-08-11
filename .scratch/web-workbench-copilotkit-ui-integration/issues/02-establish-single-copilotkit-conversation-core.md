# 02 - 建立单一 CopilotKit 会话执行基线

**要构建的能力：** 保持现有 Workbench Conversation 体验，同时让 Agent 发现、运行、取消和 Frontend Tool 注册统一由 Provider 所属的 CopilotKit Core 管理。

**阻塞于：** 01 - 确立 Web Workbench 两阶段 Generative UI 架构。

**状态：** ready-for-agent

## 验收条件

- [ ] 验证并记录 CopilotKit Vue、Core、Runtime 和 AG-UI 的兼容版本组合。
- [ ] 已安装 API 无法证明兼容时统一相关包版本。
- [ ] Provider 所属 CopilotKit Core 成为 Workbench Conversation 运行生命周期的唯一权威。
- [ ] 移除或退役独立 Headless Core，同时保持当前支持的 Conversation 流程。
- [ ] Frontend Tool 已注册时不再提交硬编码的空 tools 集合。
- [ ] 保持发送、响应、取消、超时和连接状态行为。
- [ ] 增加回归测试，证明 prefactor 后 Conversation 仍然可用。
- [ ] 受影响范围的 typecheck、单元测试、build 和 Conversation E2E 通过。

## `/goal` 提示词

```text
/goal

目标：为 Web Workbench 建立单一 CopilotKit 会话执行基线，为后续 useFrontendTool 和 A2UI 接入消除双 Core 障碍。

这是一个明确的 Goal。
仅在 Ticket 01 已合并到最新 origin/dev_1.0 后开始。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

开始前读取最新 ADR、平台 Architecture、Workbench SRS 和开发环境规范。
检查当前 CopilotKitProvider 与独立 CopilotKitCore 并存的运行路径。

验证 @copilotkit/vue、@copilotkit/core、@copilotkit/runtime 和 @ag-ui/core 的兼容组合。
如果版本不兼容，以长期维护性为标准统一版本。
将 Conversation 生命周期统一到 Provider 所属的 CopilotKit Core 和 Agent。
移除或隔离独立 Headless Core，不再发送硬编码 tools: []。
保持现有发送、取消、超时、连接状态和 Presentation compatibility 行为。
为单一 Core 和工具注册传播建立回归测试。

本 Goal 不接入 SACS，不注册业务 Frontend Tool，不启用 A2UI。
不得扩展长期 History、Runtime Repository、Recovery 或 Diagnostics Platform。

运行受影响范围的 typecheck、单元测试、build 和 Conversation E2E。
完成时报告实际运行的命令、结果和剩余风险。
```
