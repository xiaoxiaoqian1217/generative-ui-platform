# 03 - 通过 Runtime Adapter 接通 SACS Conversation

**要构建的能力：** 用户可以在 Web Workbench 输入自然语言，通过服务端 Runtime Adapter 调用 single-agent-chat-server，并在同一 Conversation 中观察 Text、State、Activity 和 Interrupt。

**阻塞于：** 02 - 建立单一 CopilotKit 会话执行基线。

**状态：** ready-for-agent

## 验收条件

- [ ] SACS 作为远程 AG-UI Agent 注册到现有最小 CopilotKit Runtime 接入路径。
- [ ] SACS 服务凭据和经过认证的用户身份只在服务端添加。
- [ ] 浏览器请求、日志、错误和 Inspect 不暴露服务凭据或签名密钥。
- [ ] Workbench Conversation 显示 SACS Text 和公开 Activity。
- [ ] 保留当前参考路径需要的 State 和 Interrupt。
- [ ] 取消和超时可以传播到活动的远程 Agent Run。
- [ ] SACS 不可用或返回非法事件流时提供稳定错误代码和可理解 UI 状态。
- [ ] 使用合同 fixture 和可用的 SACS 文本 Conversation 接口验证链路。

## `/goal` 提示词

```text
/goal

目标：通过最小 Runtime Adapter 将 single-agent-chat-server 接入 Web Workbench 的 CopilotKit Conversation。

这是一个明确的 Goal。
仅在 Ticket 02 已合并到最新 origin/dev_1.0 后开始。
从最新 origin/dev_1.0 创建独立任务分支和 worktree，并使用 --no-track。

实现完整纵向链路：
用户在 Workbench 输入自然语言
-> CopilotKit Provider
-> CopilotKit Runtime
-> 服务端 SACS Adapter
-> SACS AG-UI
-> Text、State、Activity 或 Interrupt
-> Workbench Conversation UI

SACS service key 和用户身份签名只能由服务端持有。
浏览器请求、错误信息、日志和 Inspect 不得泄露凭据。
Adapter 不得总结、重写或重新决定 Agent 输出。
Adapter 不得复制 SACS 私有 State 或 Checkpoint。

支持可配置 endpoint、agentId、超时和服务端认证。
在边界验证外部输入。
为连接失败、认证失败、协议错误和超时提供稳定错误代码。

可以使用符合合同的 AG-UI fixture 验证 Text、State、Activity 和 Interrupt。
如果真实 SACS 文本接口可用，补充真实连接验证。

本 Goal 不实现 useFrontendTool，不启用 A2UI，不建设 Runtime Repository、长期 History、Recovery 或完整 Diagnostics。
运行相关 typecheck、单元测试、集成测试、build 和 E2E。
```
