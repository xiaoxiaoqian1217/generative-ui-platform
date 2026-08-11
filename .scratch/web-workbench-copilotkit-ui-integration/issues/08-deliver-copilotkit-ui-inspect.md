# 08 - 提供统一的 CopilotKit UI Inspect

**要构建的能力：** 开发者可以从一次 Workbench Conversation 追踪公开 Agent 事件、Frontend Tool 执行、Tool Result continuation 和 runtime-controlled A2UI，同时不泄露敏感信息，也不要求手工输入协议数据。

**阻塞于：** 05 - 扩展受控 Frontend Tool Catalog；07 - 统一 Frontend Tool 与 A2UI 的安全和交互边界。

**状态：** ready-for-agent

## 验收条件

- [ ] 显示选定 Conversation Run 的相关原始 AG-UI 事件。
- [ ] 显示注册的 Frontend Tools 及其公开 Schema。
- [ ] 显示 Tool Call 参数、生命周期、结果、取消和错误。
- [ ] 显示 A2UI operations、Catalog 标识、Theme 标识和 `surfaceId`。
- [ ] 清楚区分 Frontend Tool UI 与 runtime-controlled A2UI。
- [ ] 对大型 payload 应用长度限制和安全格式化。
- [ ] 脱敏凭据、认证头、签名材料和其他敏感 Runtime 数据。
- [ ] 保持自然语言 Conversation 为主输入，不提供手工 AgentContent、Tool Call 或 A2UI JSON 输入。
- [ ] E2E 证明渲染 UI 可以追溯到对应 Agent 事件和受控输入。

## `/goal` 提示词

```text
/goal

目标：为 Web Workbench 提供统一的 CopilotKit UI Inspect，使开发者能够追踪 Conversation、Frontend Tool 和 A2UI Surface。

这是一个明确的 Goal。
仅在 Ticket 05 和 Ticket 07 都已合并到最新 origin/dev_1.0 后开始。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

从真实或合同化 Conversation 提供只读追踪：Agent Text、State、Activity、原始 AG-UI events、Frontend Tools、工具 Schema、Tool Call 生命周期、A2UI operations、Catalog、Theme 和 surfaceId。

Conversation 必须保持主输入。
用户不需要手工输入 AgentContent、Tool Call 或 A2UI JSON。
UI 必须区分 Frontend Tool UI 与 runtime-controlled A2UI。
runtime-controlled A2UI 不得显示为 compiler-trusted A2UI。
大型 payload 必须截断或按需展开。
service key、JWT、Authorization header 和敏感配置不得显示或记录。
Inspect 失败不得影响 Conversation Truth 或 UI 渲染。

优先复用现有 Workbench Inspect、Raw Viewer 和 Conversation UI，不建立第二套调试应用。
进行真实浏览器视觉检查，修复明显的布局、层级和可读性问题。

验证相关 typecheck、单元测试、E2E、build 和 UI 检查。
```
