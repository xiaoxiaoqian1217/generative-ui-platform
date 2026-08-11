# 01 - 确立 Web Workbench 两阶段 Generative UI 架构

**要构建的能力：** 将已经确认的架构变化写入正式规范，使当前 CopilotKit UI Integration Goal 可以合法实施，同时保留下一阶段 Presentation Pipeline Integration。

**阻塞于：** 无，可以立即开始。

**状态：** ready-for-agent

## 验收条件

- [ ] 新 ADR 定义长期能力名称 `Web Workbench Generative UI`。
- [ ] 当前阶段定义为 `Web Workbench CopilotKit UI Integration`。
- [ ] 下一阶段定义为 `Web Workbench Presentation Pipeline Integration`。
- [ ] 当前阶段允许 Catalog 授权的 Frontend Tool 和 runtime-controlled A2UI。
- [ ] `runtime-controlled A2UI` 与 `compiler-trusted A2UI` 在术语、来源、验证和 Inspect 中明确分离。
- [ ] 保留禁止任意 HTML、JavaScript、动态 Vue 代码、未知组件和未授权 Action 的约束。
- [ ] 同步 ADR 索引、平台 Requirements、平台 Architecture、Scope Decision、Workbench SRS、仓库说明和 Agent 规则。
- [ ] 不改写历史 ADR，通过明确的部分取代关系表达变化。
- [ ] `pnpm docs:check` 通过。

## `/goal` 提示词

```text
/goal

目标：确立 Web Workbench 两阶段 Generative UI 架构，并完成相关规范同步。

这是一个明确的 Goal。
开始修改前检查当前分支和工作树状态。
从最新 origin/dev_1.0 创建独立任务分支和 worktree。
任务分支必须使用 --no-track，不得直接在 dev_1.0 上修改。

长期产品能力名称为 Web Workbench Generative UI。
当前阶段为 Web Workbench CopilotKit UI Integration。
下一阶段为 Web Workbench Presentation Pipeline Integration。

当前阶段允许通过 single-agent-chat-server、AG-UI 和 CopilotKit 使用 useFrontendTool 与 runtime-controlled A2UI。
原 Final AgentContent -> Presentation Pipeline -> UI Compiler Core -> compiler-trusted A2UI 通道延后到下一阶段。

用户已经明确确认这一架构变化。
新增 ADR，并同步 ADR 索引、平台 Requirements、平台 Architecture、Scope Decision、Workbench SRS、README 和 Agent 规则。
不得直接改写历史 ADR。
必须明确部分取代关系、信任等级、保留规则、非目标和迁移影响。

本 Goal 只修改架构和规范，不实现业务代码。
不要修改 CHANGELOG.md 或自动生成文件。
长 Markdown 文件中的每个完整句子单独占一行。

运行 pnpm docs:check。
完成时先报告结果，再报告修改文件、验证和剩余风险。
```
