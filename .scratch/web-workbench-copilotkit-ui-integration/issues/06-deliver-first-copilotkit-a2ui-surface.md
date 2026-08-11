# 06 - 打通首个 CopilotKit A2UI Surface

**要构建的能力：** SACS 可以使用 CopilotKit `render_a2ui` 在 Workbench Conversation 中创建并更新一个 Catalog 受控的 A2UI Surface。

**阻塞于：** 03 - 通过 Runtime Adapter 接通 SACS Conversation。

**状态：** ready-for-agent

## 验收条件

- [ ] 在 SACS Agent 路径的 CopilotKit Runtime 中启用 A2UI middleware。
- [ ] 在 Workbench CopilotKit Provider 上启用 A2UI Catalog 和 Theme。
- [ ] 通过 Runtime discovery 公布 A2UI 能力。
- [ ] 依赖 Provider 能力发现，不手工注册重复的 A2UI Activity Renderer。
- [ ] 每个 `surfaceId` 只处理一次 `createSurface`，避免重复创建。
- [ ] `updateComponents` 和 `updateDataModel` 可以无闪烁地更新现有 Surface。
- [ ] 输出和 Inspect 来源标记为 runtime-controlled A2UI。
- [ ] 该路径与 UI Compiler Core 和 compiler-trusted A2UI 保持独立。
- [ ] 使用完整 SACS 或合同 fixture 请求验证 A2UI Surface 创建和更新。

## `/goal` 提示词

```text
/goal

目标：在 Web Workbench 中通过 CopilotKit 打通第一条 runtime-controlled A2UI 纵向链路。

这是一个明确的 Goal。
仅在 Ticket 03 已合并到最新 origin/dev_1.0 后开始。
该 Goal 可以与 Ticket 04 并行，但必须使用独立分支和独立 worktree。
从最新 origin/dev_1.0 创建任务分支并使用 --no-track。

实现：
用户自然语言
-> SACS
-> CopilotKit render_a2ui
-> A2UI Activity
-> Workbench A2UI Provider
-> Catalog 受控 Surface

CopilotKit Runtime 必须启用 A2UI middleware。
Workbench Provider 必须配置 A2UI Catalog 和 Theme。
/info 必须正确公布 A2UI 能力。
使用 Provider 自动挂载的 A2UI Renderer，不手工重复注册 renderActivityMessages。
同一 surfaceId 只创建一次 Surface，后续使用 updateComponents 和 updateDataModel。
未知组件和非法 props 必须安全降级。

将该路径称为 runtime-controlled A2UI。
不得称为 compiler-trusted A2UI，不得输入 UI Compiler Core。

SACS A2UI 能力不可用时，使用符合 CopilotKit A2UI middleware 合同的 fixture。
至少验证一次创建 Surface 和一次更新 Surface。

本 Goal 不实现完整 Frontend Tool Catalog，不扩展 Presentation Pipeline。
验证相关 typecheck、单元测试、集成测试、E2E 和 build。
```
