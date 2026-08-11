# 07 - 统一 Frontend Tool 与 A2UI 的安全和交互边界

**要构建的能力：** Frontend Tool UI 和 runtime-controlled A2UI 共享明确的 Catalog、Theme、验证和交互安全规则，同时保持不同的协议与信任来源。

**阻塞于：** 05 - 扩展受控 Frontend Tool Catalog；06 - 打通首个 CopilotKit A2UI Surface。

**状态：** ready-for-agent

## 验收条件

- [ ] A2UI 只能引用活动 Catalog 中存在的组件。
- [ ] 未知组件、非法 props、畸形 operations 和非法 data bindings 被拒绝或安全降级。
- [ ] A2UI 交互仅限明确注册的本地行为或新的 Agent 输入。
- [ ] 本 Goal 不引入直接且未授权的业务副作用。
- [ ] 成功、失败、取消和组件卸载后都清理临时 A2UI Action 上下文。
- [ ] 过期 Surface 和旧执行上下文不能作用于新的 Conversation Run。
- [ ] Frontend Tool 执行错误与 A2UI 渲染错误可以区分。
- [ ] 测试覆盖非法组件、非法 props、重复 Surface、取消、过期交互和 Action 清理。

## `/goal` 提示词

```text
/goal

目标：统一 Web Workbench Frontend Tool UI 与 runtime-controlled A2UI 的安全、Theme 和交互边界。

这是一个明确的 Goal。
仅在 Ticket 05 和 Ticket 06 都已合并到最新 origin/dev_1.0 后开始。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

Frontend Tool 与 A2UI 可以复用视觉组件和 Theme，但必须保持不同协议来源和信任标签。
Frontend Tool 只能执行已注册 handler。
A2UI 只能渲染 Catalog 中已注册组件。
未知组件、非法 props、无效 operations 和非法 bindings 必须安全降级。
A2UI Action 只能触发明确授权的本地交互或新的 Agent 输入。
当前 Goal 不授予直接业务副作用执行能力。
Action bridge 必须在成功、失败、取消和卸载后清理临时 a2uiAction。
历史 Surface 或旧 Tool Call 不得作用于新的 Conversation。
Frontend Tool 错误和 A2UI 错误必须可以区分。

不要为了 Action 增加 Runtime Repository、Command Admission 产品化、Recovery 或长期状态管理。
如果触及既有 Runtime Action 路径，保持现有幂等、revision 和 authority 安全规则。

测试未知工具、非法工具参数、未知 A2UI 组件、非法 A2UI props、重复 createSurface、Action 清理、取消和迟到结果。
验证相关 typecheck、单元测试、集成测试、E2E 和 build。
```
