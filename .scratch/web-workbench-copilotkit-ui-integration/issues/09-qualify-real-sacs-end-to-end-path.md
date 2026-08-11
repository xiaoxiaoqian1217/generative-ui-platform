# 09 - 使用真实 SACS 完成发布级端到端验证

**要构建的能力：** 证明真实自然语言 Conversation 可以使用具备工具能力的 SACS 版本驱动 Frontend Tool UI 和 CopilotKit A2UI，并满足认证、取消、验证和失败处理要求。

**阻塞于：** 08 - 提供统一的 CopilotKit UI Inspect。

**外部门槛：** SACS commit 或版本能够接收 `RunAgentInput.tools`、输出标准 `TOOL_CALL_*`、消费 `TOOL_CALL_RESULT`、支持 continuation 并公布约定的 capability metadata。

**状态：** ready-for-agent

## 验收条件

- [ ] 锁定并记录用于验收的 SACS commit 或版本。
- [ ] 验证真实 SACS capability metadata 符合假设合同。
- [ ] 使用自然语言场景让 SACS 选择并执行注册的 Frontend Tool。
- [ ] 使用自然语言场景让 SACS 创建并更新 A2UI Surface。
- [ ] Tool Result 返回 SACS，并观察继续生成的 Agent 响应。
- [ ] 验证未知工具、非法参数、重复事件、取消、超时和连接失败。
- [ ] 检查浏览器网络流量，确认不存在服务端凭据。
- [ ] 运行受影响的 typecheck、单元测试、集成测试、E2E、build 和文档检查。
- [ ] 如实记录命令、结果、已知限制和剩余风险，不声称未运行的验证成功。

## `/goal` 提示词

```text
/goal

目标：使用具备 Frontend Tool Calling 能力的真实 single-agent-chat-server，完成 Web Workbench CopilotKit UI Integration 的发布级端到端验收。

这是一个明确的 Goal。
只有在 Ticket 08 已合并到最新 origin/dev_1.0，并且满足约定的 SACS 版本已经可用时才能开始。
如果 SACS 能力尚未交付，不要用 mock 宣称本 Goal 完成。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

锁定并记录经过验证的 SACS commit 或版本。

验证真实链路一：
用户自然语言
-> 真实 SACS
-> AG-UI TOOL_CALL_*
-> useFrontendTool
-> 受控 Vue 组件
-> TOOL_CALL_RESULT
-> SACS continuation

验证真实链路二：
用户自然语言
-> 真实 SACS
-> render_a2ui
-> CopilotKit A2UI middleware
-> runtime-controlled A2UI Surface
-> Surface update 或受控 Action

工具必须真实存在于 RunAgentInput.tools。
Tool Call 必须由真实 Agent 决定，不使用 runTool、测试按钮或 mock 触发。
验证未知工具、非法参数、重复事件、取消、超时和连接失败。
Tool Call 至多执行一次，Tool Result 返回正确 Conversation。
A2UI 只能使用 Catalog 授权组件。
浏览器网络请求、日志和 Inspect 不得包含 service key 或 JWT 签名密钥。
在真实浏览器中进行细致视觉检查。

不实现下一阶段 Presentation Pipeline Integration。

运行 pnpm validate、pnpm test、pnpm build、pnpm docs:check、Workbench Playwright E2E 和真实 SACS integration E2E。
不得声称未实际执行的测试成功。
同步最终开发环境说明、验证步骤、已知限制和下一阶段边界。
```
