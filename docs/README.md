# 文档导航

本目录按平台规范、阶段 Goal、子系统基线和架构决策组织。

旧文档继续保留，不通过静默改写掩盖其形成时的阶段背景。

## 规范优先级

发生范围或架构冲突时，按以下顺序判断：

1. 已接受且仍有效的 ADR。
2. `docs/platform/REQUIREMENTS.md`。
3. `docs/platform/ARCHITECTURE.md` 和相关平台架构文档。
4. 当前已批准的 Goal 和可执行任务包。
5. 对应子系统的需求、架构和设计基线。
6. Roadmap 和说明性文档。

任何后续文档或实现如果与当前有效架构发生实质冲突，必须先明确标记冲突并由用户/架构决策者确认。
不得通过代码、测试或文档静默覆盖当前架构。
详细规则以根目录 `AGENTS.md` 为准。

ADR-0024 已确认的六项 Runtime Truth 冲突及迁移规则见 [Runtime Truth Model 迁移与冲突处置](./platform/RUNTIME_TRUTH_MIGRATION.md)。
在旧 Workbench SRS、历史 Goal、Runtime Contract 或实现完成物理迁移前，与 ADR-0024 冲突的旧语义只作为兼容或历史背景。

## 平台级规范

- [平台文档索引](./platform/README.md)
- [平台级需求](./platform/REQUIREMENTS.md)
- [平台级架构](./platform/ARCHITECTURE.md)
- [平台架构简图](./platform/SYSTEM_ARCHITECTURE.md)
- [Runtime Truth Model 迁移与冲突处置](./platform/RUNTIME_TRUTH_MIGRATION.md)
- [全链路开发验证环境](./platform/DEVELOPMENT_ENVIRONMENT.md)
- [平台范围调整摘要](./platform/SCOPE_DECISION.md)

平台级文档描述整个 Generative UI Platform 的当前边界、职责和跨子系统关系。
当前 Runtime 状态所有权、安全 Command Admission 和 Diagnostics 解耦以 ADR-0024 为准。

## 当前阶段 Goal

- [GOAL-DEV-ENV-001](./goals/GOAL-DEV-ENV-001.md)（已完成，构成当前基线）
- [GOAL-WEB-WORKBENCH-001](./goals/GOAL-WEB-WORKBENCH-001.md)
- [GOAL-WEB-COPILOTKIT-UI-001](./goals/GOAL-WEB-COPILOTKIT-UI-001.md)
- [GOAL-DEBUG-CONVERSATIONS-001](./goals/GOAL-DEBUG-CONVERSATIONS-001.md)
- [GOAL-DEV-ENV-001 子任务包](./goals/GOAL-DEV-ENV-001/README.md)

Goal 定义阶段性交付范围和验收标准，不是独立产品定义。
各 Goal 之间的依赖顺序见各自文档的基线与前置依赖章节。
如果 Goal 与当前有效 ADR 或平台架构冲突，必须先进入架构冲突确认流程，而不是直接以 Goal 覆盖平台规范。

## UI Compiler 子系统

- [Compiler 子系统文档索引](./compiler/README.md)
- [Compiler MVP 需求](./REQUIREMENTS.md)
- [Compiler MVP 架构](./ARCHITECTURE.md)
- [Compiler 系统设计](./Generative_UI_Compiler_Design.md)
- [数据契约](./CONTRACTS.md)

这些旧文档继续作为 UI Compiler 子系统的历史需求和设计基线。
其中“当前产品”和“当前 MVP”等表述，应理解为文档形成时的 Compiler MVP 阶段。

## Generative UI Workbench

- [Workbench 文档索引](./workbench/README.md)
- [Workbench 需求规格](./WEB_WORKBENCH_SRS.md)

Workbench 是 Frontend Runtime 参考实现和平台开发验证环境，不是独立企业业务产品。
Workbench SRS 中与 ADR-0024 冲突的 Runtime Truth、Diagnostic Recovery 和 Run-centric 条款，以 ADR-0024 与 Runtime Truth 迁移说明为准。

## 架构决策

- [ADR 索引](./adr/README.md)
- [ADR-0018：扩展仓库范围到平台验证环境](./adr/0018-expand-repository-scope-to-platform-validation-environment.md)
- [ADR-0019：Presentation Pipeline 嵌入 Runtime Host](./adr/0019-embed-presentation-pipeline-in-agent-runtime-host.md)
- [ADR-0023：受控 CopilotKit 会话 UI 与平台调试历史](./adr/0023-adopt-controlled-copilotkit-conversation-ui-and-platform-thread-history.md)
- [ADR-0024：Runtime Truth Model 与安全 Command Admission](./adr/0024-adopt-runtime-truth-model-and-safe-command-admission.md)

## 旧文档保留原则

- 不因平台范围变化删除旧需求、架构或设计文档。
- 使用平台级文档声明当前规范。
- 使用 ADR 记录重要范围变化和架构取舍。
- 子系统实现仍遵守未被新平台规范明确替代的原有约束。
- 当旧文档与新 ADR 冲突时，保留历史文档并显式标记其被取代范围，不通过静默改写伪造历史一致性。
